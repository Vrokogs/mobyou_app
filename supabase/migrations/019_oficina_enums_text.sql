-- ============================================================================
-- MOBYOU APP - Alinha a oficina ao app: solta os enums restritos de check-in
-- e fotos para TEXT, permitindo os 24 itens granulares + classificações + tipos
-- de foto usados nas telas. (Diagnóstico e progresso já usam colunas TEXT.)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE checkin_items ALTER COLUMN item TYPE TEXT;
ALTER TABLE checkin_items ALTER COLUMN classificacao TYPE TEXT;
ALTER TABLE fotos_ordem   ALTER COLUMN tipo TYPE TEXT;
