import type { Metadata } from "next";
import { ProScene } from "@/components/illustrations";
import { Card, LinkButton } from "@/components/ui";
import { listCategories } from "@/server/services/catalog";

export const metadata: Metadata = { title: "Seja um profissional" };
export const dynamic = "force-dynamic";

export default async function ProLanding() {
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid items-center gap-8 rounded-[2rem] bg-tape p-6 sm:p-10 md:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="font-semibold">Para profissionais</p>
          <h1 className="mt-1 text-4xl font-extrabold leading-[1.05] sm:text-5xl">Pedidos de verdade, sem pagar por contato</h1>
          <p className="mt-4 text-lg">
            Você recebe solicitações da sua região e da sua especialidade, já com descrição e fotos. Só envia proposta para o que
            quiser fazer — e não paga nada para ver o pedido.
          </p>
          <LinkButton href="/cadastro?tipo=profissional" className="mt-6 bg-ink hover:bg-ink/90">Começar cadastro</LinkButton>
        </div>
        <ProScene className="mx-auto w-full max-w-sm" />
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ["Pedidos mais completos", "O cliente descreve o problema, envia fotos e informa a urgência antes de chegar até você."],
          ["Poucos concorrentes por pedido", "Cada pedido recebe no máximo 4 propostas. Nada de disputar com dezenas de pessoas."],
          ["Combinado registrado", "Preço, horário e mudanças ficam registrados. Se o cliente contestar, a equipe analisa com base nisso."],
          ["Seu perfil, sua reputação", "Avaliações só podem ser feitas por clientes de serviços concluídos pela plataforma."],
        ].map(([t, d]) => (
          <Card key={t}>
            <p className="text-lg font-semibold">{t}</p>
            <p className="mt-1 text-ink-soft">{d}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-6 bg-tape-soft">
        <p className="font-semibold">Como ganhamos dinheiro</p>
        <p className="mt-1">
          O modelo previsto é uma comissão sobre serviços concluídos — nunca por contato. <strong>Durante o piloto, a comissão
          está dispensada</strong>; avisaremos com antecedência antes de qualquer cobrança, com as condições por escrito.
        </p>
      </Card>
      <h2 className="mt-10 text-2xl font-bold">Especialidades atendidas no piloto</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.id} className="rounded-full border border-line bg-card px-3 py-1">{c.name}</li>
        ))}
      </ul>
      <h2 className="mt-10 text-2xl font-bold">O que você vai precisar</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6">
        <li>CPF e documento de identidade com foto (RG ou CNH)</li>
        <li>Comprovante de endereço recente</li>
        <li>Certificados, se tiver (ex.: NR-10 para eletricistas) — ajudam na análise</li>
        <li>Celular com câmera para enviar fotos dos documentos</li>
      </ul>
      <LinkButton href="/cadastro?tipo=profissional" className="mt-8 w-full sm:w-auto">Começar cadastro</LinkButton>
    </div>
  );
}
