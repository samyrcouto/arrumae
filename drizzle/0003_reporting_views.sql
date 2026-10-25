-- Camada de relatórios (schema "reporting"): views SEM dados pessoais, para
-- n8n, planilhas e ferramentas de BI. Quem lê os relatórios usa um papel
-- (role) que só enxerga este schema (scripts/sql/reporting-role.sql); as
-- views rodam com os privilégios do dono, então o papel de leitura nunca
-- precisa de acesso às tabelas originais. Dados de demonstração ficam de fora.
CREATE SCHEMA IF NOT EXISTS reporting;
--> statement-breakpoint
-- Uma linha por solicitação real: categoria, região, status e tempos. Sem
-- cliente, endereço, CEP, descrição ou título.
CREATE VIEW reporting.requests AS
SELECT
  r.id,
  r.created_at,
  (r.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS created_day,
  c.slug AS category_slug,
  c.name AS category_name,
  g.slug AS region_slug,
  g.name AS region_name,
  r.urgency::text AS urgency,
  r.status::text AS status,
  (SELECT count(*) FROM request_invitations i WHERE i.request_id = r.id)::int AS invited_pros,
  (SELECT count(*) FROM quotes q WHERE q.request_id = r.id)::int AS quotes_count,
  fq.first_quote_at,
  CASE WHEN fq.first_quote_at IS NULL THEN NULL
       ELSE floor(extract(epoch FROM (fq.first_quote_at - r.created_at)) / 60)::int END AS minutes_to_first_quote,
  r.scheduled_start,
  r.completed_at,
  r.confirmed_at,
  r.cancelled_at,
  r.agreed_amount_cents,
  r.final_amount_cents,
  r.utm_source,
  r.utm_medium,
  r.utm_campaign
FROM service_requests r
JOIN categories c ON c.id = r.category_id
LEFT JOIN regions g ON g.id = r.region_id
LEFT JOIN LATERAL (SELECT min(q.created_at) AS first_quote_at FROM quotes q WHERE q.request_id = r.id) fq ON true
WHERE r.is_demo = false;
--> statement-breakpoint
-- Funil por dia de criação (fuso de São Paulo).
CREATE VIEW reporting.daily_kpis AS
SELECT
  created_day AS day,
  count(*)::int AS requests_created,
  count(*) FILTER (WHERE quotes_count > 0)::int AS requests_with_quote,
  count(*) FILTER (WHERE status IN ('scheduled', 'in_progress', 'awaiting_confirmation', 'completed', 'disputed'))::int AS requests_booked,
  count(*) FILTER (WHERE status = 'completed')::int AS requests_completed,
  count(*) FILTER (WHERE status = 'cancelled')::int AS requests_cancelled,
  count(*) FILTER (WHERE status = 'expired')::int AS requests_expired,
  count(*) FILTER (WHERE status = 'disputed')::int AS requests_disputed,
  coalesce(sum(final_amount_cents) FILTER (WHERE status = 'completed'), 0)::bigint AS gmv_cents,
  (percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes_to_first_quote))::int AS median_minutes_to_first_quote
FROM reporting.requests
GROUP BY created_day;
--> statement-breakpoint
-- Economia por serviço concluído (sem identificar o profissional).
CREATE VIEW reporting.settlements AS
SELECT
  s.request_id,
  (s.created_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,
  c.slug AS category_slug,
  s.gross_cents,
  s.commission_bps,
  s.commission_cents,
  s.pro_net_cents,
  s.payment_mode,
  s.status::text AS status
FROM settlements s
JOIN service_requests r ON r.id = s.request_id
JOIN categories c ON c.id = r.category_id
WHERE r.is_demo = false;
--> statement-breakpoint
-- Funil de cadastro de profissionais (apenas contagens).
CREATE VIEW reporting.pro_pipeline AS
SELECT p.verification_status::text AS verification_status, count(*)::int AS pros
FROM pro_profiles p
JOIN users u ON u.id = p.user_id
WHERE u.is_demo = false AND u.status <> 'deleted'
GROUP BY p.verification_status;
--> statement-breakpoint
-- Chamados em aberto por categoria e prioridade (apenas contagens).
CREATE VIEW reporting.open_tickets AS
SELECT t.category::text AS category, t.priority::text AS priority, t.status::text AS status, count(*)::int AS tickets
FROM support_tickets t
WHERE t.status IN ('open', 'in_progress', 'waiting_user')
GROUP BY t.category, t.priority, t.status;
--> statement-breakpoint
-- Solicitações abertas há mais de 2 h sem proposta pendente (fila do concierge).
CREATE VIEW reporting.stale_open_requests AS
SELECT
  r.id,
  r.created_at,
  floor(extract(epoch FROM (now() - r.created_at)) / 60)::int AS minutes_open,
  r.category_slug,
  r.category_name,
  r.region_slug,
  r.region_name,
  r.urgency,
  r.invited_pros
FROM reporting.requests r
WHERE r.status = 'open'
  AND r.created_at <= now() - interval '2 hours'
  AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.request_id = r.id AND q.status = 'pending');
--> statement-breakpoint
-- Se o papel de relatórios já existir, ele passa a ler as views novas.
-- Toda migration futura que criar view em "reporting" deve terminar com este bloco.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'arrumae_reporting') THEN
    GRANT USAGE ON SCHEMA reporting TO arrumae_reporting;
    GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO arrumae_reporting;
  END IF;
END $$;
