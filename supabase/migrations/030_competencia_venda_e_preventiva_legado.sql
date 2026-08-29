-- ============================================================================
-- MOBYOU APP - Competência da venda + limpeza da preventiva dos clientes antigos
--
-- 1) vendas.data_venda: a data REAL da venda, separada de created_at (que é a
--    data do cadastro). Sem isso, uma nota antiga importada hoje entra no
--    ranking do mês atual e infla o resultado da loja.
-- 2) Preventivas de motos legadas deixam de constar como gratuitas ou
--    obrigatórias — cliente anterior ao corte não tem 1ª grátis nem obrigação.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Competência da venda
-- ---------------------------------------------------------------------------
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS data_venda DATE;
COMMENT ON COLUMN vendas.data_venda IS
  'Data real da venda (competência). created_at é a data do cadastro no sistema.';

-- Backfill: usa a data de compra da moto; se faltar, a da nota; por último o cadastro.
UPDATE vendas v
   SET data_venda = COALESCE(
         (SELECT s.data_compra FROM scooters s WHERE s.id = v.scooter_id),
         (SELECT nf.data_compra FROM notas_fiscais nf WHERE nf.id = v.nota_fiscal_id),
         v.created_at::date
       )
 WHERE v.data_venda IS NULL;

-- Toda venda nova sem data explícita cai no dia do cadastro.
ALTER TABLE vendas ALTER COLUMN data_venda SET DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_vendas_data_venda ON vendas(data_venda);

-- ---------------------------------------------------------------------------
-- 2. Preventiva dos clientes antigos: sem gratuidade e sem obrigatoriedade
-- ---------------------------------------------------------------------------
UPDATE manutencoes_preventivas mp
   SET gratuita = FALSE,
       obrigatoria = FALSE,
       updated_at = NOW()
  FROM scooters s
 WHERE mp.scooter_id = s.id
   AND (s.legado OR (s.data_compra IS NOT NULL AND s.data_compra < DATE '2026-08-20'))
   AND (mp.gratuita OR mp.obrigatoria);

-- Conferência (opcional):
-- SELECT date_trunc('month', data_venda) AS mes, COUNT(*), SUM(valor_total)
--   FROM vendas GROUP BY 1 ORDER BY 1;
-- SELECT s.legado, mp.gratuita, mp.obrigatoria, COUNT(*)
--   FROM manutencoes_preventivas mp JOIN scooters s ON s.id = mp.scooter_id
--  GROUP BY 1,2,3;
