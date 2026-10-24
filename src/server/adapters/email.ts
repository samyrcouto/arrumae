import "server-only";
import type { DbOrTx } from "../db/client";
import { outboundMessages } from "../db/schema";
import { env } from "../env";

/**
 * Envio de e-mails transacionais. O driver "console" não envia nada: grava a
 * mensagem em `outbound_messages` com status "skipped" e registra uma linha de
 * log sem o conteúdo (para não expor dados pessoais nos logs).
 *
 * Driver real (ex.: Resend, Amazon SES, SMTP) ainda não implementado — exige
 * conta e domínio verificados (ver docs/ROADMAP.md).
 */
export type EmailMessage = { userId?: string; to: string; subject: string; body: string };

export async function sendEmail(conn: DbOrTx, msg: EmailMessage) {
  const driver = env().EMAIL_DRIVER;
  if (driver === "console") {
    await conn.insert(outboundMessages).values({
      userId: msg.userId,
      channel: "email",
      recipient: msg.to,
      subject: msg.subject,
      body: msg.body,
      status: "skipped",
      error: "EMAIL_DRIVER=console (nenhum e-mail real enviado)",
    });
    if (env().APP_ENV === "development") console.info(`[email:console] assunto="${msg.subject}"`);
  }
}
