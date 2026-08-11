-- ============================================================================
-- MOBYOU APP - Revisão: valor (R$300) + obrigatoriedade da preventiva
-- 3 meses = sugestiva (não obrigatória); 6 meses e 1 ano = obrigatória.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE manutencoes_preventivas ADD COLUMN IF NOT EXISTS valor NUMERIC(10,2) DEFAULT 300;
ALTER TABLE manutencoes_preventivas ADD COLUMN IF NOT EXISTS obrigatoria BOOLEAN DEFAULT TRUE;
