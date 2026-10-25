// Código do nó "Montar relatório" (n8n, Code node, modo "Run Once for All Items").
// Mantido aqui como fonte; o mesmo texto está dentro de 02-relatorio-diario.json.
const m = $input.first().json;
const r = m.requests || {};
const brl = (c) => (Number(c || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cats = (m.byCategory || []).map((c) => `• ${c.name}: ${c.created}`).join('\n') || '• nenhuma';
const pros = m.pros || {};
const chamados = (m.openTickets || []).reduce((s, t) => s + t.tickets, 0);
const parados = (m.staleOpenRequests || []).length;
const linhas = [
  `📊 Arrumaê — resumo de ${m.periodDays === 1 ? 'hoje' : `${m.periodDays} dias`}`,
  '',
  `Solicitações: ${r.created} | com proposta: ${r.with_quote} | agendadas: ${r.booked} | concluídas: ${r.completed}`,
  `Canceladas: ${r.cancelled} | expiradas: ${r.expired} | contestadas: ${r.disputed}`,
  `Mediana até a 1ª proposta: ${r.median_minutes_to_first_quote ?? '—'} min`,
  `Serviços concluídos: ${m.finance.services} | valor: ${brl(m.finance.grossCents)} | comissão: ${brl(m.finance.commissionCents)}`,
  '',
  'Por serviço:',
  cats,
  '',
  `Profissionais aguardando análise: ${pros.pending_review || 0} | aprovados: ${pros.approved || 0}`,
  `Chamados em aberto: ${chamados} | solicitações paradas (> 2 h sem proposta): ${parados}`,
];
if (m.integrationQueue && m.integrationQueue.failed > 0)
  linhas.push(`⚠️ ${m.integrationQueue.failed} evento(s) de integração com falha — ver /admin/integracoes`);
return [{ json: { mensagem: linhas.join('\n') } }];
