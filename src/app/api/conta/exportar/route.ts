import { NextResponse } from "next/server";
import { getCurrentUser, toActor } from "@/server/auth/session";
import { exportAccountData } from "@/server/services/accounts";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  const data = await exportAccountData(toActor(user));
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="meus-dados-desenrola.json"`,
      "Cache-Control": "no-store",
    },
  });
}
