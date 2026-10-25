import { NextResponse, type NextRequest } from "next/server";
import { isDomainError } from "@/server/domain/errors";
import { bearerMatches } from "@/server/security/bearer";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { getReportingSnapshot, integrationConfig } from "@/server/services/integrations";

/**
 * Indicadores para integrações (n8n, planilhas). SOMENTE LEITURA e sem dados
 * pessoais. `Authorization: Bearer $INTEGRATION_API_TOKEN`; `?days=1..90`.
 */
export async function GET(req: NextRequest) {
  const { apiToken } = integrationConfig();
  if (!apiToken) return NextResponse.json({ error: "INTEGRATION_API_TOKEN não configurado" }, { status: 503 });
  if (!bearerMatches(req.headers.get("authorization"), apiToken))
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  try {
    await enforceRateLimit("integration_api", "metrics", 60, 60);
  } catch (e) {
    if (isDomainError(e)) return NextResponse.json({ error: "muitas requisições" }, { status: 429 });
    throw e;
  }
  const days = Number(req.nextUrl.searchParams.get("days") ?? "1");
  return NextResponse.json(await getReportingSnapshot(days), { headers: { "cache-control": "no-store" } });
}
