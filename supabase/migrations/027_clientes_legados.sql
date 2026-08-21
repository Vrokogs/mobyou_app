-- ============================================================================
-- MOBYOU APP - Clientes legados (compra anterior a 20/08/2026)
-- Quem comprou antes do sistema entrar no ar:
--   - não recebe aviso para assinar contrato (nem bloqueio de agendamento)
--   - não tem manutenção preventiva gratuita nem agenda/avisos de revisão
--   - continua com acesso normal ao app para agendar suas manutenções
-- Vendas a partir de 20/08/2026 seguem as regras normais.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Revisões já agendadas para motos legadas: canceladas (histórico preservado;
-- as já realizadas não são alteradas).
UPDATE manutencoes_preventivas mp
SET status = 'cancelada',
    observacoes = COALESCE(mp.observacoes || ' | ', '') ||
                  'Cancelada: cliente legado (compra anterior a 20/08/2026)',
    updated_at = NOW()
FROM scooters s
WHERE mp.scooter_id = s.id
  AND s.data_compra IS NOT NULL
  AND s.data_compra < DATE '2026-08-20'
  AND mp.status = 'pendente';

-- Contratos pendentes de motos legadas: cancelados, para não cobrar assinatura.
-- Contratos já assinados permanecem intactos.
UPDATE contratos c
SET status = 'cancelado',
    updated_at = NOW()
FROM scooters s
WHERE c.scooter_id = s.id
  AND s.data_compra IS NOT NULL
  AND s.data_compra < DATE '2026-08-20'
  AND c.status IN ('rascunho', 'enviado', 'visualizado');

-- Conferência (opcional): motos legadas e o que sobrou pendente para elas.
-- SELECT s.id, s.modelo, s.chassi, s.data_compra,
--        (SELECT COUNT(*) FROM manutencoes_preventivas mp
--          WHERE mp.scooter_id = s.id AND mp.status = 'pendente') AS revisoes_pendentes,
--        (SELECT COUNT(*) FROM contratos c
--          WHERE c.scooter_id = s.id AND c.status IN ('rascunho','enviado','visualizado')) AS contratos_pendentes
--   FROM scooters s
--  WHERE s.data_compra < DATE '2026-08-20'
--  ORDER BY s.data_compra;
