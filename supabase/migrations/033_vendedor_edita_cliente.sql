-- ============================================================================
-- MOBYOU APP - Vendedor edita o cadastro do cliente
--
-- Até aqui só o gestor tinha UPDATE em profiles, então o vendedor via o botão
-- (ou não via) e a alteração era recusada. Agora o vendedor edita, mas apenas
-- perfis de CLIENTE — e não consegue mudar o papel de ninguém:
--   USING       -> a linha existente precisa ser de um cliente
--   WITH CHECK  -> a linha resultante também precisa ser de um cliente
-- Assim um vendedor não edita gestor/técnico nem se promove.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_gestor_ou_vendedor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = auth.uid() AND role IN ('gestor', 'vendedor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "profiles_update_cliente_staff" ON profiles;
CREATE POLICY "profiles_update_cliente_staff" ON profiles
  FOR UPDATE
  USING (public.is_gestor_ou_vendedor() AND profiles.role = 'cliente')
  WITH CHECK (profiles.role = 'cliente');

-- Conferência (opcional):
-- SELECT polname, polcmd FROM pg_policy
--   WHERE polrelid = 'public.profiles'::regclass ORDER BY polname;
