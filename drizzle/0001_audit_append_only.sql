-- Registros de auditoria são append-only: bloqueia UPDATE e DELETE no banco,
-- inclusive para o próprio usuário da aplicação.
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
--> statement-breakpoint
-- Avaliações: nota e comentário nunca mudam depois de publicados (moderação só altera status/notas).
CREATE OR REPLACE FUNCTION reviews_block_content_change() RETURNS trigger AS $$
BEGIN
  IF NEW.rating IS DISTINCT FROM OLD.rating OR NEW.comment IS DISTINCT FROM OLD.comment
     OR NEW.pro_id IS DISTINCT FROM OLD.pro_id OR NEW.request_id IS DISTINCT FROM OLD.request_id THEN
    RAISE EXCEPTION 'review content is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER reviews_immutable_content BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION reviews_block_content_change();
