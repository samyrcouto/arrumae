import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentReviewForm, ProDecisionForm } from "@/components/admin-forms";
import { Badge, Card, DemoTag, KeyValue, Section } from "@/components/ui";
import { formatPhone, isValidCpf } from "@/lib/br";
import { formatDateTime } from "@/lib/datetime";
import { DOCUMENT_KIND_LABEL, DOCUMENT_STATUS_LABEL, VERIFICATION_LABEL, VERIFICATION_TONE } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { isDomainError } from "@/server/domain/errors";
import { getProForAdmin } from "@/server/services/admin";

export default async function AdminProDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireUser(["admin"]);
  const d = await getProForAdmin(actor, id).catch((e) => {
    if (isDomainError(e)) notFound();
    throw e;
  });
  const p = d.profile;
  return (
    <div className="max-w-3xl">
      <Link href="/admin/profissionais" className="text-sm font-semibold text-brand">← Profissionais</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold">{p.displayName} {d.user.isDemo && <DemoTag />}</h1>
        <Badge tone={VERIFICATION_TONE[p.verificationStatus]}>{VERIFICATION_LABEL[p.verificationStatus]}</Badge>
      </div>
      <p className="text-sm text-ink-soft">O acesso a esta página (CPF e documentos) é registrado na auditoria.</p>
      <Card className="mt-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <KeyValue label="Nome da conta">{d.user.name}</KeyValue>
          <KeyValue label="Contato">{d.user.email} · {d.user.phone ? formatPhone(d.user.phone) : "—"}</KeyValue>
          <KeyValue label="CPF">{p.cpf ? `${p.cpf} ${isValidCpf(p.cpf) ? "(dígitos válidos)" : "(INVÁLIDO)"}` : "—"}</KeyValue>
          <KeyValue label="CNPJ">{p.cnpj ?? "—"}</KeyValue>
          <KeyValue label="Especialidades">{d.categories.join(", ") || "—"}</KeyValue>
          <KeyValue label="Regiões">{d.regions.join(", ") || "—"}</KeyValue>
          <KeyValue label="Experiência">{p.yearsExperience} anos · urgências: {p.acceptsUrgent ? "sim" : "não"}</KeyValue>
          <KeyValue label="Histórico">{p.cancellationsCount} cancelamentos · {p.noShowCount} ausências</KeyValue>
        </dl>
        {p.bio && <p className="mt-4 whitespace-pre-wrap rounded-xl bg-paper p-3">{p.bio}</p>}
      </Card>
      <Section title="Documentos">
        {d.documents.length === 0 ? <p className="text-ink-soft">Nenhum documento enviado.</p> : (
          <ul className="space-y-3">
            {d.documents.map((doc) => (
              <li key={doc.id}>
                <Card className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{DOCUMENT_KIND_LABEL[doc.kind]}</span>
                    <Badge tone={doc.status === "accepted" ? "ok" : doc.status === "rejected" ? "danger" : "warn"}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
                  </div>
                  <p className="text-sm text-ink-soft">{formatDateTime(doc.createdAt)} · {Math.round(doc.sizeBytes / 1024)} KB · sha256 {doc.sha256.slice(0, 12)}…</p>
                  <a href={`/arquivos/${doc.storageKey}`} target="_blank" rel="noopener" className="font-semibold text-brand underline">Abrir documento</a>
                  {doc.status === "pending" && <DocumentReviewForm documentId={doc.id} />}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Decisão de verificação">
        <Card>
          <p className="mb-3 text-sm text-ink-soft">Checklist sugerido: nome e foto do documento conferem com o CPF; comprovante recente no nome do profissional ou com vínculo explicado; região do endereço compatível com as regiões atendidas.</p>
          {p.verificationNotes && <p className="mb-3">Última observação: “{p.verificationNotes}”</p>}
          <ProDecisionForm proId={p.userId} />
        </Card>
      </Section>
    </div>
  );
}
