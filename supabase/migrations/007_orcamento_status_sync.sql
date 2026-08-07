-- ============================================================================
-- MOBYOU APP - Ao cliente aprovar/rejeitar o orcamento, sincroniza a OS e a timeline
-- Necessario porque o cliente NAO tem permissao de UPDATE em ordens_servico
-- nem INSERT em timeline_eventos (RLS so-staff). O cliente so pode dar UPDATE
-- no proprio orcamento (orc_update_cliente). O trigger (SECURITY DEFINER) faz o resto.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.orcamento_status_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'aprovado' THEN
      UPDATE ordens_servico
         SET status = 'aprovado', updated_at = NOW()
       WHERE id = NEW.ordem_id;
      INSERT INTO timeline_eventos (ordem_id, responsavel_id, tipo, titulo, descricao)
      VALUES (NEW.ordem_id, NEW.aprovado_por, 'aprovacao',
              'Orçamento Aprovado', 'Cliente aprovou o orçamento');
    ELSIF NEW.status = 'rejeitado' THEN
      INSERT INTO timeline_eventos (ordem_id, responsavel_id, tipo, titulo, descricao)
      VALUES (NEW.ordem_id, NEW.aprovado_por, 'rejeicao',
              'Orçamento Rejeitado', 'Cliente rejeitou o orçamento');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orcamento_status_sync ON orcamentos;
CREATE TRIGGER trg_orcamento_status_sync
AFTER UPDATE ON orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.orcamento_status_sync();
