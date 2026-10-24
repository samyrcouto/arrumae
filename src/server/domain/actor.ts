export type UserRole = "client" | "pro" | "admin";

/** Quem está executando a operação. Os serviços sempre recebem um Actor. */
export type Actor = { kind: "user"; id: string; role: UserRole } | { kind: "system" };

export const systemActor: Actor = { kind: "system" };

export function actorRole(actor: Actor): UserRole | "system" {
  return actor.kind === "system" ? "system" : actor.role;
}

export function actorId(actor: Actor): string | null {
  return actor.kind === "system" ? null : actor.id;
}
