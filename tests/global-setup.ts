import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

/** Aplica as migrations no banco de teste antes da suíte. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://arrumae:arrumae_dev@localhost:5432/arrumae_test";
  if (!/test/.test(url)) throw new Error("TEST_DATABASE_URL precisa apontar para um banco de teste");
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
}
