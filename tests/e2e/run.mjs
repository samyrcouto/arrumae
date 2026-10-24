/**
 * Teste ponta a ponta (navegador real) do fluxo principal.
 *
 *   npm run test:e2e            → build de produção + servidor em :3100 + fluxo
 *   npm run test:e2e -- --skip-build
 *
 * Usa um banco separado (desenrola_e2e), recriado a cada execução.
 */
import { execSync, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const base = new URL(process.env.TEST_DATABASE_URL ?? "postgres://desenrola:desenrola_dev@localhost:5432/desenrola_test");
const E2E_DB = "desenrola_e2e";
const admin = postgres(base.toString(), { max: 1, onnotice: () => {} });
await admin.unsafe(`drop database if exists ${E2E_DB} with (force)`);
await admin.unsafe(`create database ${E2E_DB}`);
await admin.end();

const dbUrl = new URL(base);
dbUrl.pathname = `/${E2E_DB}`;
const env = {
  ...process.env,
  DATABASE_URL: dbUrl.toString(),
  APP_ENV: "test",
  APP_URL: "http://localhost:3100",
  STORAGE_LOCAL_DIR: "./.e2e-storage",
  NEXT_TELEMETRY_DISABLED: "1",
};
rmSync(".e2e-storage", { recursive: true, force: true });
const sh = (cmd) => execSync(cmd, { stdio: "inherit", env });
sh("npx tsx --conditions=react-server scripts/migrate.ts");
sh("npx tsx --conditions=react-server scripts/seed.ts --demo");
if (!process.argv.includes("--skip-build")) sh("npx next build");

// Processo próprio (sem npx) em grupo separado, para encerrar também os filhos.
const server = spawn("node_modules/.bin/next", ["start", "-p", "3100"], { env, stdio: ["ignore", "pipe", "pipe"], detached: true });
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* já encerrado */
  }
};
process.on("exit", stop);

// Garante que não há servidor antigo respondendo na porta.
try {
  await fetch("http://localhost:3100/");
  throw new Error("Porta 3100 já está em uso — encerre o processo anterior.");
} catch (e) {
  if (String(e).includes("3100 já")) throw e;
}
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch("http://localhost:3100/")).ok) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

try {
  const { runFlow } = await import("./flow.mjs");
  await runFlow("http://localhost:3100");
  console.log("\n✅ E2E: fluxo completo aprovado");
} catch (e) {
  console.error("\n❌ E2E falhou:", e);
  console.error("--- log do servidor (fim) ---\n" + serverLog.slice(-4000));
  process.exitCode = 1;
} finally {
  stop();
}
