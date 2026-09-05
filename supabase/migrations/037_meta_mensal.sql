-- ============================================================================
-- MOBYOU APP - Meta mensal por loja
--
-- A meta é de MOTOS VENDIDAS por loja no mês, não de faturamento: 13 por loja.
-- Com as três unidades, a meta da empresa é 39 no mês.
--
-- O valor mora em empresa_config, que já existe e já tem as policies certas:
-- todo mundo lê, só o gestor altera. Fica configurável porque meta muda — se
-- fosse constante no código, mudar exigiria um deploy.
--
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE empresa_config
  ADD COLUMN IF NOT EXISTS meta_motos_loja INTEGER NOT NULL DEFAULT 13;

COMMENT ON COLUMN empresa_config.meta_motos_loja IS
  'Meta de motos vendidas por loja no mês. Padrão 13.';

-- Conferência (opcional):
-- SELECT nome, meta_motos_loja FROM empresa_config;

-- ----------------------------------------------------------------------------
-- Realtime na tabela de vendas
--
-- O ranking se inscreve nas mudanças de "vendas" para atualizar sozinho a cada
-- lançamento. O Supabase só emite esses eventos para tabelas que estão na
-- publicação supabase_realtime — sem esta linha a inscrição conecta e nunca
-- recebe nada, falhando em silêncio.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE vendas;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- já estava na publicação
END $$;

-- Conferência (opcional):
-- SELECT tablename FROM pg_publication_tables
--   WHERE pubname = 'supabase_realtime' AND tablename = 'vendas';
