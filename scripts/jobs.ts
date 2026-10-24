/** Rotinas periódicas (expiração, confirmação automática, limpeza). Agende a cada 10–15 min. */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const { runMaintenance } = await import("../src/server/services/maintenance");
const { closeDb } = await import("../src/server/db/client");
console.log(JSON.stringify(await runMaintenance()));
await closeDb();
