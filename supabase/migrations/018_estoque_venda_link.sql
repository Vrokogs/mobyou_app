-- ============================================================================
-- MOBYOU APP - Integração Estoque <-> Venda
-- Liga a moto do estoque à venda registrada e guarda o chassi na venda,
-- permitindo casar a moto pelo chassi e contabilizar a venda sem duplicar.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Garante o chassi no estoque (idempotente)
ALTER TABLE estoque_motos ADD COLUMN IF NOT EXISTS chassi TEXT;

-- Vincula a moto do estoque à venda que a contabilizou (evita venda duplicada)
ALTER TABLE estoque_motos ADD COLUMN IF NOT EXISTS venda_id UUID REFERENCES vendas(id) ON DELETE SET NULL;

-- Chassi na venda (para casar com a moto do estoque)
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS chassi TEXT;

CREATE INDEX IF NOT EXISTS idx_estoque_motos_chassi ON estoque_motos(chassi);
CREATE INDEX IF NOT EXISTS idx_vendas_chassi ON vendas(chassi);
