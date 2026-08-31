-- ============================================================================
-- MOBYOU APP - Corrige a data do corte da 1ª revisão gratuita
--
-- A 031 usou 28/02/2026 por engano. A data correta é 20/08/2026:
--   - venda ANTES de 20/08/2026     -> toda revisão é paga, sem gratuidade
--   - venda A PARTIR de 20/08/2026  -> a 1ª pode ser gratuita, conforme a modalidade
--     (3 meses e modelo Bibi seguem sempre pagos, por serem sugestivos)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

UPDATE manutencoes_preventivas mp
   SET gratuita = FALSE,
       valor = COALESCE(NULLIF(mp.valor, 0), 300),
       updated_at = NOW()
  FROM scooters s
 WHERE mp.scooter_id = s.id
   AND s.data_compra IS NOT NULL
   AND s.data_compra < DATE '2026-08-20'
   AND mp.gratuita;

-- Conferência (opcional):
-- SELECT CASE WHEN s.data_compra < DATE '2026-08-20' THEN 'antes 20/08' ELSE 'a partir 20/08' END AS faixa,
--        mp.status, mp.gratuita, COUNT(*)
--   FROM manutencoes_preventivas mp JOIN scooters s ON s.id = mp.scooter_id
--  GROUP BY 1,2,3 ORDER BY 1,2;
