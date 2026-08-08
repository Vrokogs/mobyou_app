-- ============================================================================
-- MOBYOU APP - Restaura colunas apagadas + policies de DELETE que faltavam
-- - vendas.unidade / vendas.modelo (apagadas por engano)
-- - permite remover foto da OS e refazer check-in (faltava policy de DELETE)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- 1) Recria as colunas removidas por engano
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS modelo TEXT;

-- 2) Policies de DELETE (staff) para a oficina
DROP POLICY IF EXISTS "fotos_delete_staff" ON fotos_ordem;
CREATE POLICY "fotos_delete_staff" ON fotos_ordem
  FOR DELETE USING (public.is_staff());

DROP POLICY IF EXISTS "checkin_delete_staff" ON checkin_items;
CREATE POLICY "checkin_delete_staff" ON checkin_items
  FOR DELETE USING (public.is_staff());
