-- ============================================================================
-- MOBYOU APP - Ao inserir uma assinatura, marca o contrato como 'assinado'
-- Necessario porque o cliente nao tem permissao de UPDATE em contratos (RLS).
-- O trigger roda como SECURITY DEFINER e atualiza o status automaticamente,
-- refletindo no painel do gestor.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.marcar_contrato_assinado()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contratos
     SET status = 'assinado', updated_at = NOW()
   WHERE id = NEW.contrato_id
     AND status <> 'assinado';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_marcar_contrato_assinado ON assinaturas;
CREATE TRIGGER trg_marcar_contrato_assinado
AFTER INSERT ON assinaturas
FOR EACH ROW
EXECUTE FUNCTION public.marcar_contrato_assinado();
