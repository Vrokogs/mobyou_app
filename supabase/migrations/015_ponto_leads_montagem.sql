-- ============================================================================
-- MOBYOU APP - Folha de ponto, Leads/Origem, Montagem + Origem em vendas
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) FOLHA DE PONTO (vendedores/staff)
--    Um registro por colaborador por dia. Atraso calculado a partir do horário
--    padrão de entrada (08:00, tolerância de 10 min) — gravado em atraso_minutos.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS folha_ponto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  entrada TIMESTAMPTZ,
  almoco_saida TIMESTAMPTZ,
  almoco_volta TIMESTAMPTZ,
  saida TIMESTAMPTZ,
  atraso_minutos INTEGER NOT NULL DEFAULT 0,
  justificativa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (colaborador_id, data)
);

CREATE INDEX IF NOT EXISTS idx_folha_ponto_colab ON folha_ponto(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_folha_ponto_data ON folha_ponto(data);

ALTER TABLE folha_ponto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ponto_select_own_or_gestor" ON folha_ponto;
CREATE POLICY "ponto_select_own_or_gestor" ON folha_ponto
  FOR SELECT USING (colaborador_id = auth.uid() OR public.is_gestor());

DROP POLICY IF EXISTS "ponto_insert_own_staff" ON folha_ponto;
CREATE POLICY "ponto_insert_own_staff" ON folha_ponto
  FOR INSERT WITH CHECK (colaborador_id = auth.uid() AND public.is_staff());

DROP POLICY IF EXISTS "ponto_update_own_or_gestor" ON folha_ponto;
CREATE POLICY "ponto_update_own_or_gestor" ON folha_ponto
  FOR UPDATE USING (colaborador_id = auth.uid() OR public.is_gestor());

-- ----------------------------------------------------------------------------
-- 2) LEADS + ORIGEM
--    Origem: Lead, Shopping (passeando), Anúncios, Rádio, Indicação, Outros.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  origem TEXT NOT NULL DEFAULT 'Outros',
  unidade TEXT,
  modelo_interesse TEXT,
  status TEXT NOT NULL DEFAULT 'novo',   -- novo | em_contato | convertido | perdido
  vendedor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_origem ON leads(origem);
CREATE INDEX IF NOT EXISTS idx_leads_vendedor ON leads(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select_staff" ON leads;
CREATE POLICY "leads_select_staff" ON leads FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "leads_insert_staff" ON leads;
CREATE POLICY "leads_insert_staff" ON leads FOR INSERT WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "leads_update_staff" ON leads;
CREATE POLICY "leads_update_staff" ON leads FOR UPDATE USING (public.is_staff());
DROP POLICY IF EXISTS "leads_delete_gestor" ON leads;
CREATE POLICY "leads_delete_gestor" ON leads FOR DELETE USING (public.is_gestor());

-- ----------------------------------------------------------------------------
-- 3) MONTAGENS (galpão / motos em caixa)
--    Serviço de montagem cobrado por hora (R$ 250/h por padrão) com prazo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS montagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT NOT NULL,
  unidade TEXT,
  chassi TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_agendada TIMESTAMPTZ,          -- dia + hora agendados
  prazo TIMESTAMPTZ,                  -- prazo de entrega da montagem
  horas NUMERIC(6,2) NOT NULL DEFAULT 0,
  valor_hora NUMERIC(10,2) NOT NULL DEFAULT 250,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'agendada',  -- agendada | em_montagem | concluida
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_montagens_unidade ON montagens(unidade);
CREATE INDEX IF NOT EXISTS idx_montagens_status ON montagens(status);

ALTER TABLE montagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "montagens_select_staff" ON montagens;
CREATE POLICY "montagens_select_staff" ON montagens FOR SELECT USING (public.is_staff());
DROP POLICY IF EXISTS "montagens_insert_staff" ON montagens;
CREATE POLICY "montagens_insert_staff" ON montagens FOR INSERT WITH CHECK (public.is_staff());
DROP POLICY IF EXISTS "montagens_update_staff" ON montagens;
CREATE POLICY "montagens_update_staff" ON montagens FOR UPDATE USING (public.is_staff());
DROP POLICY IF EXISTS "montagens_delete_gestor" ON montagens;
CREATE POLICY "montagens_delete_gestor" ON montagens FOR DELETE USING (public.is_gestor());

-- ----------------------------------------------------------------------------
-- 4) VENDAS: origem da venda + vínculo com lead
-- ----------------------------------------------------------------------------
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS origem TEXT;
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 5) ESTOQUE: coluna vendedor_id (quem vendeu a unidade marcada como Vendido)
-- ----------------------------------------------------------------------------
ALTER TABLE estoque_motos ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
