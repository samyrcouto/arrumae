import { desc, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db/client";
import { mfaRecoveryCodes, outboundMessages, proProfiles, sessions, users } from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";
import { totpCode, totpStep } from "@/server/security/totp";
import { authenticate, createSession, exportAccountData, validateSessionToken } from "@/server/services/accounts";
import { getProForAdmin } from "@/server/services/admin";
import { reencryptSensitiveFields } from "@/server/services/encryption";
import {
  completeMfaChallenge,
  confirmTotpSetup,
  createMfaChallenge,
  disableTotp,
  getMfaStatus,
  resetMfaByEmail,
  startTotpSetup,
} from "@/server/services/mfa";
import { isResetTokenValid, requestPasswordReset, resetPassword } from "@/server/services/password-reset";
import { getMyProProfile, updateProProfile } from "@/server/services/pros";
import { makeAdmin, makeClient, makePro, resetDb, seedBase } from "./helpers";

let base: Awaited<ReturnType<typeof seedBase>>;
beforeEach(async () => {
  await resetDb();
  base = await seedBase();
});

const err = (p: Promise<unknown>) => p.then(() => null, (e: unknown) => e as DomainError);
const emailOf = async (id: string) => (await db.select({ email: users.email }).from(users).where(eq(users.id, id)))[0].email;
const profile = (cpf: string, cnpj = "") => ({
  displayName: "Ana Eletricista",
  bio: "Eletricista residencial com experiência em reparos e instalações.",
  yearsExperience: 8,
  cpf,
  cnpj,
  acceptsUrgent: false,
  categoryIds: [base.cat.id],
  regionIds: [base.region.id],
});

describe("CPF/CNPJ cifrados", () => {
  it("no banco só existe o valor cifrado; o profissional e o admin leem o original", async () => {
    const pro = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    await updateProProfile(pro, profile("529.982.247-25", "12.345.678/0001-95"));
    const [row] = await db.select().from(proProfiles).where(eq(proProfiles.userId, pro.id));
    expect(row.cpf).toMatch(/^enc:v1:/);
    expect(row.cnpj).toMatch(/^enc:v1:/);
    expect(JSON.stringify(row)).not.toContain("52998224725");
    expect(JSON.stringify(row)).not.toContain("12345678000195");
    expect(row.cpfHash).toMatch(/^[0-9a-f]{64}$/);

    const mine = await getMyProProfile(pro);
    expect(mine.profile.cpf).toBe("52998224725");
    expect(mine.profile.cnpj).toBe("12345678000195");
    expect("cpfHash" in mine.profile).toBe(false);

    // Outro cadastro com o mesmo CPF aparece para o admin (sinal de conta duplicada).
    const other = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    await updateProProfile(other, profile("529.982.247-25"));
    const admin = await makeAdmin();
    const view = await getProForAdmin(admin, other.id);
    expect(view.profile.cpf).toBe("52998224725");
    expect(view.sameCpf.map((p) => p.id)).toEqual([pro.id]);
    expect("totpSecret" in view.user).toBe(false);

    const exported = await exportAccountData(pro);
    expect(exported.proProfile?.cpf).toBe("52998224725");
    expect(JSON.stringify(exported)).not.toContain("totpSecret");
  });

  it("valor adulterado no banco não é lido", async () => {
    const pro = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    await updateProProfile(pro, profile("529.982.247-25"));
    const [row] = await db.select().from(proProfiles).where(eq(proProfiles.userId, pro.id));
    const tampered = row.cpf!.slice(0, -3) + (row.cpf!.at(-3) === "A" ? "B" : "A") + row.cpf!.slice(-2);
    await db.update(proProfiles).set({ cpf: tampered }).where(eq(proProfiles.userId, pro.id));
    await expect(getMyProProfile(pro)).rejects.toThrow();
  });

  it("CPF antigo em texto puro é cifrado pela rotina do db:migrate (uma vez)", async () => {
    const pro = await makePro({ categoryIds: [base.cat.id], regionIds: [base.region.id] });
    await db.update(proProfiles).set({ cpf: "52998224725", cnpj: "12345678000195" }).where(eq(proProfiles.userId, pro.id));
    expect(await reencryptSensitiveFields()).toEqual({ profiles: 1, secrets: 0 });
    const [row] = await db.select().from(proProfiles).where(eq(proProfiles.userId, pro.id));
    expect(row.cpf).toMatch(/^enc:v1:/);
    expect(row.cpfHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await getMyProProfile(pro)).profile.cpf).toBe("52998224725");
    expect(await reencryptSensitiveFields()).toEqual({ profiles: 0, secrets: 0 });
  });
});

describe("esqueci minha senha", () => {
  let links: string[];
  beforeEach(() => {
    links = [];
    process.env.EMAIL_DEV_LINKS = "1";
    vi.spyOn(console, "info").mockImplementation((line: string) => {
      const m = String(line).match(/link=(\S+)/);
      if (m) links.push(m[1]);
    });
  });
  afterEach(() => {
    delete process.env.EMAIL_DEV_LINKS;
    vi.restoreAllMocks();
  });
  const tokenOf = (link: string) => new URL(link).searchParams.get("token")!;

  it("link de uso único troca a senha e derruba as sessões; o link não fica no banco", async () => {
    const client = await makeClient();
    const email = await emailOf(client.id);
    const { token: sessionToken } = await createSession(client.id, "client");
    await requestPasswordReset(email.toUpperCase());
    expect(links).toHaveLength(1);
    const token = tokenOf(links[0]);
    const [msg] = await db.select().from(outboundMessages).orderBy(desc(outboundMessages.createdAt)).limit(1);
    expect(msg.subject).toMatch(/Redefinir/);
    expect(msg.body).not.toContain(token);
    expect(msg.body).toContain("não armazenado");

    expect(await isResetTokenValid(token)).toBe(true);
    expect((await err(resetPassword(token, "123")))?.fieldErrors?.password).toBeTruthy();
    await resetPassword(token, "nova-senha-forte-456");
    expect(await authenticate(email, "senha-forte-123")).toBeNull();
    expect(await authenticate(email, "nova-senha-forte-456")).not.toBeNull();
    expect(await validateSessionToken(sessionToken)).toBeNull();
    // Uso único.
    expect(await isResetTokenValid(token)).toBe(false);
    expect((await err(resetPassword(token, "outra-senha-forte-789")))?.code).toBe("validation");
  });

  it("e-mail sem conta: mesma resposta, nada enviado; pedir de novo invalida o link anterior; link expira", async () => {
    await requestPasswordReset("ninguem@teste.com");
    expect(links).toHaveLength(0);

    const client = await makeClient();
    const email = await emailOf(client.id);
    await requestPasswordReset(email);
    await requestPasswordReset(email);
    const [first, second] = links.map(tokenOf);
    expect(await isResetTokenValid(first)).toBe(false);
    expect(await isResetTokenValid(second)).toBe(true);

    await db.execute(`update password_reset_tokens set expires_at = now() - interval '1 minute'`);
    expect(await isResetTokenValid(second)).toBe(false);
    expect((await err(resetPassword(second, "nova-senha-forte-456")))?.code).toBe("validation");
  });

  it("conta suspensa não recebe link", async () => {
    const client = await makeClient();
    await db.update(users).set({ status: "suspended" }).where(eq(users.id, client.id));
    await requestPasswordReset(await emailOf(client.id));
    expect(links).toHaveLength(0);
  });
});

describe("verificação em duas etapas (TOTP)", () => {
  async function enable() {
    const client = await makeClient();
    await startTotpSetup(client);
    const secret = (await getMfaStatus(client)).setup!.secret;
    return { client, secret };
  }

  it("cadastro: segredo cifrado, confirmação com código, 10 códigos de recuperação, outras sessões encerradas", async () => {
    const { client, secret } = await enable();
    const [u] = await db.select().from(users).where(eq(users.id, client.id));
    expect(u.totpSecret).toMatch(/^enc:v1:/);
    expect(u.totpSecret).not.toContain(secret);
    expect(u.totpEnabledAt).toBeNull();

    const keep = await createSession(client.id, "client");
    const other = await createSession(client.id, "client");
    expect((await err(confirmTotpSetup(client, "000000")))?.code).toBe("validation");
    const codes = await confirmTotpSetup(client, totpCode(secret, totpStep()), (await validateSessionToken(keep.token))!.sessionId);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(await validateSessionToken(keep.token)).not.toBeNull();
    expect(await validateSessionToken(other.token)).toBeNull();
    const status = await getMfaStatus(client);
    expect(status).toMatchObject({ enabled: true, recoveryCodesLeft: 10, setup: null });
    // Os códigos não ficam em texto no banco.
    const stored = await db.select().from(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, client.id));
    expect(JSON.stringify(stored)).not.toContain(codes[0]);
  });

  it("login: código vale uma vez; código de recuperação também; 5 erros apagam o desafio", async () => {
    const { client, secret } = await enable();
    const codes = await confirmTotpSetup(client, totpCode(secret, totpStep()));

    const t1 = await createMfaChallenge(client.id, "/cliente");
    expect((await err(completeMfaChallenge(t1, "000000")))?.code).toBe("validation");
    const next = totpCode(secret, totpStep() + 1);
    const ok = await completeMfaChallenge(t1, next);
    expect(ok).toMatchObject({ nextPath: "/cliente", factor: "totp" });
    expect(ok.user.id).toBe(client.id);
    // Desafio usado não serve de novo; o mesmo código também não (reuso).
    expect((await err(completeMfaChallenge(t1, next)))?.code).toBe("validation");
    const t2 = await createMfaChallenge(client.id, null);
    expect((await err(completeMfaChallenge(t2, next)))?.code).toBe("validation");

    const t3 = await createMfaChallenge(client.id, null);
    expect((await completeMfaChallenge(t3, codes[0].toUpperCase().replace("-", " "))).factor).toBe("recovery");
    const t4 = await createMfaChallenge(client.id, null);
    expect((await err(completeMfaChallenge(t4, codes[0])))?.code).toBe("validation");
    expect((await getMfaStatus(client)).recoveryCodesLeft).toBe(9);
  });

  it("desafio aceita no máximo 5 tentativas", async () => {
    const { client, secret } = await enable();
    await confirmTotpSetup(client, totpCode(secret, totpStep()));
    const t = await createMfaChallenge(client.id, null);
    for (let i = 0; i < 5; i++) await err(completeMfaChallenge(t, "000000"));
    const e = await err(completeMfaChallenge(t, totpCode(secret, totpStep() + 1)));
    expect(e?.message).toMatch(/tempo para digitar o código acabou/);
  });

  it("desativar exige senha e código; admin não desativa quando é obrigatório; reset pelo servidor", async () => {
    const { client, secret } = await enable();
    await confirmTotpSetup(client, totpCode(secret, totpStep()));
    expect((await err(disableTotp(client, "errada-123", totpCode(secret, totpStep() + 1))))?.fieldErrors?.password).toBeTruthy();
    await disableTotp(client, "senha-forte-123", totpCode(secret, totpStep() + 1));
    expect((await getMfaStatus(client)).enabled).toBe(false);

    process.env.ADMIN_REQUIRE_2FA = "true";
    try {
      const admin = await makeAdmin();
      expect((await getMfaStatus(admin)).required).toBe(true);
      expect((await err(disableTotp(admin, "x", "000000")))?.code).toBe("forbidden");
      const { needsMfaSetup, toActor } = await import("@/server/auth/session");
      const sessionUser = { id: admin.id, name: "Admin", email: "a@t.com", role: "admin" as const, isDemo: false, mfaEnabled: false, sessionId: "s" };
      expect(needsMfaSetup(sessionUser)).toBe(true);
      expect(() => toActor(sessionUser)).toThrow(DomainError);
      expect(toActor({ ...sessionUser, mfaEnabled: true })).toMatchObject({ role: "admin" });
    } finally {
      delete process.env.ADMIN_REQUIRE_2FA;
    }

    const again = await enable();
    await confirmTotpSetup(again.client, totpCode(again.secret, totpStep()));
    await resetMfaByEmail(await emailOf(again.client.id));
    expect((await getMfaStatus(again.client)).enabled).toBe(false);
  });
});

describe("sessões", () => {
  it("sessão de admin dura 12 h; a de cliente, 30 dias", async () => {
    const admin = await makeAdmin();
    const client = await makeClient();
    const a = await createSession(admin.id, "admin");
    const c = await createSession(client.id, "client");
    expect(a.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(12 * 3600_000);
    expect(a.expiresAt.getTime() - Date.now()).toBeGreaterThan(11 * 3600_000);
    expect(c.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * 86400_000);
    expect(await db.select().from(sessions)).toHaveLength(2);
  });
});
