-- ============================================================================
-- MOBYOU APP - Adiciona o campo Chassi ao estoque de motos
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE estoque_motos ADD COLUMN IF NOT EXISTS chassi TEXT;
