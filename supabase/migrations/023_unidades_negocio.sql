-- ============================================================================
-- MOBYOU APP - Unidades de negócio (Varejo, Atacado, Peças, Oficina)
-- Dimensão NOVA (convive com as lojas físicas). Permite relatórios por unidade
-- de negócio e consolidado.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Venda de moto: varejo (consumidor) ou atacado (lojista/revenda)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS unidade_negocio TEXT DEFAULT 'varejo';

-- Peças de reposição: vendas de peças (unidade de negócio "Peças")
CREATE TABLE IF NOT EXISTS vendas_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  unidade TEXT,                 -- loja física
  vendedor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  forma_pagamento TEXT DEFAULT 'pix',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendas_un ON vendas(unidade_negocio);
CREATE INDEX IF NOT EXISTS idx_vendas_pecas_created ON vendas_pecas(created_at);

ALTER TABLE vendas_pecas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pecas_select_staff" ON vendas_pecas;
CREATE POLICY "pecas_select_staff" ON vendas_pecas FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "pecas_insert_staff" ON vendas_pecas;
CREATE POLICY "pecas_insert_staff" ON vendas_pecas FOR INSERT WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "pecas_update_staff" ON vendas_pecas;
CREATE POLICY "pecas_update_staff" ON vendas_pecas FOR UPDATE USING (public.is_staff());
DROP POLICY IF EXISTS "pecas_delete_staff" ON vendas_pecas;
CREATE POLICY "pecas_delete_staff" ON vendas_pecas FOR DELETE USING (vendedor_id = auth.uid() OR public.is_gestor());
