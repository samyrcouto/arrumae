import "server-only";
import type { DbOrTx } from "../db/client";
import { outboundMessages } from "../db/schema";
import { env } from "../env";

/**
 * Envio de e-mails transacionais. O driver "console" não envia nada: grava a
 * mensagem em `outbound_messages` com status "skipped" e registra uma linha de
 * log sem o conteúdo (para não expor dados pessoais nos logs).
 *
 * `secretLink` (ex.: link de redefinir senha) vai no corpo enviado, mas nunca
 * fica gravado: no banco o corpo sai com o link trocado por um aviso. Só em
 * desenvolvimento (ou no teste E2E, com EMAIL_DEV_LINKS=1) o link aparece no
 * terminal, para dar para testar sem provedor de e-mail.
 *
 * Driver real (ex.: Resend, Amazon SES, SMTP) ainda não implementado — exige
 * conta e domínio verificados (ver docs/ROADMAP.md).
 */
export type EmailMessage = { userId?: string; to: string; subject: string; body: string; secretLink?: string };

const REDACTED = "[link de uso único — não armazenado]";

export async function sendEmail(conn: DbOrTx, msg: EmailMessage) {
  const e = env();
  const stored = msg.secretLink ? msg.body.replaceAll(msg.secretLink, REDACTED) : msg.body;
  if (e.EMAIL_DRIVER === "console") {
    await conn.insert(outboundMessages).values({
      userId: msg.userId,
      channel: "email",
      recipient: msg.to,
      subject: msg.subject,
      body: stored,
      status: "skipped",
      error: "EMAIL_DRIVER=console (nenhum e-mail real enviado)",
    });
    const showLink = e.APP_ENV === "development" || (e.APP_ENV === "test" && process.env.EMAIL_DEV_LINKS === "1");
    if (e.APP_ENV === "development" || showLink)
      console.info(`[email:console] assunto="${msg.subject}"${showLink && msg.secretLink ? ` link=${msg.secretLink}` : ""}`);
  }
}
