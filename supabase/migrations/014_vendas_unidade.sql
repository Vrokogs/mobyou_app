-- ============================================================================
-- MOBYOU APP - Vendas por loja (unidade) + modelo
-- Permite registrar a venda informando a loja e o modelo, e relatórios por loja.
-- cliente_id e scooter_id passam a ser opcionais (registro simples de venda).
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE vendas ADD COLUMN IF NOT EXISTS unidade TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS modelo TEXT;

ALTER TABLE vendas ALTER COLUMN scooter_id DROP NOT NULL;
ALTER TABLE vendas ALTER COLUMN cliente_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_unidade ON vendas(unidade);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON vendas(created_at);
