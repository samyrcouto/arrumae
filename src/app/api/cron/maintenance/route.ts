import { NextResponse, type NextRequest } from "next/server";
import { bearerMatches } from "@/server/security/bearer";
import { runMaintenance } from "@/server/services/maintenance";

/** Rotinas periódicas. Chamar com `Authorization: Bearer $CRON_SECRET` a cada 5–15 min (cron ou n8n). */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  if (!bearerMatches(req.headers.get("authorization"), secret))
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  return NextResponse.json(await runMaintenance());
}
