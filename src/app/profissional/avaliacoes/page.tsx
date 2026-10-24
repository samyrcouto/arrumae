import type { Metadata } from "next";
import { FlagReviewForm } from "@/components/pro-forms";
import { Badge, Card, DemoTag, EmptyState, PageHeader, Stars } from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { requireUser } from "@/server/auth/session";
import { listReviewsForPro } from "@/server/services/reviews";

export const metadata: Metadata = { title: "Avaliações" };

export default async function ProReviewsPage() {
  const { actor } = await requireUser(["pro"], "/profissional/avaliacoes");
  const reviews = await listReviewsForPro(actor);
  const published = reviews.filter((r) => r.status === "published");
  const avg = published.length ? published.reduce((s, r) => s + r.rating, 0) / published.length : null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Minhas avaliações" subtitle={avg !== null ? <><Stars value={avg} /> {avg.toFixed(1)} de 5 · {published.length} avaliação(ões)</> : "Você ainda não recebeu avaliações."} />
      <p className="mb-4 text-sm text-ink-soft">Avaliações só podem ser feitas por clientes de serviços concluídos e não podem ser alteradas. Se uma avaliação for indevida, denuncie para moderação.</p>
      {reviews.length === 0 ? (
        <EmptyState title="Sem avaliações ainda" />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><Stars value={r.rating} /> {r.isDemo && <DemoTag />}</span>
                  {r.status !== "published" && <Badge tone="warn">{r.status === "flagged" ? "Em moderação" : "Oculta"}</Badge>}
                </div>
                {r.comment && <p className="mt-2">“{r.comment}”</p>}
                <p className="mt-1 text-sm text-ink-soft">{r.title} · {formatDate(r.createdAt)}</p>
                {r.status === "published" && <FlagReviewForm reviewId={r.id} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
