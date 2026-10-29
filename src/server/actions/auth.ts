"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import {
  clearMfaCookie,
  clientIp,
  endSession,
  readMfaCookie,
  requireUser,
  requireUserForMfaSetup,
  setMfaCookie,
  startSession,
} from "../auth/session";
import { invalid } from "../domain/errors";
import { enforceRateLimit, LIMITS } from "../security/rate-limit";
import { authenticate, changePassword, deleteAccount, recordSignIn, registerUser, updateContact } from "../services/accounts";
import { trackServer } from "../services/analytics";
import {
  completeMfaChallenge,
  confirmTotpSetup,
  createMfaChallenge,
  disableTotp,
  MFA_CHALLENGE_MINUTES,
  regenerateRecoveryCodes,
  startTotpSetup,
} from "../services/mfa";
import { markAllRead } from "../services/notifications";
import { requestPasswordReset, resetPassword } from "../services/password-reset";
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
    const next = safePath(str(form, "next"), "");
    if (user.totpEnabledAt) {
      // Senha certa, mas a sessão só nasce depois do código do app autenticador.
      const token = await createMfaChallenge(user.id, next || null);
      await setMfaCookie(token, MFA_CHALLENGE_MINUTES * 60);
      redirect("/entrar/verificacao");
    }
    await startSession(user.id, user.role);
    await recordSignIn(user, "password");
    redirect(next || homeFor(user.role));
  });
}

export async function verifyMfaAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    await enforceRateLimit("mfa_ip", await clientIp(), LIMITS.mfa.limit * 3, LIMITS.mfa.window);
    const token = await readMfaCookie();
    if (!token) throw invalid("O tempo para digitar o código acabou. Entre de novo com e-mail e senha.");
    const { user, nextPath, factor } = await completeMfaChallenge(token, str(form, "code"));
    await clearMfaCookie();
    await startSession(user.id, user.role);
    await recordSignIn(user, factor);
    redirect(safePath(nextPath ?? "", homeFor(user.role)));
  });
}

export async function forgotPasswordAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const email = str(form, "email").trim().toLowerCase();
    if (!email.includes("@")) throw invalid("Revise os campos destacados.", { email: "Informe o e-mail da sua conta." });
    await enforceRateLimit("reset_ip", await clientIp(), LIMITS.passwordResetIp.limit, LIMITS.passwordResetIp.window);
    await enforceRateLimit("reset_email", email, LIMITS.passwordResetEmail.limit, LIMITS.passwordResetEmail.window);
    await requestPasswordReset(email);
    // Mesma resposta exista ou não a conta.
    redirect("/entrar/esqueci?enviado=1");
  });
}

export async function resetPasswordAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    await enforceRateLimit("reset_ip", await clientIp(), LIMITS.passwordResetIp.limit, LIMITS.passwordResetIp.window);
    const password = str(form, "password");
    if (password !== str(form, "confirm"))
      throw invalid("Revise os campos destacados.", { confirm: "As duas senhas precisam ser iguais." });
    await resetPassword(str(form, "token"), password);
    redirect("/entrar?senha=redefinida");
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
    await startSession(user.id, user.role);
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

// ---------------------------------------------------------------------------
// Verificação em duas etapas (página /conta/seguranca)
// ---------------------------------------------------------------------------

export async function startTotpSetupAction() {
  const { actor } = await requireUserForMfaSetup();
  await startTotpSetup(actor);
  redirect("/conta/seguranca");
}

/** Códigos de recuperação voltam no resultado: aparecem uma única vez na tela. */
export type RecoveryCodesResult = (NonNullable<ActionResult> & { codes?: string[] }) | null;

export async function confirmTotpSetupAction(_: RecoveryCodesResult, form: FormData): Promise<RecoveryCodesResult> {
  let codes: string[] = [];
  const r = await run(async () => {
    const { actor, user } = await requireUserForMfaSetup();
    codes = await confirmTotpSetup(actor, str(form, "code"), user.sessionId);
  }, "Verificação em duas etapas ativada.");
  return r?.ok ? { ...r, codes } : r;
}

export async function regenerateRecoveryCodesAction(_: RecoveryCodesResult, form: FormData): Promise<RecoveryCodesResult> {
  let codes: string[] = [];
  const r = await run(async () => {
    const { actor } = await requireUserForMfaSetup();
    codes = await regenerateRecoveryCodes(actor, str(form, "code"));
  }, "Novos códigos de recuperação gerados. Os anteriores deixaram de valer.");
  return r?.ok ? { ...r, codes } : r;
}

export async function disableTotpAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  return run(async () => {
    const { actor } = await requireUserForMfaSetup();
    await disableTotp(actor, str(form, "password"), str(form, "code"));
    redirect("/conta/seguranca?desativado=1");
  });
}
