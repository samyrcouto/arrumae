/**
 * Remove a verificação em duas etapas de uma conta que perdeu o celular e os
 * códigos de recuperação. Só quem tem acesso ao servidor consegue rodar.
 *
 *   npm run db:reset-2fa -- pessoa@exemplo.com
 *
 * Confira a identidade da pessoa por outro canal antes. Fica na auditoria.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { resetMfaByEmail } = await import("../src/server/services/mfa");
const { closeDb } = await import("../src/server/db/client");

const email = process.argv[2];
if (!email) throw new Error("Informe o e-mail: npm run db:reset-2fa -- pessoa@exemplo.com");
try {
  const u = await resetMfaByEmail(email);
  console.log(`2FA removido de ${u.email}. Sessões encerradas; a pessoa entra só com a senha e deve ativar de novo.`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await closeDb();
}
