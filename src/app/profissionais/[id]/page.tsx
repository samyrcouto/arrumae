import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Card, DemoTag, Section, Stars } from "@/components/ui";
import { formatDate, minuteToHHMM, WEEKDAYS } from "@/lib/datetime";
import { getPublicProProfile } from "@/server/services/pros";

export const metadata: Metadata = { title: "Perfil do profissional" };

export default async function PublicProPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const pro = await getPublicProProfile(id);
  if (!pro) notFound();
  const { profile, stats } = pro;
  return (
    <div className="mx-auto max-w-3xl">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{profile.displayName} {pro.isDemo && <DemoTag />}</h1>
            <p className="text-ink-soft">{pro.categories.map((c) => c.name).join(" · ")}</p>
          </div>
          <Badge tone="ok">Documentos conferidos</Badge>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><dt className="text-sm text-ink-soft">Avaliação</dt><dd className="font-semibold">{stats.ratingAvg !== null ? <>{stats.ratingAvg.toFixed(1)} <Stars value={stats.ratingAvg} /></> : "Sem avaliações"}</dd></div>
          <div><dt className="text-sm text-ink-soft">Avaliações</dt><dd className="font-semibold">{stats.ratingCount}</dd></div>
          <div><dt className="text-sm text-ink-soft">Serviços pela plataforma</dt><dd className="font-semibold">{stats.completedJobs}</dd></div>
          <div><dt className="text-sm text-ink-soft">Experiência declarada</dt><dd className="font-semibold">{profile.yearsExperience} anos</dd></div>
        </dl>
        {profile.bio && <p className="mt-5 whitespace-pre-wrap">{profile.bio}</p>}
        <p className="mt-4 text-sm text-ink-soft">
          “Documentos conferidos” significa que nossa equipe verificou documento de identidade e comprovante de endereço. Não inclui checagem de antecedentes.
          Na plataforma desde {formatDate(pro.memberSince)}.
        </p>
      </Card>
      <Section title="Atende em">
        <p>{pro.regions.map((r) => r.name).join(" · ")}</p>
        {pro.availability.length > 0 && (
          <ul className="mt-2 text-[0.95rem] text-ink-soft">
            {pro.availability.map((a) => <li key={a.id}>{WEEKDAYS[a.weekday]}: {minuteToHHMM(a.startMinute)}–{minuteToHHMM(a.endMinute)}</li>)}
          </ul>
        )}
      </Section>
      {pro.photos.length > 0 && (
        <Section title="Trabalhos">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pro.photos.map((p) => (
              <li key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/arquivos/${p.storageKey}`} alt={p.caption || "Trabalho realizado"} className="aspect-square w-full rounded-xl object-cover" />
                {p.caption && <p className="mt-1 text-sm text-ink-soft">{p.caption}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Avaliações de clientes">
        {pro.reviews.length === 0 ? (
          <p className="text-ink-soft">Ainda não há avaliações. Avaliações só podem ser feitas por clientes de serviços concluídos pela plataforma.</p>
        ) : (
          <ul className="space-y-3">
            {pro.reviews.map((r) => (
              <li key={r.id}>
                <Card>
                  <Stars value={r.rating} /> {r.isDemo && <DemoTag />}
                  {r.comment && <p className="mt-1">“{r.comment}”</p>}
                  <p className="mt-1 text-sm text-ink-soft">{r.clientName} · {formatDate(r.createdAt)}</p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
