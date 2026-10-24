import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;
/** Transação ou conexão — os serviços aceitam ambos. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

const globalForDb = globalThis as unknown as { __arrumaeSql?: postgres.Sql; __arrumaeDb?: Database };

function create(): Database {
  const sql =
    globalForDb.__arrumaeSql ??
    postgres(env().DATABASE_URL, {
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 20,
      // Logs sem parâmetros: evita vazar dados pessoais.
      onnotice: () => {},
    });
  globalForDb.__arrumaeSql = sql;
  return drizzle(sql, { schema });
}

export const db: Database = globalForDb.__arrumaeDb ?? (globalForDb.__arrumaeDb = create());

export async function closeDb() {
  await globalForDb.__arrumaeSql?.end({ timeout: 5 });
  globalForDb.__arrumaeSql = undefined;
  globalForDb.__arrumaeDb = undefined;
}
