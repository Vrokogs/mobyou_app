-- ============================================================================
-- MOBYOU APP - Policies de Storage para upload de arquivos
-- Permite leitura pública e escrita por usuários autenticados nos buckets
-- 'documentos' (NF/PDFs) e 'fotos' (fotos da OS).
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

DO $$
BEGIN
  -- DOCUMENTOS
  DROP POLICY IF EXISTS "documentos_read" ON storage.objects;
  CREATE POLICY "documentos_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'documentos');

  DROP POLICY IF EXISTS "documentos_insert" ON storage.objects;
  CREATE POLICY "documentos_insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos');

  DROP POLICY IF EXISTS "documentos_update" ON storage.objects;
  CREATE POLICY "documentos_update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'documentos');

  -- FOTOS
  DROP POLICY IF EXISTS "fotos_read" ON storage.objects;
  CREATE POLICY "fotos_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'fotos');

  DROP POLICY IF EXISTS "fotos_insert" ON storage.objects;
  CREATE POLICY "fotos_insert" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos');

  DROP POLICY IF EXISTS "fotos_update" ON storage.objects;
  CREATE POLICY "fotos_update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'fotos');
END $$;
