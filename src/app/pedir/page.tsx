import type { Metadata } from "next";
import Link from "next/link";
import { RequestWizard } from "@/components/request-wizard";
import { Alert, Card } from "@/components/ui";
import { matchService } from "@/lib/service-match";
import { getCurrentUser } from "@/server/auth/session";
import { listCategories, listRegions } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Pedir orçamento" };

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<{ categoria?: string; titulo?: string }> }) {
  const sp = await searchParams;
  // Texto digitado na home ("o chuveiro queimou"): vira o resumo e, se der, escolhe o serviço.
  const title = (sp.titulo ?? "").trim().slice(0, 80);
  const initialCategory = sp.categoria || matchService(title) || undefined;
  const [user, categories, regions] = await Promise.all([getCurrentUser(), listCategories(), listRegions()]);
  if (user && user.role !== "client")
    return (
      <div className="mx-auto max-w-xl">
        <Alert tone="warn" title="Você está com uma conta de profissional ou admin">
          Para pedir um serviço, use uma conta de cliente. <Link href="/" className="underline">Voltar</Link>
        </Alert>
      </div>
    );
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Pedir orçamento</h1>
      <p className="mb-6 mt-1 text-ink-soft">Leva uns 2 minutos. Você recebe propostas com preço e horário.</p>
      <Card className="p-5 sm:p-7">
        <RequestWizard
          categories={categories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            shortDescription: c.shortDescription,
            examples: c.examples,
            outOfScope: c.outOfScope,
          }))}
          initialCategory={initialCategory}
          initialTitle={title}
          loggedIn={!!user}
          regionsText={regions.map((r) => r.name).join(", ")}
        />
      </Card>
      {!user && (
        <p className="mt-4 text-center text-ink-soft">
          Já tem conta? <Link href="/entrar?next=/pedir" className="font-semibold text-brand underline">Entre primeiro</Link>
        </p>
      )}
    </div>
  );
}
