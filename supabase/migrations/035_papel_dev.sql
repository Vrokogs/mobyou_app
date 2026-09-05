-- ============================================================================
-- MOBYOU APP - Papel "dev"
--
-- Conta separada para quem cuida do sistema: recebe os pedidos de recuperação
-- de senha e os feedbacks que chegam pela tela de login, e não enxerga o resto
-- do painel. Não é um gestor com poderes extras — é um papel próprio, com
-- acesso só à caixa de suporte.
--
-- RODE ESTE ARQUIVO SOZINHO, ANTES DO 036.
-- O Postgres não deixa usar um valor de enum na mesma transação em que ele foi
-- criado, e o editor do Supabase roda cada execução como uma transação. Se os
-- dois forem juntos, o 036 falha com "unsafe use of new value of enum type".
--
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dev';

-- Conferência: deve listar gestor, vendedor, tecnico, cliente e dev.
-- SELECT unnest(enum_range(NULL::user_role));
