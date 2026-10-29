/**
 * Regrava com a chave atual o CPF/CNPJ dos profissionais e os segredos do 2FA
 * (texto puro antigo ou chave anterior). Idempotente. Também roda no db:migrate.
 *
 * Troca de chave: mova a chave atual para DATA_ENCRYPTION_KEY_PREVIOUS, coloque a
 * nova em DATA_ENCRYPTION_KEY, rode `npm run db:encrypt-pii` e depois remova a anterior.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { reencryptSensitiveFields } = await import("../src/server/services/encryption");
const { closeDb } = await import("../src/server/db/client");

const { profiles, secrets } = await reencryptSensitiveFields();
console.log(`Campos sensíveis regravados: ${profiles} perfis, ${secrets} segredos de 2FA.`);
await closeDb();
