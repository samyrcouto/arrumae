import type { Metadata } from "next";
import { Prose } from "@/components/prose";

export const metadata: Metadata = { title: "Como funciona e regras" };

export default function HowItWorks() {
  return (
    <Prose>
      <h1 className="text-4xl font-extrabold">Como funciona e regras da plataforma</h1>
      <p className="text-lg text-ink-soft">
        Regras claras para cliente e profissional. Tudo o que está aqui é aplicado pelo sistema — não depende de boa vontade.
      </p>

      <h2>1. Pedido e propostas</h2>
      <ul>
        <li>O cliente descreve o serviço, a região (CEP) e a urgência. Fotos ajudam muito.</li>
        <li>Até 8 profissionais verificados da região e especialidade são avisados. O pedido aceita no máximo 4 propostas.</li>
        <li>Profissionais veem o bairro e a descrição, mas não o endereço completo nem o telefone do cliente.</li>
        <li>O pedido fica aberto por até 3 dias. As propostas valem por até 2 dias.</li>
      </ul>

      <h2>2. Tipos de proposta</h2>
      <ul>
        <li><strong>Preço fechado:</strong> valor total para o que foi descrito.</li>
        <li>
          <strong>Visita técnica:</strong> quando é preciso ver o problema antes. A proposta informa a taxa de visita (pode ser
          zero) e, se quiser, uma faixa estimada. O preço final é proposto no local e só vale se o cliente aprovar no app. Se o
          cliente recusar, paga apenas a taxa de visita informada.
        </li>
        <li>Alguns serviços (definidos pela equipe) sempre exigem visita técnica — nesses casos não aceitamos preço fechado.</li>
      </ul>

      <h2>3. Agendamento e contato</h2>
      <ul>
        <li>O cliente escolhe uma proposta e um dos horários oferecidos. O agendamento é confirmado na hora.</li>
        <li>Só então o endereço completo e os telefones são liberados entre cliente e profissional escolhido.</li>
        <li>Antes disso, telefones, e-mails e links de mensageiros são ocultados automaticamente nas mensagens.</li>
      </ul>

      <h2>4. Mudanças de preço</h2>
      <p>
        Durante o serviço, o profissional pode propor um novo valor com justificativa. O serviço só pode ser marcado como
        concluído depois que o cliente aprovar ou recusar. Sem aprovação, vale o valor combinado.
      </p>

      <h2>5. Cancelamentos e ausências</h2>
      <ul>
        <li>O cliente pode cancelar a qualquer momento antes do início. Cancelamentos com menos de 24h do horário ficam registrados como tardios.</li>
        <li>Se o profissional cancelar, o pedido volta a receber propostas e o cancelamento conta no histórico dele.</li>
        <li>
          Passados 30 minutos do horário marcado, quem esperou pode registrar a ausência da outra parte. Ausência do
          profissional reabre o pedido; ausência do cliente encerra o pedido.
        </li>
      </ul>

      <h2>6. Conclusão, pagamento e avaliação</h2>
      <ul>
        <li>O profissional informa a conclusão; o cliente confirma ou contesta. Sem resposta em 3 dias, a conclusão é confirmada automaticamente.</li>
        <li>
          <strong>Piloto:</strong> o pagamento é feito diretamente ao profissional. A plataforma ainda não processa pagamentos,
          não retém valores e não faz reembolsos.
        </li>
        <li>Só quem contratou um serviço concluído pela plataforma pode avaliar — uma vez por serviço. Avaliações não podem ser editadas pelo profissional; denúncias passam por moderação humana.</li>
      </ul>

      <h2>7. Contestações e suporte</h2>
      <ul>
        <li>Durante o serviço ou antes da confirmação, cliente ou profissional podem abrir uma contestação.</li>
        <li>Contestações são analisadas por uma pessoa da equipe, com base no que foi registrado (proposta, mensagens, mudanças de preço e fotos). Nenhuma decisão é tomada automaticamente.</li>
        <li>Problemas de segurança têm prioridade máxima no suporte.</li>
      </ul>

      <h2>8. O que ainda NÃO fazemos</h2>
      <ul>
        <li>Não processamos pagamentos nem oferecemos garantia financeira ou seguro sobre os serviços.</li>
        <li>Não fazemos checagem de antecedentes criminais. Conferimos documento de identidade e comprovante de endereço.</li>
        <li>Não atendemos serviços que exigem responsável técnico registrado (ex.: projetos elétricos, gás).</li>
      </ul>
    </Prose>
  );
}
