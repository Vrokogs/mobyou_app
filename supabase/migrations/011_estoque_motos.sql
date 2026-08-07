-- ============================================================================
-- MOBYOU APP - Estoque de motos por unidade (loja)
-- Gestores e vendedores veem todo o estoque; gestor gerencia.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE TABLE IF NOT EXISTS estoque_motos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade TEXT NOT NULL,
  modelo TEXT NOT NULL,
  cor TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  quantidade_montar INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'Disponível',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estoque_motos_unidade ON estoque_motos(unidade);

ALTER TABLE estoque_motos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_motos_select_staff" ON estoque_motos;
CREATE POLICY "estoque_motos_select_staff" ON estoque_motos
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "estoque_motos_insert_staff" ON estoque_motos;
CREATE POLICY "estoque_motos_insert_staff" ON estoque_motos
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "estoque_motos_update_staff" ON estoque_motos;
CREATE POLICY "estoque_motos_update_staff" ON estoque_motos
  FOR UPDATE USING (public.is_staff());

DROP POLICY IF EXISTS "estoque_motos_delete_gestor" ON estoque_motos;
CREATE POLICY "estoque_motos_delete_gestor" ON estoque_motos
  FOR DELETE USING (public.is_gestor());
