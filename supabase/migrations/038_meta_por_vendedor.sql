-- ============================================================================
-- MOBYOU APP - A meta é por VENDEDOR, não por loja
--
-- A 037 criou meta_motos_loja entendendo que as 13 motos eram por unidade. São
-- por vendedor: cada um tem 13 no mês, e a meta da empresa é 13 vezes o número
-- de vendedores ativos.
--
-- O valor não muda (13); só o nome da coluna, que estava dizendo a coisa errada.
--
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'empresa_config' AND column_name = 'meta_motos_loja'
  ) THEN
    ALTER TABLE empresa_config RENAME COLUMN meta_motos_loja TO meta_motos_vendedor;
  END IF;
END $$;

-- Se a 037 não tiver rodado, cria já com o nome certo.
ALTER TABLE empresa_config
  ADD COLUMN IF NOT EXISTS meta_motos_vendedor INTEGER NOT NULL DEFAULT 13;

COMMENT ON COLUMN empresa_config.meta_motos_vendedor IS
  'Meta de motos vendidas por vendedor no mês. Padrão 13.';

-- Conferência (opcional):
-- SELECT nome, meta_motos_vendedor FROM empresa_config;
