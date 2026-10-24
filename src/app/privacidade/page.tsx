import type { Metadata } from "next";
import { DraftNotice, Prose } from "@/components/prose";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacy() {
  return (
    <Prose>
      <h1 className="text-4xl font-extrabold">Política de privacidade</h1>
      <DraftNotice />
      <h2>Quais dados coletamos e por quê</h2>
      <ul>
        <li><strong>Conta:</strong> nome, e-mail, celular e senha (guardada apenas como hash). Para entrar e para contato sobre seus serviços.</li>
        <li><strong>Pedidos:</strong> descrição, fotos, CEP, bairro e endereço. O endereço completo só é mostrado ao profissional escolhido, após o agendamento.</li>
        <li><strong>Profissionais:</strong> CPF, documentos e fotos de portfólio, para conferência de identidade e exibição do perfil. CPF e documentos nunca aparecem no perfil público.</li>
        <li><strong>Uso do site:</strong> eventos anônimos (páginas e etapas do pedido) somente se você permitir. Não usamos rastreadores de terceiros nem vendemos dados.</li>
      </ul>
      <h2>Fotos</h2>
      <p>As fotos enviadas são reprocessadas e os metadados (como localização GPS da câmera) são removidos.</p>
      <h2>Com quem compartilhamos</h2>
      <p>Com o profissional ou cliente envolvido no serviço, na medida necessária, e com fornecedores de infraestrutura (hospedagem e banco de dados). [Lista de operadores a completar antes do lançamento.]</p>
      <h2>Seus direitos (LGPD)</h2>
      <ul>
        <li>Baixar uma cópia dos seus dados e excluir sua conta diretamente na página &quot;Minha conta&quot;.</li>
        <li>Corrigir dados de contato a qualquer momento.</li>
        <li>Ao excluir a conta, seus dados pessoais são anonimizados. Registros de serviços podem ser mantidos de forma desidentificada pelo prazo exigido por lei. [Prazos a validar com assessoria jurídica.]</li>
      </ul>
      <h2>Encarregado (DPO)</h2>
      <p>[A designar antes do lançamento.] Contato provisório: {brand.supportEmail}.</p>
    </Prose>
  );
}
