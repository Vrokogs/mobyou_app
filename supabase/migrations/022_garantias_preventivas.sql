-- ============================================================================
-- MOBYOU APP - Garantias (modalidades) + Manutenções preventivas (a cada 60 dias)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Modalidade da garantia: '1_ano' | '6_meses' | '3_meses'
ALTER TABLE garantias ADD COLUMN IF NOT EXISTS modalidade TEXT DEFAULT '1_ano';

-- Manutenções preventivas (agenda a cada 60 dias a partir da venda/garantia)
CREATE TABLE IF NOT EXISTS manutencoes_preventivas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scooter_id UUID REFERENCES scooters(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  garantia_id UUID REFERENCES garantias(id) ON DELETE SET NULL,
  numero INTEGER NOT NULL DEFAULT 1,
  data_prevista DATE NOT NULL,
  gratuita BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pendente',  -- pendente | realizada | cancelada
  realizada_em DATE,
  ordem_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prev_scooter ON manutencoes_preventivas(scooter_id);
CREATE INDEX IF NOT EXISTS idx_prev_cliente ON manutencoes_preventivas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prev_data ON manutencoes_preventivas(data_prevista);

ALTER TABLE manutencoes_preventivas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prev_select_staff" ON manutencoes_preventivas;
CREATE POLICY "prev_select_staff" ON manutencoes_preventivas FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "prev_select_cliente" ON manutencoes_preventivas;
CREATE POLICY "prev_select_cliente" ON manutencoes_preventivas FOR SELECT USING (cliente_id = auth.uid());
DROP POLICY IF EXISTS "prev_insert_staff" ON manutencoes_preventivas;
CREATE POLICY "prev_insert_staff" ON manutencoes_preventivas FOR INSERT WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "prev_update_staff" ON manutencoes_preventivas;
CREATE POLICY "prev_update_staff" ON manutencoes_preventivas FOR UPDATE USING (public.is_staff());
DROP POLICY IF EXISTS "prev_delete_gestor" ON manutencoes_preventivas;
CREATE POLICY "prev_delete_gestor" ON manutencoes_preventivas FOR DELETE USING (public.is_gestor());
