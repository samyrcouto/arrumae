"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { clientIp, endSession, requireUser, startSession } from "../auth/session";
import { invalid } from "../domain/errors";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { authenticate, changePassword, deleteAccount, registerUser, updateContact } from "../services/accounts";
import { trackServer } from "../services/analytics";
import { markAllRead } from "../services/notifications";
import { bool, run, safePath, str } from "./run";


const homeFor = (role: string) => (role === "admin" ? "/admin" : role === "pro" ? "/profissional" : "/cliente");

export async function loginAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const email = str(form, "email").trim().toLowerCase();
    const ip = await clientIp();
    await enforceRateLimit("login_ip", ip, LIMITS.login.limit * 3, LIMITS.login.window);
    await enforceRateLimit("login_email", email, LIMITS.login.limit, LIMITS.login.window);
    const user = await authenticate(email, str(form, "password"));
    if (!user) throw invalid("E-mail ou senha incorretos.");
    await startSession(user.id);
    redirect(safePath(str(form, "next"), homeFor(user.role)));
  });
}

export async function signupAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    await enforceRateLimit("signup", await clientIp(), LIMITS.signup.limit, LIMITS.signup.window);
    const role = str(form, "role") === "pro" ? "pro" : "client";
    const user = await registerUser({
      name: str(form, "name"),
      email: str(form, "email"),
      phone: str(form, "phone"),
      password: str(form, "password"),
      role,
      acceptTerms: bool(form, "acceptTerms") as true,
      marketingConsent: bool(form, "marketingConsent"),
    });
    await trackServer("signup", { userId: user.id, props: { role } });
    await startSession(user.id);
    redirect(safePath(str(form, "next"), role === "pro" ? "/profissional/perfil" : "/cliente"));
  });
}

export async function logoutAction() {
  await endSession();
  redirect("/");
}

export async function updateContactAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser();
    await updateContact(actor, { name: str(form, "name"), phone: str(form, "phone"), marketingConsent: bool(form, "marketingConsent") });
  }, "Dados atualizados.");
}

export async function changePasswordAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser();
    await changePassword(actor, str(form, "currentPassword"), str(form, "newPassword"));
    redirect("/entrar?senha=alterada");
  });
}

export async function deleteAccountAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUser();
    if (str(form, "confirm") !== "EXCLUIR") throw invalid("Digite EXCLUIR para confirmar.", { confirm: "Digite EXCLUIR." });
    await deleteAccount(actor, str(form, "password"));
    await endSession();
    redirect("/?conta=excluida");
  });
}

export async function markNotificationsReadAction() {
  const { user } = await requireUser();
  await markAllRead(user.id);
  redirect("/notificacoes");
}
