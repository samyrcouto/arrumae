import "server-only";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { brand } from "@/config/brand";
import { sendEmail } from "../adapters/email";
import { hashPassword } from "../auth/password";
import { db } from "../db/client";
import { mfaChallenges, passwordResetTokens, sessions, users } from "../db/schema";
import { invalid } from "../domain/errors";
import { env } from "../env";
import { randomToken, sha256 } from "../security/crypto";
import { passwordSchema } from "./accounts";
import { audit } from "./audit";

/**
 * "Esqueci minha senha": link por e-mail com token aleatório de 256 bits,
 * válido por 30 minutos e de uso único. O banco guarda só o hash do token.
 * A resposta é a mesma exista ou não a conta (não revela quem tem cadastro).
 */
export const RESET_TOKEN_MINUTES = 30;

export async function requestPasswordReset(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email.includes("@") || email.length > 160) return;
  const [u] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`);
  if (!u || u.status !== "active") return;

  const token = randomToken();
  const link = `${env().APP_URL}/entrar/redefinir?token=${token}`;
  await db.transaction(async (tx) => {
    // Um link por vez: pedir de novo invalida o anterior.
    await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, u.id));
    await tx.insert(passwordResetTokens).values({
      id: sha256(token),
      userId: u.id,
      expiresAt: new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000),
    });
    await sendEmail(tx, {
      userId: u.id,
      to: u.email,
      subject: `Redefinir sua senha no ${brand.name}`,
      body: [
        `Olá, ${u.name.split(" ")[0]}.`,
        "",
        "Recebemos um pedido para redefinir a senha da sua conta. Para criar uma nova senha, abra o link abaixo.",
        `Ele vale por ${RESET_TOKEN_MINUTES} minutos e só pode ser usado uma vez:`,
        "",
        link,
        "",
        "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
      ].join("\n"),
      secretLink: link,
    });
    await audit(tx, { kind: "system" }, "account.password_reset_requested", "user", u.id);
  });
}

/** O link ainda vale? (só para mostrar a mensagem certa na página) */
export async function isResetTokenValid(token: string) {
  if (!token) return false;
  const [t] = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.id, sha256(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())));
  return !!t;
}

export async function resetPassword(token: string, newPassword: string) {
  const pw = passwordSchema.safeParse(newPassword);
  if (!pw.success) throw invalid("Revise os campos destacados.", { password: pw.error.issues[0].message });
  const passwordHash = await hashPassword(newPassword);
  const expired = invalid("Este link expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\".");
  await db.transaction(async (tx) => {
    // UPDATE condicional: dois envios simultâneos do mesmo link não passam os dois.
    const [t] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.id, sha256(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
      .returning();
    if (!t) throw expired;
    const [u] = await tx.select().from(users).where(eq(users.id, t.userId)).for("update");
    if (!u || u.status !== "active") throw expired;
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, u.id));
    // Quem estava logado (talvez quem roubou a senha antiga) sai de todos os aparelhos.
    await tx.delete(sessions).where(eq(sessions.userId, u.id));
    await tx.delete(mfaChallenges).where(eq(mfaChallenges.userId, u.id));
    await audit(tx, { kind: "user", id: u.id, role: u.role }, "account.password_reset", "user", u.id);
    await sendEmail(tx, {
      userId: u.id,
      to: u.email,
      subject: `Sua senha do ${brand.name} foi alterada`,
      body: `Olá, ${u.name.split(" ")[0]}. A senha da sua conta acabou de ser redefinida e todas as sessões foram encerradas. Se não foi você, fale com o suporte imediatamente.`,
    });
  });
}

export async function purgePasswordResetTokens() {
  await db
    .delete(passwordResetTokens)
    .where(or(lt(passwordResetTokens.expiresAt, new Date()), sql`${passwordResetTokens.usedAt} < now() - interval '1 day'`));
}
