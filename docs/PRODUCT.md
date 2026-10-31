# Produto

Legenda de status: **planejada · em desenvolvimento · implementada · testada · bloqueada**.
"Testada" = coberta por teste automatizado (unitário, integração ou E2E).

## 1. Problema

Quem precisa de um pequeno reparo em casa enfrenta: dificuldade de achar alguém confiável, demora para conseguir atendimento, preço incerto (e que muda no meio do serviço), falta de visibilidade sobre disponibilidade, receio de pagar antes e não ter a quem recorrer quando algo dá errado.

Do lado do profissional (pesquisa de concorrência em [BUSINESS.md](BUSINESS.md)): no modelo dominante de mercado (pagar por contato/"moedas"), há reclamações recorrentes de leads que continuam à venda depois de o cliente já ter contratado alguém, clientes falsos ou que não respondem, e recusa de reembolso.

## 2. Público do piloto

- **Clientes:** moradores de apartamentos e casas em bairros de São Paulo com alta densidade, que precisam de serviços pequenos e padronizáveis. Muitos com pouca familiaridade digital → interface simples, fonte 17px, botões grandes, sem instalar app.
- **Profissionais:** autônomos/MEI com experiência, que hoje dependem de indicação, WhatsApp ou plataformas pay‑per‑lead.

## 3. Proposta de valor (o que é diferente de verdade)

Pagamento integrado, verificação e avaliações **não** são diferenciais por si só — o Triider já oferece pagamento com cartão, checagem de antecedentes e garantia. A diferenciação do piloto está na combinação abaixo, todas implementadas e aplicadas pelo sistema:

| Promessa | Como o sistema garante | Status |
|---|---|---|
| Preço antes de agendar | Proposta exige preço total **ou** taxa de visita explícita; categorias marcadas como "exige visita" recusam preço fechado | testada |
| Mudança de preço só com OK do cliente | Revisão de preço com aprovação; o serviço não pode ser concluído com revisão pendente | testada |
| Profissional não paga para ver pedido | Sem moedas/leads; convites limitados por pedido; modelo de receita = comissão sobre concluído (dispensada no piloto) | implementada |
| Poucas propostas, mais sérias | Máx. 4 propostas por pedido e 8 convites (configurável) | testada |
| Contato protegido | Endereço completo, CEP completo e telefone só para o profissional escolhido, após agendamento; contatos mascarados nas mensagens antes disso | testada |
| Combinado registrado | Linha do tempo, mensagens, revisões e propostas ficam registradas; contestação abre chamado com base nisso | testada |
| Cadastro conferido por pessoas | Documento de identidade + comprovante de endereço aceitos por admin antes da aprovação (sem checagem de antecedentes — não prometido) | testada |

## 4. Recorte do piloto

### Categorias (5, configuráveis no admin)

| Categoria | Frequência/demanda | Ticket | Urgência | Padronização | Complexidade/risco | Decisão |
|---|---|---|---|---|---|---|
| Eletricista (pequenos serviços) | Alta (chuveiro, tomada, disjuntor) | Baixo–médio | Alta | Alta | Médio (risco elétrico; escopo limitado, sem projeto/ART) | **Lançar** |
| Encanador (pequenos reparos) | Alta (vazamentos, torneiras, descarga) | Baixo–médio | Alta | Média | Médio (gás e obras fora do escopo) | **Lançar** |
| Montagem de móveis | Alta (e‑commerce de móveis, mudanças) | Médio | Baixa | **Muito alta** (por peça) | Baixo | **Lançar** — melhor candidata a preço fechado e parcerias com varejo |
| Pequenos reparos/instalações | Alta (suporte de TV, prateleiras, cortinas) | Baixo | Baixa | Alta | Baixo | **Lançar** |
| Ar‑condicionado split (limpeza/manutenção; instalação com visita) | Sazonal — pico no verão (nov–mar) | Médio–alto | Média | Média (limpeza padronizada; instalação não) | Médio (garantia do fabricante, trabalho em altura) | **Experimento sazonal** — pausar no inverno se a oferta não se sustentar |

Fontes de faixa de preço (não oficiais, divergentes): eletricista R$ 80–150/h, troca de tomada R$ 50–85/unidade, visita técnica de encanador R$ 50–150 (geralmente abatida se o serviço for fechado). Ver [BUSINESS.md](BUSINESS.md#fontes). **Nenhum preço é exibido aos clientes como referência** enquanto não houver dados próprios.

### Região

- **Hipótese:** centro expandido Oeste/Sul de São Paulo (5 regiões cadastradas por prefixo de CEP de 3 dígitos — aproximação que **precisa ser validada** com a base dos Correios).
- **Recomendação:** ativar **apenas 2 regiões** no primeiro mês (ex.: Pinheiros/Vila Madalena e Perdizes/Pompeia) para concentrar a oferta. Critério para ativar a próxima: ≥ 80% dos pedidos com ao menos uma proposta em 4h, por 2 semanas.
- Pedidos de CEPs fora da área são recusados com mensagem clara e registram o evento `out_of_area` (prefixo de 3 dígitos + categoria) — sinal de demanda para expansão.

## 5. Ciclo de vida da solicitação

Implementado em `src/server/domain/request-lifecycle.ts` (regras puras, testadas em `tests/unit`) e aplicado com UPDATE condicional sob lock de linha (`src/server/services/requests.ts`).

```
                ┌─────────────── pro_cancel / report_pro_no_show (reabre) ───────────────┐
                ▼                                                                         │
 [open] ──accept_quote──► [scheduled] ──start──► [in_progress] ──complete──► [awaiting_confirmation] ──confirm / auto_confirm──► [completed]
   │                         │  │                     │                             │
   │ client_cancel           │  │ client_cancel       │ open_dispute                │ open_dispute
   │ admin_cancel            │  │ report_client_      ▼                             ▼
   │ expire (sistema)        │  │ no_show       [disputed] ──resolve_as_completed (admin)──► [completed]
   ▼                         ▼  ▼                     └────resolve_as_cancelled (admin)──► [cancelled]
 [cancelled] / [expired]   [cancelled]
```

Regras de horário e permissão (todas verificadas no servidor):

| Ação | Quem | Condição extra |
|---|---|---|
| Aceitar proposta | Cliente dono | Pedido aberto e no prazo; proposta pendente e válida; horário escolhido no futuro; profissional ainda aprovado |
| Iniciar | Profissional designado | A partir de 2h antes do horário |
| Registrar ausência | Cliente (do profissional) / profissional (do cliente) | 30 min após o início do horário |
| Concluir | Profissional designado | Sem revisão de preço pendente |
| Confirmar | Cliente dono | — (sem resposta em 72h → confirmação automática, que **não** presume pagamento) |
| Contestar | Cliente ou profissional | Em andamento ou aguardando confirmação |
| Resolver contestação | Admin | Justificativa obrigatória; registrado na auditoria |
| Cancelar | Cliente (aberto/agendado), profissional (agendado → reabre), admin | Motivo obrigatório; cancelamento do cliente com < 24h é marcado como tardio |

Propostas: `pending → accepted | rejected | withdrawn | superseded | expired | cancelled`. Se o profissional escolhido cancela ou falta, propostas "superseded" ainda válidas voltam a "pending".

### Visita técnica

Proposta tipo `visit`: taxa de visita (pode ser 0) + faixa estimada opcional. No local, o profissional propõe o valor final por revisão de preço; se aprovado, vira o valor combinado (a taxa de visita fica incluída/abatida); se recusado, o valor devido é a taxa de visita.

## 6. Políticas

Publicadas para usuários em `/como-funciona`. Resumo do que é automático vs. humano:

| Automático (sistema) | Humano (equipe) |
|---|---|
| Expiração de pedidos (72h) e propostas (48h ou início do 1º horário) | Aprovação/recusa de profissionais e documentos |
| Confirmação automática após 72h | Resolução de contestações (valor final ou cancelamento) |
| Reabertura do pedido após cancelamento/ausência do profissional | Moderação de avaliações denunciadas |
| Contadores de cancelamento/ausência do profissional | Suspensão de contas |
| Ocultação de contatos antes do agendamento | Atendimento de chamados |
| Prioridade "urgente" para chamados de segurança | Reembolsos (quando houver pagamento integrado) |

Nenhuma automação aprova pagamentos, altera comissões, aprova verificações ou resolve disputas.

## 7. Funcionalidades e critérios de aceitação

### A. Cliente

| # | Funcionalidade | Critério de aceitação | Status |
|---|---|---|---|
| 0 | Home com combinado ao vivo | Escrever o problema mostra o serviço identificado e as regras do combinado; o envio abre o pedido com serviço e resumo preenchidos; exemplos de cada serviço levam ao pedido preenchido | testada (unidade + E2E) |
| 1 | Acesso sem fricção | Visitante faz o pedido inteiro e cria conta na última etapa, sem sair do formulário | testada (E2E) |
| 2 | Escolher categoria | Cards por categoria com exemplos e itens fora do escopo | implementada |
| 3 | Descrever problema, endereço, urgência | Validação no servidor com erros por campo; CEP fora da área recusado | testada |
| 4 | Fotos | Até 5; tipo detectado pelo conteúdo; reprocessadas em WebP sem EXIF/GPS | testada |
| 5 | Ver profissionais compatíveis | Propostas mostram nome, nota, nº de serviços concluídos, experiência e link para perfil público | implementada |
| 6 | Perfis com avaliações legítimas | Avaliações só de serviços concluídos, 1 por serviço, imutáveis | testada |
| 7 | Propostas com condições claras | Preço fechado ou taxa de visita + estimativa; o que está incluído; validade | testada |
| 8 | Escolher e agendar | Escolha de horário entre os oferecidos; aceite atômico (2 aceites simultâneos → só 1 vence) | testada |
| 9 | Acompanhar estado | Barra de progresso + linha do tempo + notificações | testada (E2E) |
| 10 | Notificações | In‑app (sino com contador) + e‑mail via driver (console no MVP — **sem envio real**) | implementada |
| 11 | Histórico | Lista "em andamento" e "histórico" | implementada |
| 12 | Avaliar | Após conclusão, nota 1–5 + comentário | testada |
| 13 | Suporte/reclamação | Chamados com categorias; contestação vinculada ao pedido | testada |
| 14 | Dados e exclusão | Exportar JSON; excluir conta com anonimização (bloqueado com serviço ativo) | testada |

### B. Profissional

| # | Funcionalidade | Critério de aceitação | Status |
|---|---|---|---|
| 1 | Cadastro | Conta de profissional separada da de cliente | testada |
| 2 | Especialidades, regiões, disponibilidade | Até 5 categorias; regiões ativas; grade semanal | testada |
| 3 | Documentos | RG/CNH, comprovante, certificados; JPG/PNG/WebP/PDF (PDF com JS é recusado) | testada |
| 4 | Perfil público | Descrição, experiência, portfólio com declaração de direitos de imagem; CPF nunca público | testada |
| 5 | Estado da verificação | Checklist de pendências, status e observações da equipe | testada |
| 6 | Receber solicitações compatíveis | Convite por categoria + região + aprovado, ordenado por critérios transparentes | testada |
| 7 | Propor e esclarecer | Proposta com horários; conversa por proposta | testada |
| 8 | Aceitar/recusar | "Não posso atender" (recusa convite); retirar proposta | implementada |
| 9 | Agenda | Próximos atendimentos e concluídos | implementada |
| 10 | Atualizar estado | Iniciar, propor novo valor, concluir, cancelar, registrar ausência do cliente | testada |
| 11 | Histórico | Concluídos com valores | implementada |
| 12 | Avaliações e indicadores | Lista de avaliações + denúncia para moderação | testada |
| 13 | Notificações | Igual ao cliente | implementada |
| 14 | Financeiro | Valores combinados (piloto sem repasse) | implementada — repasses **planejados** |

O profissional **não** consegue alterar avaliações (trigger no banco), status de verificação (somente serviço admin) ou registros financeiros (sem rota de escrita).

### C. Admin

| Área | Status |
|---|---|
| Indicadores (volume, cobertura, tempo até 1ª proposta, conclusão, GMV, ticket, comissão, nota, funil, origem UTM) | implementada |
| Usuários (busca, suspender/reativar com motivo) | testada |
| Profissionais (fila de verificação, documentos, decisão com motivo) | testada |
| Categorias e regiões (CRUD, pausar) | testada |
| Solicitações (lista, detalhe completo, cancelar, resolver contestação) | testada |
| Avaliações (moderação de denunciadas) | testada |
| Suporte (responder, notas internas, status/prioridade) | testada |
| Financeiro (economia por serviço, status de pagamento declarado) | implementada |
| Cupons (cadastro) | implementada — **aplicação no checkout bloqueada** até haver pagamento integrado |
| Configurações comerciais | testada |
| Auditoria (append‑only) | testada |
| Integrações (fila de eventos para n8n, entregas, falhas, reenvio) | testada (inclusive ponta a ponta com n8n 1.123 local) |
| Verificação em duas etapas obrigatória para admin (produção/homologação) | testada (integração); E2E cobre a ativação e o login com código |
| Alerta de cadastros com o mesmo CPF (pelo índice cego, sem decifrar) | testada |

### D. Conta e segurança (todos os papéis)

| Funcionalidade | Status |
|---|---|
| "Esqueci minha senha" por link de uso único (30 min) | testada (E2E); **e-mail real depende de provedor** — hoje o link só aparece no terminal em desenvolvimento |
| Verificação em duas etapas por app autenticador, com 10 códigos de recuperação | testada (E2E) |
| CPF/CNPJ cifrados no banco | testada |

## 8. Fora do escopo do MVP (planejado)

Envio real do e-mail de recuperação de senha (exige provedor de e‑mail), login por telefone/OTP, pagamentos integrados e repasses, envio real de e‑mail/WhatsApp/push, geolocalização por mapa, agenda com bloqueio automático de horários, avaliação do cliente pelo profissional, app nativo, IA. Ver [ROADMAP.md](ROADMAP.md).
