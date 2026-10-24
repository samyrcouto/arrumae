import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { assertSafeKey, storage } from "@/server/adapters/storage";
import { getCurrentUser } from "@/server/auth/session";
import { db } from "@/server/db/client";
import { proPhotos, proProfiles, requestInvitations, requestPhotos, serviceRequests } from "@/server/db/schema";

/**
 * Serve arquivos privados verificando permissão a cada requisição:
 * - fotos de solicitação: cliente dono, profissional convidado/designado, admin;
 * - documentos de profissional: o próprio profissional e admin;
 * - fotos de portfólio: públicas se o profissional estiver aprovado.
 * Responde 404 (e não 403) para não revelar a existência do arquivo.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const key = (await ctx.params).key.join("/");
  try {
    assertSafeKey(key);
  } catch {
    return notFound();
  }
  const [folder, ownerId] = key.split("/");
  const user = await getCurrentUser();

  let allowed = false;
  if (folder === "request-photos") {
    const [photo] = await db.select().from(requestPhotos).where(eq(requestPhotos.storageKey, key));
    if (photo && user) {
      if (user.role === "admin") allowed = true;
      else {
        const [r] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, photo.requestId));
        if (r && (r.clientId === user.id || r.proId === user.id)) allowed = true;
        else if (r && user.role === "pro") {
          const [inv] = await db
            .select()
            .from(requestInvitations)
            .where(and(eq(requestInvitations.requestId, r.id), eq(requestInvitations.proId, user.id)));
          allowed = !!inv;
        }
      }
    }
  } else if (folder === "pro-documents") {
    allowed = !!user && (user.role === "admin" || user.id === ownerId);
  } else if (folder === "pro-photos") {
    const [photo] = await db.select().from(proPhotos).where(eq(proPhotos.storageKey, key));
    if (photo) {
      const [p] = await db.select().from(proProfiles).where(eq(proProfiles.userId, photo.proId));
      allowed = p?.verificationStatus === "approved" || (!!user && (user.role === "admin" || user.id === photo.proId));
    }
  }
  if (!allowed) return notFound();

  const data = await storage().get(key);
  if (!data) return notFound();
  const isPdf = key.endsWith(".pdf");
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "image/webp",
      "Content-Disposition": isPdf ? "attachment" : "inline",
      "Cache-Control": folder === "pro-photos" ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

const notFound = () => new NextResponse("Não encontrado", { status: 404 });
