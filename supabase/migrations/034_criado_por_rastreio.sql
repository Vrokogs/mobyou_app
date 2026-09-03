-- ============================================================================
-- MOBYOU APP - Quem cadastrou cada registro
--
-- Não havia como responder "quem subiu essa moto no sistema": scooters,
-- garantias e contratos só guardavam a data. O único nome era vendas.vendedor_id,
-- que é quem VENDEU — não quem digitou, e os dois divergem quando o operador
-- escolhe outro vendedor no formulário.
--
-- criado_por passa a registrar a conta que efetivamente lançou o registro.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE scooters   ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE garantias  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE contratos  ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE vendas     ADD COLUMN IF NOT EXISTS criado_por UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN scooters.criado_por IS 'Conta que cadastrou a moto no sistema.';
COMMENT ON COLUMN vendas.criado_por   IS 'Quem lançou a venda. Diferente de vendedor_id, que é a quem ela é creditada.';

CREATE INDEX IF NOT EXISTS idx_scooters_criado_por ON scooters(criado_por);
CREATE INDEX IF NOT EXISTS idx_vendas_criado_por   ON vendas(criado_por);

-- Backfill possível: para o que veio de importação de nota, quem importou está
-- registrado em notas_fiscais.importado_por.
UPDATE scooters s
   SET criado_por = nf.importado_por
  FROM notas_fiscais nf
 WHERE nf.scooter_id = s.id
   AND s.criado_por IS NULL
   AND nf.importado_por IS NOT NULL;

UPDATE vendas v
   SET criado_por = nf.importado_por
  FROM notas_fiscais nf
 WHERE v.nota_fiscal_id = nf.id
   AND v.criado_por IS NULL
   AND nf.importado_por IS NOT NULL;

-- Conferência (opcional):
-- SELECT p.nome, COUNT(*) FROM scooters s
--   LEFT JOIN profiles p ON p.id = s.criado_por GROUP BY p.nome ORDER BY 2 DESC;
