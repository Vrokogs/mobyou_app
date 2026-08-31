-- ============================================================================
-- MOBYOU APP - 1ª revisão gratuita só a partir de 28/02/2026
--
-- Regra de preço, separada do corte de "cliente legado" (que trata de vendas
-- anteriores à entrada do sistema, sem contrato e sem agenda automática):
--   - venda ANTES de 28/02/2026  -> toda revisão é paga, sem gratuidade
--   - venda A PARTIR de 28/02/2026 -> a 1ª pode ser gratuita, conforme a modalidade
--     (3 meses e modelo Bibi seguem sempre pagos, por serem sugestivos)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Nenhuma revisão de venda anterior ao corte pode constar como gratuita.
UPDATE manutencoes_preventivas mp
   SET gratuita = FALSE,
       valor = COALESCE(NULLIF(mp.valor, 0), 300),
       updated_at = NOW()
  FROM scooters s
 WHERE mp.scooter_id = s.id
   AND s.data_compra IS NOT NULL
   AND s.data_compra < DATE '2026-02-28'
   AND mp.gratuita;

-- Conferência (opcional):
-- SELECT CASE WHEN s.data_compra < DATE '2026-02-28' THEN 'antes 28/02' ELSE 'a partir 28/02' END AS faixa,
--        mp.status, mp.gratuita, COUNT(*)
--   FROM manutencoes_preventivas mp JOIN scooters s ON s.id = mp.scooter_id
--  GROUP BY 1,2,3 ORDER BY 1,2;
