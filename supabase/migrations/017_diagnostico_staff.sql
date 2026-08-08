-- ============================================================================
-- MOBYOU APP - Permite que vendedores habilitados à manutenção criem/editem
-- diagnósticos (ex.: Julia). Amplia a política de gestor/técnico para staff.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

DROP POLICY IF EXISTS "diag_insert_tecnico" ON diagnosticos;
CREATE POLICY "diag_insert_staff" ON diagnosticos
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "diag_update_tecnico" ON diagnosticos;
CREATE POLICY "diag_update_staff" ON diagnosticos
  FOR UPDATE USING (public.is_staff());
