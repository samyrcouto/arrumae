import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/session";
import { consumeRateLimit, LIMITS } from "@/server/security/rate-limit";
import { CLIENT_EVENTS, trackServer } from "@/server/services/analytics";

const schema = z.object({
  name: z.enum(CLIENT_EVENTS),
  path: z.string().max(200).nullish(),
  anonId: z.uuid().nullish(),
  referrerHost: z.string().max(100).nullish(),
  utmSource: z.string().max(100).nullish(),
  utmMedium: z.string().max(100).nullish(),
  utmCampaign: z.string().max(100).nullish(),
  props: z.record(z.string().max(40), z.union([z.string().max(100), z.number(), z.boolean()])).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await consumeRateLimit("track", ip, LIMITS.track.limit, LIMITS.track.window);
  if (!allowed) return new NextResponse(null, { status: 429 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const user = await getCurrentUser();
  const props = Object.fromEntries(Object.entries(parsed.data.props ?? {}).slice(0, 10));
  await trackServer(parsed.data.name, { ...parsed.data, userId: user?.id ?? null, props });
  return new NextResponse(null, { status: 204 });
}
