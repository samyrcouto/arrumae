import type { Metadata } from "next";
import { DraftNotice, Prose } from "@/components/prose";
import { brand } from "@/config/brand";
import { TERMS_VERSION } from "@/config/legal";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Terms() {
  return (
    <Prose>
      <h1 className="text-4xl font-extrabold">Termos de uso</h1>
      <p className="text-sm text-ink-soft">Versão {TERMS_VERSION}</p>
      <DraftNotice />
      <h2>1. O que é a plataforma</h2>
      <p>
        {brand.name} é uma plataforma de intermediação que conecta pessoas que precisam de serviços residenciais
        (&quot;clientes&quot;) a profissionais independentes (&quot;profissionais&quot;). Os serviços são prestados pelos
        profissionais, que definem seus preços e condições nas propostas.
      </p>
      <h2>2. Cadastro</h2>
      <ul>
        <li>É preciso ter 18 anos ou mais e fornecer informações verdadeiras.</li>
        <li>Cada pessoa é responsável pela segurança da própria senha.</li>
        <li>Profissionais passam por conferência de documentos antes de enviar propostas. A conferência não garante a qualidade do serviço.</li>
      </ul>
      <h2>3. Regras de uso</h2>
      <p>As regras de pedidos, propostas, cancelamento, ausência, mudanças de preço e contestação estão descritas em &quot;Como funciona e regras&quot; e fazem parte destes termos.</p>
      <h2>4. Pagamentos durante o piloto</h2>
      <p>Durante o piloto, o pagamento é combinado e feito diretamente entre cliente e profissional. A plataforma não recebe, não retém e não reembolsa valores.</p>
      <h2>5. Responsabilidades</h2>
      <p>[A definir com assessoria jurídica: responsabilidade da plataforma como intermediadora, deveres dos profissionais, limites e canais de reclamação, conforme o Código de Defesa do Consumidor.]</p>
      <h2>6. Suspensão</h2>
      <p>Contas podem ser suspensas em caso de fraude, desrespeito, risco à segurança ou descumprimento repetido das regras. A decisão é tomada por pessoa da equipe e registrada.</p>
      <h2>7. Contato</h2>
      <p>Pela área de suporte da plataforma ou pelo e-mail {brand.supportEmail}.</p>
    </Prose>
  );
}
