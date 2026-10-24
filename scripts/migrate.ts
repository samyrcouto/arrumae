/** Aplica as migrations versionadas em drizzle/. Uso: npm run db:migrate */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const url = process.argv[2] === "--test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const sql = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql.end();
console.log("Migrations aplicadas.");
