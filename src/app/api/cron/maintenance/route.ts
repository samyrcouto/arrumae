import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runMaintenance } from "@/server/services/maintenance";

/** Rotinas periódicas. Chamar com `Authorization: Bearer $CRON_SECRET` a cada 10–15 min. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json(await runMaintenance());
}
