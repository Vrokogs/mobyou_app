-- ============================================================================
-- MOBYOU APP - Marcador explícito de cliente legado + assinatura presencial
--
-- Complementa a 027. Motivo: as motos importadas em 20/08/2026 ficaram com
-- data_compra = data da importação (padrão do formulário), então caíram do lado
-- "novo" do corte mesmo sendo clientes antigos. Em vez de inventar uma data de
-- compra, marcamos a moto como legada explicitamente.
--
-- Regra final: tudo que já estava no sistema é cliente antigo (sem contrato para
-- assinar, sem revisões e sem preventiva gratuita). Só as vendas registradas a
-- partir de agora mantêm os benefícios normais.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Marcador de moto/venda legada, independente da data de compra registrada.
ALTER TABLE scooters ADD COLUMN IF NOT EXISTS legado BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN scooters.legado IS
  'Venda anterior ao sistema: sem contrato para assinar, sem revisões e sem preventiva gratuita.';

-- Contrato cuja assinatura foi colhida em papel, presencialmente.
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS assinado_presencial BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN contratos.assinado_presencial IS
  'Assinado de forma presencial (em papel). Não há assinatura eletrônica registrada em assinaturas.';

-- ---------------------------------------------------------------------------
-- Todas as motos já cadastradas (registradas até 20/08/2026) são de clientes
-- antigos. A partir de 21/08/2026 valem as regras normais.
-- ---------------------------------------------------------------------------
UPDATE scooters
   SET legado = TRUE,
       updated_at = NOW()
 WHERE created_at < DATE '2026-08-21'
   AND legado = FALSE;

-- Revisões ainda pendentes dessas motos: canceladas (histórico preservado).
UPDATE manutencoes_preventivas mp
   SET status = 'cancelada',
       observacoes = COALESCE(mp.observacoes || ' | ', '') ||
                     'Cancelada: cliente antigo (venda anterior ao sistema)',
       updated_at = NOW()
  FROM scooters s
 WHERE mp.scooter_id = s.id
   AND s.legado
   AND mp.status = 'pendente';

-- Contratos ainda pendentes dessas motos: já foram assinados em papel.
-- Ficam como assinados, com o aviso de que a assinatura foi presencial.
UPDATE contratos c
   SET status = 'assinado',
       assinado_presencial = TRUE,
       updated_at = NOW()
  FROM scooters s
 WHERE c.scooter_id = s.id
   AND s.legado
   AND c.status IN ('rascunho', 'enviado', 'visualizado');

-- Conferência (opcional):
-- SELECT s.legado, COUNT(*) FROM scooters s GROUP BY s.legado;
-- SELECT c.status, c.assinado_presencial, COUNT(*) FROM contratos c
--   GROUP BY c.status, c.assinado_presencial ORDER BY 1;
-- SELECT mp.status, COUNT(*) FROM manutencoes_preventivas mp GROUP BY mp.status;
