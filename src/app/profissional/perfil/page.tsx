import type { Metadata } from "next";
import Link from "next/link";
import { AvailabilityForm, DeletePhotoButton, DocumentUploadForm, PhotoUploadForm, ProProfileForm, SubmitForReviewButton } from "@/components/pro-forms";
import { Badge, Card, PageHeader, Section } from "@/components/ui";
import { formatDate } from "@/lib/datetime";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL, VERIFICATION_LABEL, VERIFICATION_TONE } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { listCategories, listRegions } from "@/server/services/catalog";
import { getMyProProfile, onboardingChecklist } from "@/server/services/pros";

export const metadata: Metadata = { title: "Meu perfil profissional" };

export default async function ProProfilePage() {
  const { actor } = await requireUser(["pro"], "/profissional/perfil");
  const [data, categories, regions] = await Promise.all([getMyProProfile(actor), listCategories(), listRegions()]);
  const status = data.profile.verificationStatus;
  const checklist = onboardingChecklist(data);
  const canSubmit = (status === "draft" || status === "rejected");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Meu perfil"
        subtitle={<span className="inline-flex flex-wrap items-center gap-2">Verificação: <Badge tone={VERIFICATION_TONE[status]}>{VERIFICATION_LABEL[status]}</Badge>
          {status === "approved" && <Link href={`/profissionais/${actor.kind === "user" ? actor.id : ""}`} className="text-brand underline">Ver perfil público</Link>}</span>}
      />
      <Card><ProProfileForm profile={data.profile} categories={categories} regions={regions} categoryIds={data.categoryIds} regionIds={data.regionIds} /></Card>

      <Section title="Disponibilidade semanal">
        <Card><AvailabilityForm availability={data.availability} /></Card>
      </Section>

      <Section title="Documentos para verificação">
        <Card className="space-y-4">
          <p className="text-ink-soft">Envie foto nítida do documento de identidade (RG ou CNH) e um comprovante de endereço dos últimos 3 meses. Só a equipe de verificação tem acesso.</p>
          {data.documents.length > 0 && (
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>{DOCUMENT_KIND_LABEL[d.kind]} <span className="text-sm text-ink-soft">· {formatDate(d.createdAt)}</span></span>
                  <span className="flex items-center gap-2">
                    <Badge tone={d.status === "accepted" ? "ok" : d.status === "rejected" ? "danger" : "warn"}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
                    <a href={`/arquivos/${d.storageKey}`} target="_blank" rel="noopener" className="text-sm text-brand underline">ver</a>
                  </span>
                  {d.reviewNote && <p className="w-full text-sm text-danger">{d.reviewNote}</p>}
                </li>
              ))}
            </ul>
          )}
          <DocumentUploadForm />
        </Card>
      </Section>

      <Section title="Portfólio (opcional)">
        <Card className="space-y-4">
          {data.photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.photos.map((p) => (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/arquivos/${p.storageKey}`} alt={p.caption || "Foto do portfólio"} className="aspect-square w-full rounded-xl object-cover" />
                  <DeletePhotoButton photoId={p.id} />
                </li>
              ))}
            </ul>
          )}
          <PhotoUploadForm />
        </Card>
      </Section>

      {canSubmit && (
        <Section title="Enviar para análise">
          <Card className="space-y-3">
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.key} className={c.done ? "text-ok" : "text-ink-soft"}>{c.done ? "✓" : "○"} {c.label}</li>
              ))}
            </ul>
            <SubmitForReviewButton disabled={checklist.some((c) => !c.done)} />
          </Card>
        </Section>
      )}
    </div>
  );
}
