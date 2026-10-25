-- Papel SOMENTE LEITURA para relatórios (n8n, planilhas, Metabase...).
-- Enxerga apenas o schema "reporting" (views sem dados pessoais) e nunca as
-- tabelas originais. Execute UMA vez como dono do banco (ex.: usuário
-- "postgres" no Supabase) DEPOIS de rodar as migrations:
--
--   psql "$DATABASE_URL_DONO" -v senha="'uma-senha-forte-aqui'" -f scripts/sql/reporting-role.sql
--
-- Nunca coloque a senha real neste arquivo.

CREATE ROLE arrumae_reporting LOGIN PASSWORD :senha CONNECTION LIMIT 3;
ALTER ROLE arrumae_reporting SET statement_timeout = '15s';
ALTER ROLE arrumae_reporting SET default_transaction_read_only = on;

-- Sem acesso ao schema principal (tabelas com dados pessoais).
REVOKE ALL ON SCHEMA public FROM arrumae_reporting;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM arrumae_reporting;

-- Apenas leitura das views de relatório. Views criadas depois recebem a
-- permissão pela própria migration (bloco DO ... no fim de 0003_reporting_views.sql).
GRANT USAGE ON SCHEMA reporting TO arrumae_reporting;
GRANT SELECT ON ALL TABLES IN SCHEMA reporting TO arrumae_reporting;
