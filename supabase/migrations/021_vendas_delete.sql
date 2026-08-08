-- ============================================================================
-- MOBYOU APP - Permite apagar vendas (registradas por engano / duplicadas)
-- Gestor apaga qualquer venda; vendedor apaga as próprias.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

DROP POLICY IF EXISTS "vendas_delete_staff" ON vendas;
CREATE POLICY "vendas_delete_staff" ON vendas
  FOR DELETE USING (vendedor_id = auth.uid() OR public.is_gestor());
