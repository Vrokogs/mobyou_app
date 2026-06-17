-- ============================================================================
-- MOBYOU APP - Fixed Schema (compatible with Supabase SQL Editor)
-- Run this in: https://supabase.com/dashboard/project/gshikzdnvrlhqdqlplxg/sql/new
-- ============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('gestor','vendedor','tecnico','cliente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE garantia_status AS ENUM ('ativa','expirada','cancelada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ordem_status AS ENUM ('agendado','confirmado','recebido','checkin_realizado','em_analise','diagnostico_concluido','orcamento_enviado','aguardando_aprovacao','aprovado','aguardando_inicio','em_servico','testes_finais','finalizado','entregue','cancelado','nao_compareceu','remarcado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE checkin_item_tipo AS ENUM ('pneus','freios','suspensao','estrutura','painel','bateria','farois','motor','controladora'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE checkin_classificacao AS ENUM ('bom','regular','ruim'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE foto_tipo AS ENUM ('frente','traseira','lateral_direita','lateral_esquerda','painel','chassi','km','diagnostico','servico'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE orcamento_status AS ENUM ('rascunho','enviado','aprovado','rejeitado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE movimentacao_tipo AS ENUM ('entrada','saida','reserva'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE contrato_tipo AS ENUM ('compra_venda','garantia','entrega','desbloqueio','personalizado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE contrato_status AS ENUM ('rascunho','enviado','visualizado','assinado','cancelado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE nota_fiscal_tipo AS ENUM ('xml','pdf','imagem'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. UTILITY FUNCTION (updated_at only - others created after tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  cpf TEXT UNIQUE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  role user_role NOT NULL DEFAULT 'cliente',
  avatar_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scooters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  modelo TEXT NOT NULL,
  marca TEXT NOT NULL DEFAULT '',
  cor TEXT,
  ano INTEGER,
  numero_serie TEXT UNIQUE NOT NULL,
  chassi TEXT UNIQUE NOT NULL,
  data_compra DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS garantias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scooter_id UUID NOT NULL REFERENCES scooters(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  data_compra DATE,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status garantia_status NOT NULL DEFAULT 'ativa',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL NOT NULL,
  scooter_id UUID NOT NULL REFERENCES scooters(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  tecnico_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status ordem_status NOT NULL DEFAULT 'agendado',
  km_atual INTEGER,
  foto_km TEXT,
  data_agendamento TIMESTAMPTZ,
  data_recebimento TIMESTAMPTZ,
  data_finalizacao TIMESTAMPTZ,
  data_entrega TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checkin_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  item checkin_item_tipo NOT NULL,
  classificacao checkin_classificacao NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fotos_ordem (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo foto_tipo NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diagnosticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tecnico_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  problemas_encontrados TEXT,
  pecas_necessarias JSONB DEFAULT '[]'::jsonb,
  servicos_necessarios JSONB DEFAULT '[]'::jsonb,
  tempo_estimado INTERVAL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  criado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  pecas JSONB DEFAULT '[]'::jsonb,
  servicos JSONB DEFAULT '[]'::jsonb,
  mao_de_obra DECIMAL(12,2) NOT NULL DEFAULT 0,
  custos_adicionais DECIMAL(12,2) NOT NULL DEFAULT 0,
  prazo_estimado TEXT,
  valor_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status orcamento_status NOT NULL DEFAULT 'rascunho',
  aprovado_por UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_aprovacao TIMESTAMPTZ,
  data_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeline_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  foto_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo TEXT UNIQUE,
  quantidade INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER NOT NULL DEFAULT 0,
  preco_custo DECIMAL(12,2),
  preco_venda DECIMAL(12,2),
  categoria TEXT,
  unidade TEXT DEFAULT 'un',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estoque_id UUID NOT NULL REFERENCES estoque(id) ON DELETE RESTRICT,
  tipo movimentacao_tipo NOT NULL,
  quantidade INTEGER NOT NULL,
  ordem_id UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  motivo TEXT,
  responsavel_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo contrato_tipo NOT NULL,
  titulo TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scooter_id UUID REFERENCES scooters(id) ON DELETE SET NULL,
  conteudo TEXT,
  variaveis JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  status contrato_status NOT NULL DEFAULT 'rascunho',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modelos_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo contrato_tipo NOT NULL,
  titulo TEXT NOT NULL,
  conteudo_template TEXT NOT NULL,
  variaveis_disponiveis JSONB DEFAULT '[]'::jsonb,
  criado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  assinante_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assinatura_imagem TEXT,
  rubrica_imagem TEXT,
  nome_assinante TEXT NOT NULL,
  ip_address INET,
  navegador TEXT,
  sistema_operacional TEXT,
  localizacao TEXT,
  dispositivo TEXT,
  data_assinatura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID REFERENCES ordens_servico(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  scooter_id UUID REFERENCES scooters(id) ON DELETE RESTRICT,
  tecnico_id UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  servico_executado TEXT NOT NULL,
  data_servico DATE NOT NULL DEFAULT CURRENT_DATE,
  pdf_url TEXT,
  qr_code_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_arquivo nota_fiscal_tipo NOT NULL,
  arquivo_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  dados_extraidos JSONB DEFAULT '{}'::jsonb,
  importado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cliente_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scooter_id UUID REFERENCES scooters(id) ON DELETE SET NULL,
  valor DECIMAL(12,2),
  parcelas INTEGER,
  data_compra DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS km_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scooter_id UUID NOT NULL REFERENCES scooters(id) ON DELETE CASCADE,
  km INTEGER NOT NULL,
  foto_url TEXT,
  registrado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scooter_id UUID NOT NULL REFERENCES scooters(id) ON DELETE RESTRICT,
  nota_fiscal_id UUID REFERENCES notas_fiscais(id) ON DELETE SET NULL,
  valor_total DECIMAL(12,2) NOT NULL,
  entrada DECIMAL(12,2) DEFAULT 0,
  parcelas INTEGER DEFAULT 1,
  forma_pagamento TEXT NOT NULL,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  dados JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  assinatura_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3b. HELPER FUNCTIONS (after tables exist)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, ativo, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'cliente'),
    TRUE, NOW(), NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'gestor');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('gestor', 'tecnico', 'vendedor'));
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. TRIGGERS
DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_scooters ON scooters;
CREATE TRIGGER set_updated_at_scooters BEFORE UPDATE ON scooters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_garantias ON garantias;
CREATE TRIGGER set_updated_at_garantias BEFORE UPDATE ON garantias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_ordens_servico ON ordens_servico;
CREATE TRIGGER set_updated_at_ordens_servico BEFORE UPDATE ON ordens_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_orcamentos ON orcamentos;
CREATE TRIGGER set_updated_at_orcamentos BEFORE UPDATE ON orcamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_estoque ON estoque;
CREATE TRIGGER set_updated_at_estoque BEFORE UPDATE ON estoque FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_contratos ON contratos;
CREATE TRIGGER set_updated_at_contratos BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_modelos_contrato ON modelos_contrato;
CREATE TRIGGER set_updated_at_modelos_contrato BEFORE UPDATE ON modelos_contrato FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at_empresa_config ON empresa_config;
CREATE TRIGGER set_updated_at_empresa_config BEFORE UPDATE ON empresa_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON profiles(ativo);
CREATE INDEX IF NOT EXISTS idx_scooters_cliente_id ON scooters(cliente_id);
CREATE INDEX IF NOT EXISTS idx_scooters_chassi ON scooters(chassi);
CREATE INDEX IF NOT EXISTS idx_garantias_scooter_id ON garantias(scooter_id);
CREATE INDEX IF NOT EXISTS idx_garantias_cliente_id ON garantias(cliente_id);
CREATE INDEX IF NOT EXISTS idx_garantias_status ON garantias(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_numero ON ordens_servico(numero);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_scooter_id ON ordens_servico(scooter_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente_id ON ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tecnico_id ON ordens_servico(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_checkin_items_ordem_id ON checkin_items(ordem_id);
CREATE INDEX IF NOT EXISTS idx_fotos_ordem_ordem_id ON fotos_ordem(ordem_id);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_ordem_id ON diagnosticos(ordem_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_ordem_id ON orcamentos(ordem_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_timeline_eventos_ordem_id ON timeline_eventos(ordem_id);
CREATE INDEX IF NOT EXISTS idx_estoque_codigo ON estoque(codigo);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_contrato_id ON assinaturas(contrato_id);
CREATE INDEX IF NOT EXISTS idx_certificados_ordem_id ON certificados(ordem_id);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cliente_id ON notas_fiscais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_km_historico_scooter_id ON km_historico(scooter_id);
CREATE INDEX IF NOT EXISTS idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_vendas_vendedor_id ON vendas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);

-- 6. RLS - Enable on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scooters ENABLE ROW LEVEL SECURITY;
ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_ordem ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos_contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE km_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES (using public.is_gestor, public.is_staff, public.get_user_role)

-- profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_staff" ON profiles FOR SELECT USING (public.is_staff());
CREATE POLICY "profiles_insert_gestor" ON profiles FOR INSERT WITH CHECK (public.is_gestor());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_gestor" ON profiles FOR UPDATE USING (public.is_gestor());
CREATE POLICY "profiles_delete_gestor" ON profiles FOR DELETE USING (public.is_gestor());

-- scooters
CREATE POLICY "scooters_select_own" ON scooters FOR SELECT USING (cliente_id = auth.uid());
CREATE POLICY "scooters_select_staff" ON scooters FOR SELECT USING (public.is_staff());
CREATE POLICY "scooters_insert_staff" ON scooters FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "scooters_update_staff" ON scooters FOR UPDATE USING (public.is_staff());
CREATE POLICY "scooters_delete_gestor" ON scooters FOR DELETE USING (public.is_gestor());

-- garantias
CREATE POLICY "garantias_select_own" ON garantias FOR SELECT USING (cliente_id = auth.uid());
CREATE POLICY "garantias_select_staff" ON garantias FOR SELECT USING (public.is_staff());
CREATE POLICY "garantias_insert_staff" ON garantias FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "garantias_update_staff" ON garantias FOR UPDATE USING (public.is_staff());
CREATE POLICY "garantias_delete_gestor" ON garantias FOR DELETE USING (public.is_gestor());

-- ordens_servico
CREATE POLICY "ordens_select_own" ON ordens_servico FOR SELECT USING (cliente_id = auth.uid());
CREATE POLICY "ordens_select_tecnico" ON ordens_servico FOR SELECT USING (tecnico_id = auth.uid());
CREATE POLICY "ordens_select_staff" ON ordens_servico FOR SELECT USING (public.is_staff());
CREATE POLICY "ordens_insert_any" ON ordens_servico FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "ordens_update_staff" ON ordens_servico FOR UPDATE USING (public.is_staff());
CREATE POLICY "ordens_delete_gestor" ON ordens_servico FOR DELETE USING (public.is_gestor());

-- checkin_items
CREATE POLICY "checkin_select_staff" ON checkin_items FOR SELECT USING (public.is_staff());
CREATE POLICY "checkin_select_cliente" ON checkin_items FOR SELECT USING (EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = checkin_items.ordem_id AND os.cliente_id = auth.uid()));
CREATE POLICY "checkin_insert_staff" ON checkin_items FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "checkin_update_staff" ON checkin_items FOR UPDATE USING (public.is_staff());

-- fotos_ordem
CREATE POLICY "fotos_select_staff" ON fotos_ordem FOR SELECT USING (public.is_staff());
CREATE POLICY "fotos_select_cliente" ON fotos_ordem FOR SELECT USING (EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = fotos_ordem.ordem_id AND os.cliente_id = auth.uid()));
CREATE POLICY "fotos_insert_staff" ON fotos_ordem FOR INSERT WITH CHECK (public.is_staff());

-- diagnosticos
CREATE POLICY "diag_select_staff" ON diagnosticos FOR SELECT USING (public.is_staff());
CREATE POLICY "diag_select_cliente" ON diagnosticos FOR SELECT USING (EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = diagnosticos.ordem_id AND os.cliente_id = auth.uid()));
CREATE POLICY "diag_insert_tecnico" ON diagnosticos FOR INSERT WITH CHECK (public.get_user_role() IN ('gestor', 'tecnico'));
CREATE POLICY "diag_update_tecnico" ON diagnosticos FOR UPDATE USING (tecnico_id = auth.uid() OR public.is_gestor());

-- orcamentos
CREATE POLICY "orc_select_staff" ON orcamentos FOR SELECT USING (public.is_staff());
CREATE POLICY "orc_select_cliente" ON orcamentos FOR SELECT USING (EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = orcamentos.ordem_id AND os.cliente_id = auth.uid()));
CREATE POLICY "orc_insert_staff" ON orcamentos FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "orc_update_staff" ON orcamentos FOR UPDATE USING (public.is_staff());
CREATE POLICY "orc_update_cliente" ON orcamentos FOR UPDATE USING (EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = orcamentos.ordem_id AND os.cliente_id = auth.uid()));

-- timeline_eventos
CREATE POLICY "timeline_select_staff" ON timeline_eventos FOR SELECT USING (public.is_staff());
CREATE POLICY "timeline_select_cliente" ON timeline_eventos FOR SELECT USING (EXISTS (SELECT 1 FROM ordens_servico os WHERE os.id = timeline_eventos.ordem_id AND os.cliente_id = auth.uid()));
CREATE POLICY "timeline_insert_staff" ON timeline_eventos FOR INSERT WITH CHECK (public.is_staff());

-- estoque
CREATE POLICY "estoque_select_staff" ON estoque FOR SELECT USING (public.is_staff());
CREATE POLICY "estoque_insert_gestor" ON estoque FOR INSERT WITH CHECK (public.is_gestor());
CREATE POLICY "estoque_update_staff" ON estoque FOR UPDATE USING (public.is_staff());
CREATE POLICY "estoque_delete_gestor" ON estoque FOR DELETE USING (public.is_gestor());

-- estoque_movimentacoes
CREATE POLICY "est_mov_select_staff" ON estoque_movimentacoes FOR SELECT USING (public.is_staff());
CREATE POLICY "est_mov_insert_staff" ON estoque_movimentacoes FOR INSERT WITH CHECK (public.is_staff());

-- contratos
CREATE POLICY "contratos_select_own" ON contratos FOR SELECT USING (cliente_id = auth.uid());
CREATE POLICY "contratos_select_staff" ON contratos FOR SELECT USING (public.is_staff());
CREATE POLICY "contratos_insert_staff" ON contratos FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "contratos_update_staff" ON contratos FOR UPDATE USING (public.is_staff());

-- modelos_contrato
CREATE POLICY "modelos_select_staff" ON modelos_contrato FOR SELECT USING (public.is_staff());
CREATE POLICY "modelos_insert_gestor" ON modelos_contrato FOR INSERT WITH CHECK (public.is_gestor());
CREATE POLICY "modelos_update_gestor" ON modelos_contrato FOR UPDATE USING (public.is_gestor());

-- assinaturas
CREATE POLICY "assin_select_own" ON assinaturas FOR SELECT USING (assinante_id = auth.uid());
CREATE POLICY "assin_select_staff" ON assinaturas FOR SELECT USING (public.is_staff());
CREATE POLICY "assin_insert_own" ON assinaturas FOR INSERT WITH CHECK (assinante_id = auth.uid());
CREATE POLICY "assin_insert_staff" ON assinaturas FOR INSERT WITH CHECK (public.is_staff());

-- certificados
CREATE POLICY "cert_select_own" ON certificados FOR SELECT USING (cliente_id = auth.uid());
CREATE POLICY "cert_select_staff" ON certificados FOR SELECT USING (public.is_staff());
CREATE POLICY "cert_insert_staff" ON certificados FOR INSERT WITH CHECK (public.is_staff());

-- notas_fiscais
CREATE POLICY "nf_select_own" ON notas_fiscais FOR SELECT USING (cliente_id = auth.uid());
CREATE POLICY "nf_select_staff" ON notas_fiscais FOR SELECT USING (public.is_staff());
CREATE POLICY "nf_insert_staff" ON notas_fiscais FOR INSERT WITH CHECK (public.is_staff());

-- km_historico
CREATE POLICY "km_select_own" ON km_historico FOR SELECT USING (EXISTS (SELECT 1 FROM scooters s WHERE s.id = km_historico.scooter_id AND s.cliente_id = auth.uid()));
CREATE POLICY "km_select_staff" ON km_historico FOR SELECT USING (public.is_staff());
CREATE POLICY "km_insert_staff" ON km_historico FOR INSERT WITH CHECK (public.is_staff());

-- vendas
CREATE POLICY "vendas_select_own" ON vendas FOR SELECT USING (cliente_id = auth.uid() OR vendedor_id = auth.uid());
CREATE POLICY "vendas_select_staff" ON vendas FOR SELECT USING (public.is_staff());
CREATE POLICY "vendas_insert_vendedor" ON vendas FOR INSERT WITH CHECK (public.get_user_role() IN ('gestor', 'vendedor'));

-- notificacoes
CREATE POLICY "notif_select_own" ON notificacoes FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "notif_insert_staff" ON notificacoes FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "notif_update_own" ON notificacoes FOR UPDATE USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "notif_delete_own" ON notificacoes FOR DELETE USING (usuario_id = auth.uid());

-- empresa_config
CREATE POLICY "empresa_select_auth" ON empresa_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "empresa_insert_gestor" ON empresa_config FOR INSERT WITH CHECK (public.is_gestor());
CREATE POLICY "empresa_update_gestor" ON empresa_config FOR UPDATE USING (public.is_gestor());

-- 8. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE ordens_servico;
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- 9. GRANTS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Done!
