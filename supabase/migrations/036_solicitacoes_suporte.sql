-- ============================================================================
-- MOBYOU APP - Caixa de suporte
--
-- "Fale com o administrador", na tela de login, mandava para o WhatsApp: o
-- pedido saía do sistema e não ficava registro nenhum. Quem esqueceu a senha ou
-- quer relatar um erro agora preenche um formulário, e o chamado cai aqui.
--
-- Quem grava é a rota /api/suporte, com a service-role, porque o formulário
-- fica numa página pública — quem preenche não está logado. Por isso NÃO existe
-- policy de INSERT: nada entra direto do navegador, só pela rota, que tem
-- limite por IP. Ler e responder é exclusividade do papel "dev".
--
-- RODE O 035 ANTES DESTE.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE TABLE IF NOT EXISTS solicitacoes_suporte (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- senha | acesso | erro | sugestao | outro
  tipo          TEXT NOT NULL DEFAULT 'outro',
  nome          TEXT NOT NULL,
  email         TEXT,
  telefone      TEXT,
  mensagem      TEXT NOT NULL,
  -- aberto | em_andamento | resolvido
  status        TEXT NOT NULL DEFAULT 'aberto',
  -- Anotação de quem atendeu. Fica só no painel, não volta para quem escreveu.
  anotacao      TEXT,
  -- Conta logada quando o chamado veio de dentro do painel; nulo na tela de login.
  autor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolvido_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolvido_em  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE solicitacoes_suporte IS
  'Pedidos de ajuda e feedbacks. Chegam pela tela de login (anônimos) ou de dentro do painel.';

CREATE INDEX IF NOT EXISTS idx_suporte_status ON solicitacoes_suporte(status);
CREATE INDEX IF NOT EXISTS idx_suporte_created ON solicitacoes_suporte(created_at DESC);

-- Só o dev lê e responde ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_dev()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dev'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE solicitacoes_suporte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suporte_select_dev" ON solicitacoes_suporte;
CREATE POLICY "suporte_select_dev" ON solicitacoes_suporte
  FOR SELECT USING (public.is_dev());

DROP POLICY IF EXISTS "suporte_update_dev" ON solicitacoes_suporte;
CREATE POLICY "suporte_update_dev" ON solicitacoes_suporte
  FOR UPDATE USING (public.is_dev()) WITH CHECK (public.is_dev());

DROP POLICY IF EXISTS "suporte_delete_dev" ON solicitacoes_suporte;
CREATE POLICY "suporte_delete_dev" ON solicitacoes_suporte
  FOR DELETE USING (public.is_dev());

-- O dev precisa ler profiles para mostrar quem abriu o chamado e quem atendeu.
-- is_staff() não cobre 'dev', então vai uma policy própria.
DROP POLICY IF EXISTS "profiles_select_dev" ON profiles;
CREATE POLICY "profiles_select_dev" ON profiles
  FOR SELECT USING (public.is_dev());

-- Conferência (opcional):
-- SELECT polname, polcmd FROM pg_policy
--   WHERE polrelid = 'public.solicitacoes_suporte'::regclass ORDER BY polname;
