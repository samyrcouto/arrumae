/** Resultado padronizado das Server Actions (serializável para o cliente). */
export type ActionResult = { ok: boolean; message?: string; fieldErrors?: Record<string, string> } | null;
