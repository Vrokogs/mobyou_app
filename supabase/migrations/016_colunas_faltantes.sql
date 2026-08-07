-- ============================================================================
-- MOBYOU APP - Colunas faltantes (alinha o banco ao código existente)
-- Liga as telas de: oficina/diagnóstico técnico, financeiro, detalhe do cliente,
-- orçamentos, garantias, contratos e cadastro de usuários.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Scooters: quilometragem atual + estado operacional
ALTER TABLE scooters ADD COLUMN IF NOT EXISTS km_atual INTEGER DEFAULT 0;
ALTER TABLE scooters ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa';

-- Ordens de serviço: tipo do serviço + valor total (precificação)
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS valor_total NUMERIC(12,2) DEFAULT 0;

-- Diagnósticos: laudo do técnico
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS causa_raiz TEXT;
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS recomendacoes TEXT;
ALTER TABLE diagnosticos ADD COLUMN IF NOT EXISTS componentes_afetados TEXT[];

-- Orçamentos: observações
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Garantias: tipo de garantia
ALTER TABLE garantias ADD COLUMN IF NOT EXISTS tipo TEXT;

-- Contratos: número/identificador do contrato
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS numero TEXT;

-- Profiles: endereço (cidade/estado/cep) + unidade (loja) do colaborador
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unidade TEXT;
