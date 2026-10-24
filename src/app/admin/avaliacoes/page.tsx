import Link from "next/link";
import { ModerateReviewForm } from "@/components/admin-forms";
import { Badge, Card, DemoTag, EmptyState, PageHeader, Stars } from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { listReviewsForAdmin } from "@/server/services/reviews";

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  await requireUser(["admin"]);
  const status = (["flagged", "published", "hidden"] as const).find((s) => s === sp.status) ?? "flagged";
  const rows = await listReviewsForAdmin(status);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Avaliações" subtitle="Moderação humana. Nota e comentário nunca são editados — apenas publicados ou ocultados." />
      <div className="mb-4 flex gap-2 text-sm">
        {[["flagged", "Denunciadas"], ["published", "Publicadas"], ["hidden", "Ocultas"]].map(([k, l]) => (
          <Link key={k} href={`?status=${k}`} className={status === k ? "rounded-full bg-brand px-3 py-1 text-white" : "rounded-full border border-line px-3 py-1"}>{l}</Link>
        ))}
      </div>
      {rows.length === 0 ? <EmptyState title="Nada aqui" /> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2"><span><Stars value={r.rating} /> {r.isDemo && <DemoTag />}</span><Badge>{r.status}</Badge></div>
                {r.comment && <p>“{r.comment}”</p>}
                <p className="text-sm text-ink-soft">{r.clientName} → {r.proName} · {formatDate(r.createdAt)} · <Link href={`/admin/solicitacoes/${r.requestId}`} className="underline">solicitação</Link></p>
                {r.flagReason && <p className="rounded-xl bg-warn-soft p-2 text-sm">Denúncia do profissional: “{r.flagReason}”</p>}
                {r.moderationNote && <p className="text-sm text-ink-soft">Moderação: {r.moderationNote}</p>}
                <ModerateReviewForm reviewId={r.id} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
