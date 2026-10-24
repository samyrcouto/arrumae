import { eq } from "drizzle-orm";
import sharp from "sharp";
import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@/server/adapters/storage";
import { db } from "@/server/db/client";
import { proDocuments, proProfiles, requestPhotos, serviceRequests, sessions, users } from "@/server/db/schema";
import { DomainError } from "@/server/domain/errors";
import { consumeRateLimit } from "@/server/security/rate-limit";
import {
  authenticate,
  createSession,
  deleteAccount,
  exportAccountData,
  registerUser,
  validateSessionToken,
} from "@/server/services/accounts";
import { decideProVerification, getMetrics, reviewDocument, setUserStatus } from "@/server/services/admin";
import { resolveRegionByCep, saveRegion } from "@/server/services/catalog";
import {
  getMyProProfile,
  getPublicProProfile,
  setAvailability,
  submitForReview,
  updateProProfile,
  uploadProDocument,
} from "@/server/services/pros";
import { createServiceRequest } from "@/server/services/requests";
import { updateSettings } from "@/server/services/settings";
import { openTicket, getTicket, replyTicket } from "@/server/services/support";
import { asActor, jpegFile, makeAdmin, makeClient, requestInput, resetDb, seedBase } from "./helpers";

let base: Awaited<ReturnType<typeof seedBase>>;
beforeEach(async () => {
  await resetDb();
  base = await seedBase();
});

const err = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e) => e as DomainError,
  );

describe("contas e sessões", () => {
  it("cadastro valida campos, impede e-mail duplicado e autentica", async () => {
    const bad = await err(
      registerUser({ name: "A", email: "x", phone: "1", password: "123", role: "client", acceptTerms: false as true }),
    );
    expect(bad?.code).toBe("validation");
    expect(Object.keys(bad?.fieldErrors ?? {})).toEqual(expect.arrayContaining(["name", "email", "phone", "password", "acceptTerms"]));

    const input = { name: "Maria Silva", email: "Maria@Teste.com", phone: "(11) 98765-4321", password: "senha-forte-123", role: "client" as const, acceptTerms: true as const };
    const u = await registerUser(input);
    expect(u.email).toBe("maria@teste.com");
    expect(u.passwordHash).not.toContain("senha");
    expect((await err(registerUser({ ...input, email: "MARIA@teste.com" })))?.fieldErrors?.email).toBeTruthy();

    expect(await authenticate("maria@teste.com", "errada")).toBeNull();
    expect(await authenticate("naoexiste@teste.com", "senha-forte-123")).toBeNull();
    const ok = await authenticate("  MARIA@teste.com ", "senha-forte-123");
    expect(ok?.id).toBe(u.id);
  });

  it("sessão guarda apenas o hash do token e cai quando o usuário é suspenso", async () => {
    const client = await makeClient();
    const { token } = await createSession(client.id);
    const rows = await db.select().from(sessions);
    expect(rows[0].id).not.toBe(token);
    expect((await validateSessionToken(token))?.id).toBe(client.id);
    const admin = await makeAdmin();
    await setUserStatus(admin, client.id, "suspended", "Teste de suspensão");
    expect(await validateSessionToken(token)).toBeNull();
  });

  it("rate limit bloqueia após o limite na janela", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await consumeRateLimit("t", "ip-1", 3, 60)).allowed);
    expect(results).toEqual([true, true, true, false]);
    expect((await consumeRateLimit("t", "ip-2", 3, 60)).allowed).toBe(true);
  });

  it("exclusão de conta anonimiza dados pessoais e encerra sessões (LGPD)", async () => {
    const client = await makeClient();
    await createServiceRequest(client, requestInput(base.cat.id));
    await createSession(client.id);
    const exported = await exportAccountData(client);
    expect(exported.requests).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toContain("passwordHash");

    expect((await err(deleteAccount(client, "errada")))?.code).toBe("validation");
    await deleteAccount(client, "senha-forte-123");
    const [u] = await db.select().from(users).where(eq(users.id, client.id));
    expect(u).toMatchObject({ status: "deleted", name: "Usuário removido", phone: null });
    expect(u.email).not.toContain("teste.com");
    const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.clientId, client.id));
    expect(r).toMatchObject({ status: "cancelled", addressLine: "[removido]" });
    expect(await db.select().from(sessions).where(eq(sessions.userId, client.id))).toHaveLength(0);
  });
});

describe("uploads", () => {
  it("fotos são reprocessadas em WebP sem metadados EXIF", async () => {
    const client = await makeClient();
    const { id } = await createServiceRequest(client, requestInput(base.cat.id), [await jpegFile()]);
    const [photo] = await db.select().from(requestPhotos).where(eq(requestPhotos.requestId, id));
    expect(photo.mimeType).toBe("image/webp");
    const stored = await storage().get(photo.storageKey);
    const meta = await sharp(stored!).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
  });

  it("recusa arquivo disfarçado de imagem", async () => {
    const client = await makeClient();
    const fake = new File(["<script>alert(1)</script>"], "foto.jpg", { type: "image/jpeg" });
    const e = await err(createServiceRequest(client, requestInput(base.cat.id), [fake]));
    expect(e?.code).toBe("validation");
    expect(await db.select().from(serviceRequests)).toHaveLength(0);
  });
});

describe("cadastro e verificação de profissionais", () => {
  it("checklist obrigatório, aprovação humana com documentos aceitos", async () => {
    const u = await registerUser({ name: "José Pro", email: "jose@teste.com", phone: "11912345678", password: "senha-forte-123", role: "pro", acceptTerms: true });
    const pro = asActor(u);
    expect((await err(submitForReview(pro)))?.code).toBe("validation");

    await updateProProfile(pro, {
      displayName: "José Eletricista",
      bio: "Eletricista residencial há 10 anos, atendo Pinheiros e região com pontualidade.",
      yearsExperience: 10,
      cpf: "529.982.247-25",
      cnpj: "",
      acceptsUrgent: true,
      categoryIds: [base.cat.id],
      regionIds: [base.region.id],
    });
    await setAvailability(pro, [{ weekday: 1, start: "08:00", end: "18:00" }]);
    await uploadProDocument(pro, "identity", await jpegFile("rg.jpg"));
    await uploadProDocument(pro, "address_proof", await jpegFile("conta.jpg"));
    await submitForReview(pro);
    expect((await getMyProProfile(pro)).profile.verificationStatus).toBe("pending_review");
    expect((await err(submitForReview(pro)))?.code).toBe("conflict");

    const admin = await makeAdmin();
    expect((await err(decideProVerification(admin, u.id, "approved", "")))?.code).toBe("validation");
    const docs = await db.select().from(proDocuments).where(eq(proDocuments.proId, u.id));
    for (const d of docs) await reviewDocument(admin, d.id, "accepted", "");
    // Profissional não consegue aprovar a si mesmo.
    expect((await err(decideProVerification(pro, u.id, "approved", "")))?.code).toBe("forbidden");
    await decideProVerification(admin, u.id, "approved", "");

    const pub = await getPublicProProfile(u.id);
    expect(pub?.profile.displayName).toBe("José Eletricista");
    expect(JSON.stringify(pub)).not.toContain("52998224725"); // CPF nunca no perfil público

    // Trocar CPF depois de aprovado exige nova análise.
    await updateProProfile(pro, { ...(await profileInput()), cpf: "111.444.777-35" });
    const [p] = await db.select().from(proProfiles).where(eq(proProfiles.userId, u.id));
    expect(p.verificationStatus).toBe("pending_review");
    expect(await getPublicProProfile(u.id)).toBeNull();

    async function profileInput() {
      return {
        displayName: "José Eletricista",
        bio: "Eletricista residencial há 10 anos, atendo Pinheiros e região com pontualidade.",
        yearsExperience: 10,
        cpf: "529.982.247-25",
        cnpj: "",
        acceptsUrgent: true,
        categoryIds: [base.cat.id],
        regionIds: [base.region.id],
      };
    }
  });
});

describe("administração", () => {
  it("apenas admin altera configurações e vê indicadores", async () => {
    const client = await makeClient();
    expect((await err(updateSettings(client, { maxQuotesPerRequest: 2 })))?.code).toBe("forbidden");
    expect((await err(getMetrics(client)))?.code).toBe("forbidden");
    const admin = await makeAdmin();
    await updateSettings(admin, { maxQuotesPerRequest: 2 });
    expect((await err(updateSettings(admin, { maxQuotesPerRequest: 99 })))?.code).toBe("validation");
    await createServiceRequest(client, requestInput(base.cat.id));
    const m = await getMetrics(admin);
    expect(m.ops.total).toBe(1);
    expect(m.rates.quoteCoverage).toBe(0);
  });

  it("região mais específica vence na resolução por CEP", async () => {
    const admin = await makeAdmin();
    await saveRegion(admin, null, { slug: "vila-madalena", name: "Vila Madalena", city: "São Paulo", state: "sp", cepPrefixes: "05433, 05435", active: true });
    expect((await resolveRegionByCep("05433000"))?.slug).toBe("vila-madalena");
    expect((await resolveRegionByCep("05422010"))?.slug).toBe("pinheiros");
    expect(await resolveRegionByCep("20040020")).toBeNull();
  });

  it("notas internas do suporte não aparecem para o usuário", async () => {
    const client = await makeClient();
    const admin = await makeAdmin();
    const ticketId = await openTicket(client, { category: "question", subject: "Dúvida sobre pagamento", body: "Como pago o profissional?" });
    await replyTicket(admin, ticketId, "Cliente recorrente, priorizar", true);
    await replyTicket(admin, ticketId, "No piloto, o pagamento é feito direto ao profissional.");
    const asClient = await getTicket(client, ticketId);
    expect(asClient.messages).toHaveLength(2);
    expect(asClient.messages.some((m) => m.internal)).toBe(false);
    expect((await getTicket(admin, ticketId)).messages).toHaveLength(3);
    const other = await makeClient();
    expect((await err(getTicket(other, ticketId)))?.code).toBe("not_found");
  });
});
