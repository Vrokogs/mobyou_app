-- ============================================================================
-- MOBYOU APP - Agendamento por local + painel de atendimentos (pós-venda)
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

-- Local de atendimento escolhido pelo cliente
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS local_atendimento TEXT;
-- Pedido/relato geral do cliente
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS pedido_geral TEXT;
-- Contato informado (opcional; senão usa o telefone do cliente)
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS contato TEXT;
-- Status do fluxo de pós-venda (novo -> aguardando_contato -> agendado -> ...)
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS status_atendimento TEXT DEFAULT 'novo';

CREATE INDEX IF NOT EXISTS idx_os_local ON ordens_servico(local_atendimento);
CREATE INDEX IF NOT EXISTS idx_os_status_atend ON ordens_servico(status_atendimento);
