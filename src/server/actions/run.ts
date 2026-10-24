import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { isDomainError } from "../domain/errors";

/**
 * Executa a lógica de uma Server Action convertendo erros de domínio em
 * mensagens para o usuário. Erros inesperados são registrados sem dados
 * pessoais e o usuário recebe uma mensagem genérica.
 * redirect()/notFound() continuam funcionando (unstable_rethrow).
 */
export async function run(fn: () => Promise<ActionResult | void>, successMessage?: string): Promise<ActionResult> {
  try {
    const r = await fn();
    return r ?? { ok: true, message: successMessage };
  } catch (e) {
    unstable_rethrow(e);
    if (isDomainError(e)) return { ok: false, message: e.message, fieldErrors: e.fieldErrors };
    console.error("[action] erro inesperado:", e instanceof Error ? e.name + ": " + e.message.slice(0, 200) : "desconhecido");
    return { ok: false, message: "Algo deu errado do nosso lado. Tente novamente em instantes." };
  }
}

export const str = (form: FormData, key: string) => {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
};
export const bool = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";

/** Aceita apenas caminhos internos (evita open redirect via campos de formulário). */
export function safePath(value: string, fallback = "/") {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}
