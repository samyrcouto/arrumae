/** Cria a conta administradora inicial a partir de ADMIN_EMAIL e ADMIN_PASSWORD. */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { createAdmin } = await import("../src/server/services/accounts");
const { closeDb } = await import("../src/server/db/client");

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD.");
await createAdmin(email, password);
console.log(`Admin criado: ${email}`);
await closeDb();
