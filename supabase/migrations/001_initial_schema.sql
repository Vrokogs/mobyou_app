-- ============================================================================
-- MOBYOU APP - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Description: Complete database schema for e-scooter management system
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM (
  'gestor',
  'vendedor',
  'tecnico',
  'cliente'
);

CREATE TYPE garantia_status AS ENUM (
  'ativa',
  'expirada',
  'cancelada'
);

CREATE TYPE ordem_status AS ENUM (
  'agendado',
  'confirmado',
  'recebido',
  'checkin_realizado',
  'em_analise',
  'diagnostico_concluido',
  'orcamento_enviado',
  'aguardando_aprovacao',
  'aprovado',
  'aguardando_inicio',
  'em_servico',
  'testes_finais',
  'finalizado',
  'entregue',
  'cancelado',
  'nao_compareceu',
  'remarcado'
);

CREATE TYPE checkin_item_tipo AS ENUM (
  'pneus',
  'freios',
  'suspensao',
  'estrutura',
  'painel',
  'bateria',
  'farois',
  'motor',
  'controladora'
);

CREATE TYPE checkin_classificacao AS ENUM (
  'bom',
  'regular',
  'ruim'
);

CREATE TYPE foto_tipo AS ENUM (
  'frente',
  'traseira',
  'lateral_direita',
  'lateral_esquerda',
  'painel',
  'chassi',
  'km',
  'diagnostico',
  'servico'
);

CREATE TYPE orcamento_status AS ENUM (
  'rascunho',
  'enviado',
  'aprovado',
  'rejeitado'
);

CREATE TYPE movimentacao_tipo AS ENUM (
  'entrada',
  'saida',
  'reserva'
);

CREATE TYPE contrato_tipo AS ENUM (
  'compra_venda',
  'garantia',
  'entrega',
  'desbloqueio',
  'personalizado'
);

CREATE TYPE contrato_status AS ENUM (
  'rascunho',
  'enviado',
  'visualizado',
  'assinado',
  'cancelado'
);

CREATE TYPE nota_fiscal_tipo AS ENUM (
  'xml',
  'pdf',
  'imagem'
);

-- ============================================================================
-- 2. UTILITY FUNCTIONS
-- ============================================================================

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a profile automatically when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, ativo, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'cliente'),
    TRUE,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL DEFAULT '',
  cpf         TEXT UNIQUE,
  telefone    TEXT,
  email       TEXT,
  endereco    TEXT,
  role        user_role NOT NULL DEFAULT 'cliente',
  avatar_url  TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';

-- --------------------------------------------------------------------------
-- scooters
-- --------------------------------------------------------------------------
CREATE TABLE scooters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  modelo       TEXT NOT NULL,
  marca        TEXT NOT NULL,
  cor          TEXT,
  ano          INTEGER,
  numero_serie TEXT UNIQUE NOT NULL,
  chassi       TEXT UNIQUE NOT NULL,
  data_compra  DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE scooters IS 'Registered e-scooters linked to client profiles';

-- --------------------------------------------------------------------------
-- garantias
-- --------------------------------------------------------------------------
CREATE TABLE garantias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scooter_id  UUID NOT NULL REFERENCES scooters(id) ON DELETE CASCADE,
  cliente_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  data_compra DATE,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  status      garantia_status NOT NULL DEFAULT 'ativa',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE garantias IS 'Warranty records for each scooter';

-- --------------------------------------------------------------------------
-- ordens_servico
-- --------------------------------------------------------------------------
CREATE TABLE ordens_servico (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero             SERIAL NOT NULL,
  scooter_id         UUID NOT NULL REFERENCES scooters(id) ON DELETE RESTRICT,
  cliente_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  tecnico_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status             ordem_status NOT NULL DEFAULT 'agendado',
  km_atual           INTEGER,
  foto_km            TEXT,
  data_agendamento   TIMESTAMPTZ,
  data_recebimento   TIMESTAMPTZ,
  data_finalizacao   TIMESTAMPTZ,
  data_entrega       TIMESTAMPTZ,
  observacoes        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ordens_servico IS 'Service orders with full lifecycle status tracking';

-- --------------------------------------------------------------------------
-- checkin_items
-- --------------------------------------------------------------------------
CREATE TABLE checkin_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id       UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  item           checkin_item_tipo NOT NULL,
  classificacao  checkin_classificacao NOT NULL,
  observacao     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE checkin_items IS 'Checklist items recorded during scooter check-in';

-- --------------------------------------------------------------------------
-- fotos_ordem
-- --------------------------------------------------------------------------
CREATE TABLE fotos_ordem (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id      UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo          foto_tipo NOT NULL,
  url           TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fotos_ordem IS 'Photos attached to service orders by type';

-- --------------------------------------------------------------------------
-- diagnosticos
-- --------------------------------------------------------------------------
CREATE TABLE diagnosticos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id               UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tecnico_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  problemas_encontrados  TEXT,
  pecas_necessarias      JSONB DEFAULT '[]'::jsonb,
  servicos_necessarios   JSONB DEFAULT '[]'::jsonb,
  tempo_estimado         INTERVAL,
  observacoes            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE diagnosticos IS 'Diagnostic reports created by technicians for service orders';

-- --------------------------------------------------------------------------
-- orcamentos
-- --------------------------------------------------------------------------
CREATE TABLE orcamentos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id          UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  criado_por        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  pecas             JSONB DEFAULT '[]'::jsonb,
  servicos          JSONB DEFAULT '[]'::jsonb,
  mao_de_obra       DECIMAL(12,2) NOT NULL DEFAULT 0,
  custos_adicionais DECIMAL(12,2) NOT NULL DEFAULT 0,
  prazo_estimado    TEXT,
  valor_total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  status            orcamento_status NOT NULL DEFAULT 'rascunho',
  aprovado_por      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_aprovacao    TIMESTAMPTZ,
  data_envio        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE orcamentos IS 'Cost estimates (quotes) for service orders';

-- --------------------------------------------------------------------------
-- timeline_eventos
-- --------------------------------------------------------------------------
CREATE TABLE timeline_eventos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id        UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  tipo            TEXT NOT NULL,
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  responsavel_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  foto_url        TEXT,
  video_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE timeline_eventos IS 'Timeline events tracking service order progress';

-- --------------------------------------------------------------------------
-- estoque
-- --------------------------------------------------------------------------
CREATE TABLE estoque (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  descricao         TEXT,
  codigo            TEXT UNIQUE,
  quantidade        INTEGER NOT NULL DEFAULT 0,
  quantidade_minima INTEGER NOT NULL DEFAULT 0,
  preco_custo       DECIMAL(12,2),
  preco_venda       DECIMAL(12,2),
  categoria         TEXT,
  unidade           TEXT DEFAULT 'un',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE estoque IS 'Inventory of parts and materials';

-- --------------------------------------------------------------------------
-- estoque_movimentacoes
-- --------------------------------------------------------------------------
CREATE TABLE estoque_movimentacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estoque_id      UUID NOT NULL REFERENCES estoque(id) ON DELETE RESTRICT,
  tipo            movimentacao_tipo NOT NULL,
  quantidade      INTEGER NOT NULL,
  ordem_id        UUID REFERENCES ordens_servico(id) ON DELETE SET NULL,
  motivo          TEXT,
  responsavel_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE estoque_movimentacoes IS 'Stock movement log (in/out/reserve)';

-- --------------------------------------------------------------------------
-- contratos
-- --------------------------------------------------------------------------
CREATE TABLE contratos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        contrato_tipo NOT NULL,
  titulo      TEXT NOT NULL,
  cliente_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scooter_id  UUID REFERENCES scooters(id) ON DELETE SET NULL,
  conteudo    TEXT,
  variaveis   JSONB DEFAULT '{}'::jsonb,
  pdf_url     TEXT,
  status      contrato_status NOT NULL DEFAULT 'rascunho',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE contratos IS 'Contracts (sales, warranty, delivery, unlock, custom)';

-- --------------------------------------------------------------------------
-- modelos_contrato
-- --------------------------------------------------------------------------
CREATE TABLE modelos_contrato (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                   contrato_tipo NOT NULL,
  titulo                 TEXT NOT NULL,
  conteudo_template      TEXT NOT NULL,
  variaveis_disponiveis  JSONB DEFAULT '[]'::jsonb,
  criado_por             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  ativo                  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE modelos_contrato IS 'Reusable contract templates';

-- --------------------------------------------------------------------------
-- assinaturas
-- --------------------------------------------------------------------------
CREATE TABLE assinaturas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id         UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  assinante_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assinatura_imagem   TEXT,
  rubrica_imagem      TEXT,
  nome_assinante      TEXT NOT NULL,
  ip_address          INET,
  navegador           TEXT,
  sistema_operacional TEXT,
  localizacao         TEXT,
  dispositivo         TEXT,
  data_assinatura     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assinaturas IS 'Digital signatures on contracts with audit trail';

-- --------------------------------------------------------------------------
-- certificados
-- --------------------------------------------------------------------------
CREATE TABLE certificados (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id          UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  cliente_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scooter_id        UUID NOT NULL REFERENCES scooters(id) ON DELETE RESTRICT,
  tecnico_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  servico_executado TEXT NOT NULL,
  data_servico      DATE NOT NULL,
  pdf_url           TEXT,
  qr_code_data      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE certificados IS 'Service certificates issued after completion';

-- --------------------------------------------------------------------------
-- notas_fiscais
-- --------------------------------------------------------------------------
CREATE TABLE notas_fiscais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_arquivo    nota_fiscal_tipo NOT NULL,
  arquivo_url     TEXT NOT NULL,
  storage_path    TEXT NOT NULL,
  dados_extraidos JSONB DEFAULT '{}'::jsonb,
  importado_por   UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cliente_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scooter_id      UUID REFERENCES scooters(id) ON DELETE SET NULL,
  valor           DECIMAL(12,2),
  parcelas        INTEGER,
  data_compra     DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notas_fiscais IS 'Uploaded invoices (XML, PDF, or image) with extracted data';

-- --------------------------------------------------------------------------
-- km_historico
-- --------------------------------------------------------------------------
CREATE TABLE km_historico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scooter_id      UUID NOT NULL REFERENCES scooters(id) ON DELETE CASCADE,
  km              INTEGER NOT NULL,
  foto_url        TEXT,
  registrado_por  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE km_historico IS 'Odometer history for each scooter';

-- --------------------------------------------------------------------------
-- vendas
-- --------------------------------------------------------------------------
CREATE TABLE vendas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  cliente_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scooter_id      UUID NOT NULL REFERENCES scooters(id) ON DELETE RESTRICT,
  nota_fiscal_id  UUID REFERENCES notas_fiscais(id) ON DELETE SET NULL,
  valor_total     DECIMAL(12,2) NOT NULL,
  entrada         DECIMAL(12,2) DEFAULT 0,
  parcelas        INTEGER DEFAULT 1,
  forma_pagamento TEXT NOT NULL,
  contrato_id     UUID REFERENCES contratos(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vendas IS 'Sales records linking seller, buyer, scooter, and financials';

-- --------------------------------------------------------------------------
-- notificacoes
-- --------------------------------------------------------------------------
CREATE TABLE notificacoes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  titulo      TEXT NOT NULL,
  mensagem    TEXT,
  lida        BOOLEAN NOT NULL DEFAULT FALSE,
  dados       JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notificacoes IS 'In-app notifications per user';

-- --------------------------------------------------------------------------
-- empresa_config
-- --------------------------------------------------------------------------
CREATE TABLE empresa_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  cnpj            TEXT,
  endereco        TEXT,
  telefone        TEXT,
  email           TEXT,
  logo_url        TEXT,
  assinatura_url  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE empresa_config IS 'Company-wide configuration (single row expected)';

-- ============================================================================
-- 4. TRIGGERS - auto-update updated_at
-- ============================================================================

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_scooters
  BEFORE UPDATE ON scooters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_garantias
  BEFORE UPDATE ON garantias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_ordens_servico
  BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_orcamentos
  BEFORE UPDATE ON orcamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_estoque
  BEFORE UPDATE ON estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_contratos
  BEFORE UPDATE ON contratos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_modelos_contrato
  BEFORE UPDATE ON modelos_contrato
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_empresa_config
  BEFORE UPDATE ON empresa_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: auto-create profile on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_cpf ON profiles(cpf);
CREATE INDEX idx_profiles_ativo ON profiles(ativo);
CREATE INDEX idx_profiles_created_by ON profiles(created_by);

-- scooters
CREATE INDEX idx_scooters_cliente_id ON scooters(cliente_id);
CREATE INDEX idx_scooters_numero_serie ON scooters(numero_serie);
CREATE INDEX idx_scooters_chassi ON scooters(chassi);

-- garantias
CREATE INDEX idx_garantias_scooter_id ON garantias(scooter_id);
CREATE INDEX idx_garantias_cliente_id ON garantias(cliente_id);
CREATE INDEX idx_garantias_status ON garantias(status);
CREATE INDEX idx_garantias_data_fim ON garantias(data_fim);

-- ordens_servico
CREATE INDEX idx_ordens_servico_numero ON ordens_servico(numero);
CREATE INDEX idx_ordens_servico_scooter_id ON ordens_servico(scooter_id);
CREATE INDEX idx_ordens_servico_cliente_id ON ordens_servico(cliente_id);
CREATE INDEX idx_ordens_servico_tecnico_id ON ordens_servico(tecnico_id);
CREATE INDEX idx_ordens_servico_status ON ordens_servico(status);
CREATE INDEX idx_ordens_servico_data_agendamento ON ordens_servico(data_agendamento);
CREATE INDEX idx_ordens_servico_created_at ON ordens_servico(created_at);

-- checkin_items
CREATE INDEX idx_checkin_items_ordem_id ON checkin_items(ordem_id);

-- fotos_ordem
CREATE INDEX idx_fotos_ordem_ordem_id ON fotos_ordem(ordem_id);
CREATE INDEX idx_fotos_ordem_tipo ON fotos_ordem(tipo);

-- diagnosticos
CREATE INDEX idx_diagnosticos_ordem_id ON diagnosticos(ordem_id);
CREATE INDEX idx_diagnosticos_tecnico_id ON diagnosticos(tecnico_id);

-- orcamentos
CREATE INDEX idx_orcamentos_ordem_id ON orcamentos(ordem_id);
CREATE INDEX idx_orcamentos_status ON orcamentos(status);
CREATE INDEX idx_orcamentos_criado_por ON orcamentos(criado_por);

-- timeline_eventos
CREATE INDEX idx_timeline_eventos_ordem_id ON timeline_eventos(ordem_id);
CREATE INDEX idx_timeline_eventos_created_at ON timeline_eventos(created_at);
CREATE INDEX idx_timeline_eventos_responsavel_id ON timeline_eventos(responsavel_id);

-- estoque
CREATE INDEX idx_estoque_codigo ON estoque(codigo);
CREATE INDEX idx_estoque_categoria ON estoque(categoria);
CREATE INDEX idx_estoque_quantidade ON estoque(quantidade);

-- estoque_movimentacoes
CREATE INDEX idx_estoque_mov_estoque_id ON estoque_movimentacoes(estoque_id);
CREATE INDEX idx_estoque_mov_ordem_id ON estoque_movimentacoes(ordem_id);
CREATE INDEX idx_estoque_mov_tipo ON estoque_movimentacoes(tipo);
CREATE INDEX idx_estoque_mov_responsavel_id ON estoque_movimentacoes(responsavel_id);
CREATE INDEX idx_estoque_mov_created_at ON estoque_movimentacoes(created_at);

-- contratos
CREATE INDEX idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX idx_contratos_scooter_id ON contratos(scooter_id);
CREATE INDEX idx_contratos_tipo ON contratos(tipo);
CREATE INDEX idx_contratos_status ON contratos(status);

-- modelos_contrato
CREATE INDEX idx_modelos_contrato_tipo ON modelos_contrato(tipo);
CREATE INDEX idx_modelos_contrato_ativo ON modelos_contrato(ativo);

-- assinaturas
CREATE INDEX idx_assinaturas_contrato_id ON assinaturas(contrato_id);
CREATE INDEX idx_assinaturas_assinante_id ON assinaturas(assinante_id);

-- certificados
CREATE INDEX idx_certificados_ordem_id ON certificados(ordem_id);
CREATE INDEX idx_certificados_cliente_id ON certificados(cliente_id);
CREATE INDEX idx_certificados_scooter_id ON certificados(scooter_id);

-- notas_fiscais
CREATE INDEX idx_notas_fiscais_importado_por ON notas_fiscais(importado_por);
CREATE INDEX idx_notas_fiscais_cliente_id ON notas_fiscais(cliente_id);
CREATE INDEX idx_notas_fiscais_scooter_id ON notas_fiscais(scooter_id);

-- km_historico
CREATE INDEX idx_km_historico_scooter_id ON km_historico(scooter_id);
CREATE INDEX idx_km_historico_created_at ON km_historico(created_at);

-- vendas
CREATE INDEX idx_vendas_vendedor_id ON vendas(vendedor_id);
CREATE INDEX idx_vendas_cliente_id ON vendas(cliente_id);
CREATE INDEX idx_vendas_scooter_id ON vendas(scooter_id);
CREATE INDEX idx_vendas_created_at ON vendas(created_at);

-- notificacoes
CREATE INDEX idx_notificacoes_usuario_id ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);
CREATE INDEX idx_notificacoes_created_at ON notificacoes(created_at);
CREATE INDEX idx_notificacoes_usuario_lida ON notificacoes(usuario_id, lida);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is gestor
CREATE OR REPLACE FUNCTION auth.is_gestor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'gestor'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is gestor or tecnico
CREATE OR REPLACE FUNCTION auth.is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('gestor', 'tecnico', 'vendedor')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles_select_staff"
  ON profiles FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "profiles_insert_gestor"
  ON profiles FOR INSERT
  WITH CHECK (auth.is_gestor());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_gestor"
  ON profiles FOR UPDATE
  USING (auth.is_gestor());

CREATE POLICY "profiles_delete_gestor"
  ON profiles FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- scooters
-- --------------------------------------------------------------------------
ALTER TABLE scooters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scooters_select_own"
  ON scooters FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "scooters_select_staff"
  ON scooters FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "scooters_insert_staff"
  ON scooters FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "scooters_update_staff"
  ON scooters FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "scooters_delete_gestor"
  ON scooters FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- garantias
-- --------------------------------------------------------------------------
ALTER TABLE garantias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "garantias_select_own"
  ON garantias FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "garantias_select_staff"
  ON garantias FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "garantias_insert_staff"
  ON garantias FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "garantias_update_staff"
  ON garantias FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "garantias_delete_gestor"
  ON garantias FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- ordens_servico
-- --------------------------------------------------------------------------
ALTER TABLE ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordens_select_own"
  ON ordens_servico FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "ordens_select_tecnico_assigned"
  ON ordens_servico FOR SELECT
  USING (tecnico_id = auth.uid());

CREATE POLICY "ordens_select_staff"
  ON ordens_servico FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "ordens_insert_staff"
  ON ordens_servico FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "ordens_update_staff"
  ON ordens_servico FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "ordens_delete_gestor"
  ON ordens_servico FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- checkin_items
-- --------------------------------------------------------------------------
ALTER TABLE checkin_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkin_select_staff"
  ON checkin_items FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "checkin_select_cliente"
  ON checkin_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = checkin_items.ordem_id AND os.cliente_id = auth.uid()
    )
  );

CREATE POLICY "checkin_insert_staff"
  ON checkin_items FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "checkin_update_staff"
  ON checkin_items FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "checkin_delete_gestor"
  ON checkin_items FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- fotos_ordem
-- --------------------------------------------------------------------------
ALTER TABLE fotos_ordem ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fotos_select_staff"
  ON fotos_ordem FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "fotos_select_cliente"
  ON fotos_ordem FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = fotos_ordem.ordem_id AND os.cliente_id = auth.uid()
    )
  );

CREATE POLICY "fotos_insert_staff"
  ON fotos_ordem FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "fotos_delete_gestor"
  ON fotos_ordem FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- diagnosticos
-- --------------------------------------------------------------------------
ALTER TABLE diagnosticos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnosticos_select_staff"
  ON diagnosticos FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "diagnosticos_select_cliente"
  ON diagnosticos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = diagnosticos.ordem_id AND os.cliente_id = auth.uid()
    )
  );

CREATE POLICY "diagnosticos_insert_tecnico"
  ON diagnosticos FOR INSERT
  WITH CHECK (
    auth.user_role() IN ('gestor', 'tecnico')
  );

CREATE POLICY "diagnosticos_update_tecnico"
  ON diagnosticos FOR UPDATE
  USING (
    tecnico_id = auth.uid() OR auth.is_gestor()
  );

CREATE POLICY "diagnosticos_delete_gestor"
  ON diagnosticos FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- orcamentos
-- --------------------------------------------------------------------------
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orcamentos_select_staff"
  ON orcamentos FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "orcamentos_select_cliente"
  ON orcamentos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = orcamentos.ordem_id AND os.cliente_id = auth.uid()
    )
  );

CREATE POLICY "orcamentos_insert_staff"
  ON orcamentos FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "orcamentos_update_staff"
  ON orcamentos FOR UPDATE
  USING (auth.is_staff());

-- Clients can approve/reject their own orcamentos
CREATE POLICY "orcamentos_update_cliente"
  ON orcamentos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = orcamentos.ordem_id AND os.cliente_id = auth.uid()
    )
  );

CREATE POLICY "orcamentos_delete_gestor"
  ON orcamentos FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- timeline_eventos
-- --------------------------------------------------------------------------
ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_select_staff"
  ON timeline_eventos FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "timeline_select_cliente"
  ON timeline_eventos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = timeline_eventos.ordem_id AND os.cliente_id = auth.uid()
    )
  );

CREATE POLICY "timeline_insert_staff"
  ON timeline_eventos FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "timeline_delete_gestor"
  ON timeline_eventos FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- estoque
-- --------------------------------------------------------------------------
ALTER TABLE estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_select_staff"
  ON estoque FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "estoque_insert_gestor"
  ON estoque FOR INSERT
  WITH CHECK (auth.is_gestor());

CREATE POLICY "estoque_update_staff"
  ON estoque FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "estoque_delete_gestor"
  ON estoque FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- estoque_movimentacoes
-- --------------------------------------------------------------------------
ALTER TABLE estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_mov_select_staff"
  ON estoque_movimentacoes FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "estoque_mov_insert_staff"
  ON estoque_movimentacoes FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "estoque_mov_delete_gestor"
  ON estoque_movimentacoes FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- contratos
-- --------------------------------------------------------------------------
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contratos_select_own"
  ON contratos FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "contratos_select_staff"
  ON contratos FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "contratos_insert_staff"
  ON contratos FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "contratos_update_staff"
  ON contratos FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "contratos_delete_gestor"
  ON contratos FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- modelos_contrato
-- --------------------------------------------------------------------------
ALTER TABLE modelos_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modelos_select_staff"
  ON modelos_contrato FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "modelos_insert_gestor"
  ON modelos_contrato FOR INSERT
  WITH CHECK (auth.is_gestor());

CREATE POLICY "modelos_update_gestor"
  ON modelos_contrato FOR UPDATE
  USING (auth.is_gestor());

CREATE POLICY "modelos_delete_gestor"
  ON modelos_contrato FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- assinaturas
-- --------------------------------------------------------------------------
ALTER TABLE assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assinaturas_select_own"
  ON assinaturas FOR SELECT
  USING (assinante_id = auth.uid());

CREATE POLICY "assinaturas_select_staff"
  ON assinaturas FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "assinaturas_insert_own"
  ON assinaturas FOR INSERT
  WITH CHECK (assinante_id = auth.uid());

CREATE POLICY "assinaturas_insert_staff"
  ON assinaturas FOR INSERT
  WITH CHECK (auth.is_staff());

-- --------------------------------------------------------------------------
-- certificados
-- --------------------------------------------------------------------------
ALTER TABLE certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificados_select_own"
  ON certificados FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "certificados_select_staff"
  ON certificados FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "certificados_insert_staff"
  ON certificados FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "certificados_delete_gestor"
  ON certificados FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- notas_fiscais
-- --------------------------------------------------------------------------
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notas_fiscais_select_own"
  ON notas_fiscais FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "notas_fiscais_select_staff"
  ON notas_fiscais FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "notas_fiscais_insert_staff"
  ON notas_fiscais FOR INSERT
  WITH CHECK (auth.is_staff());

CREATE POLICY "notas_fiscais_update_staff"
  ON notas_fiscais FOR UPDATE
  USING (auth.is_staff());

CREATE POLICY "notas_fiscais_delete_gestor"
  ON notas_fiscais FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- km_historico
-- --------------------------------------------------------------------------
ALTER TABLE km_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "km_historico_select_own"
  ON km_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scooters s
      WHERE s.id = km_historico.scooter_id AND s.cliente_id = auth.uid()
    )
  );

CREATE POLICY "km_historico_select_staff"
  ON km_historico FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "km_historico_insert_staff"
  ON km_historico FOR INSERT
  WITH CHECK (auth.is_staff());

-- --------------------------------------------------------------------------
-- vendas
-- --------------------------------------------------------------------------
ALTER TABLE vendas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vendas_select_own"
  ON vendas FOR SELECT
  USING (cliente_id = auth.uid() OR vendedor_id = auth.uid());

CREATE POLICY "vendas_select_staff"
  ON vendas FOR SELECT
  USING (auth.is_staff());

CREATE POLICY "vendas_insert_vendedor"
  ON vendas FOR INSERT
  WITH CHECK (
    auth.user_role() IN ('gestor', 'vendedor')
  );

CREATE POLICY "vendas_update_gestor"
  ON vendas FOR UPDATE
  USING (auth.is_gestor());

CREATE POLICY "vendas_delete_gestor"
  ON vendas FOR DELETE
  USING (auth.is_gestor());

-- --------------------------------------------------------------------------
-- notificacoes
-- --------------------------------------------------------------------------
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificacoes_select_own"
  ON notificacoes FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "notificacoes_insert_staff"
  ON notificacoes FOR INSERT
  WITH CHECK (auth.is_staff());

-- Allow system/service_role to insert notifications (handled by Supabase service role)
CREATE POLICY "notificacoes_insert_service"
  ON notificacoes FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "notificacoes_update_own"
  ON notificacoes FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "notificacoes_delete_own"
  ON notificacoes FOR DELETE
  USING (usuario_id = auth.uid());

-- --------------------------------------------------------------------------
-- empresa_config
-- --------------------------------------------------------------------------
ALTER TABLE empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_config_select_authenticated"
  ON empresa_config FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "empresa_config_insert_gestor"
  ON empresa_config FOR INSERT
  WITH CHECK (auth.is_gestor());

CREATE POLICY "empresa_config_update_gestor"
  ON empresa_config FOR UPDATE
  USING (auth.is_gestor());

-- ============================================================================
-- 7. REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE ordens_servico;
ALTER PUBLICATION supabase_realtime ADD TABLE timeline_eventos;
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;

-- ============================================================================
-- 8. GRANTS (for authenticated users via PostgREST)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- End of migration
-- ============================================================================
