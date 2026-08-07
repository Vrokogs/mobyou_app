-- ============================================================================
-- MOBYOU APP - Adiciona o valor 'avaria' ao enum foto_tipo
-- Usado na etapa de fotos de avarias (marcas, amassos, batidas, falta de material)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TYPE foto_tipo ADD VALUE IF NOT EXISTS 'avaria';
