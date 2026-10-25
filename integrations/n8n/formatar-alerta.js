// Código do nó "Conferir assinatura e montar alerta" (n8n, Code node, modo "Run Once for Each Item").
// Mantido aqui como fonte; o mesmo texto está dentro de 01-alertas-da-equipe.json.
const item = $input.item.json;
const h = item.headers || {};
const esperado = 'sha256=' + item.assinaturaCalculada;
const recebido = String(h['x-arrumae-signature'] || '');
const ts = Number(h['x-arrumae-timestamp']);
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const recente = Number.isFinite(ts) && Math.abs(Date.now() / 1000 - ts) <= 300;
if (!recente || !iguais(esperado, recebido)) return { json: { valido: false } };

const ev = item.body || {};
const d = ev.data || {};
const onde = [d.category && d.category.name, d.region && d.region.name].filter(Boolean).join(' em ');
const demo = d.isDemo ? '[DEMO] ' : '';
const link = d.adminUrl ? '\n' + d.adminUrl : '';
const urg = { today: 'hoje', this_week: 'esta semana', flexible: 'flexível' }[d.urgency] || d.urgency || '';
const categoriaChamado = { question: 'dúvida', complaint: 'reclamação', payment: 'pagamento', safety: 'segurança', account: 'conta' };
const prioridade = { low: 'baixa', normal: 'normal', high: 'alta', urgent: 'URGENTE' };
let mensagem = null;

switch (ev.type) {
  case 'request.created':
    mensagem = `🆕 ${demo}Nova solicitação: ${onde} (urgência: ${urg}). Profissionais convidados: ${d.invitedPros}.`;
    if (d.noEligiblePros) mensagem += '\n⚠️ Nenhum profissional elegível — recrutar agora!';
    break;
  case 'request.stale':
    mensagem = `⏰ ${demo}Solicitação há ${Math.round(d.minutesOpen / 60)} h sem proposta: ${onde}. Ligar para profissionais da região.`;
    break;
  case 'request.status_changed':
    if (d.to === 'disputed') mensagem = `🚨 ${demo}Contestação aberta: ${onde}. Analisar com o histórico do pedido.`;
    else if (d.to === 'cancelled') mensagem = `❌ ${demo}Solicitação cancelada (${d.action}): ${onde}.`;
    else if (d.action === 'pro_cancel' || d.action === 'report_pro_no_show')
      mensagem = `⚠️ ${demo}Profissional desistiu/faltou: ${onde}. A solicitação voltou a receber propostas.`;
    break;
  case 'pro.submitted_for_review':
    mensagem = '👷 Novo profissional aguardando análise de documentos.';
    break;
  case 'support.ticket_opened':
    mensagem = `${d.priority === 'urgent' ? '🚨' : '🎫'} Novo chamado: ${categoriaChamado[d.category] || d.category}, prioridade ${prioridade[d.priority] || d.priority}.`;
    break;
  case 'review.created':
    if (d.rating <= 3) mensagem = `⭐ ${demo}Avaliação baixa: ${d.rating}/5. Vale ligar para o cliente.`;
    break;
}
return { json: { valido: true, tipo: ev.type, notificar: !!mensagem, mensagem: mensagem ? mensagem + link : null } };
