/**
 * Erros de domínio. As mensagens são exibidas ao usuário (pt-BR), então nunca
 * devem conter dados internos (SQL, ids de outros usuários, stack traces).
 */
export class DomainError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "forbidden" | "conflict" | "validation" | "rate_limited" | "unauthenticated",
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (what = "Registro") => new DomainError(`${what} não encontrado.`, "not_found");
export const forbidden = (msg = "Você não tem permissão para esta ação.") => new DomainError(msg, "forbidden");
export const conflict = (msg: string) => new DomainError(msg, "conflict");
export const invalid = (msg: string, fieldErrors?: Record<string, string>) =>
  new DomainError(msg, "validation", fieldErrors);
export const rateLimited = () =>
  new DomainError("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.", "rate_limited");
export const unauthenticated = () => new DomainError("Entre na sua conta para continuar.", "unauthenticated");

export function isDomainError(e: unknown): e is DomainError {
  return e instanceof DomainError;
}
