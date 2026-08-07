-- ============================================================================
-- MOBYOU APP - Campos de evidência jurídica na assinatura
-- cpf do assinante, hash do documento (integridade) e texto de consentimento.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS documento_hash TEXT;
ALTER TABLE assinaturas ADD COLUMN IF NOT EXISTS consentimento TEXT;
