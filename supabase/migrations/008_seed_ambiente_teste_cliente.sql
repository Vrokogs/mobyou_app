-- ============================================================================
-- MOBYOU APP - Ambiente de teste do CLIENTE (tudo vinculado)
-- - Define a senha do cliente (CPF 444.444.444-44) para login
-- - Garante a scooter vinculada
-- - Gera os 3 documentos (contrato + 2 termos) com dados preenchidos -> status 'enviado'
-- - Cria 1 OS com orçamento 'enviado' para testar aprovação + timeline
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- Idempotente. SENHA definida: cliente123
-- ============================================================================

DO $$
DECLARE
  v_cliente_id  UUID;
  v_gestor_id   UUID;
  v_scooter_id  UUID;
  v_ordem_id    UUID;
  v_nome        TEXT;
  v_cpf         TEXT;
  v_tel         TEXT;
  v_email       TEXT;
  v_end         TEXT;
  v_data_ext    TEXT := to_char(CURRENT_DATE, 'DD/MM/YYYY');
  m             RECORD;
  v_conteudo    TEXT;
BEGIN
  -- Cliente (por CPF)
  SELECT id, nome, cpf, telefone, email, endereco
    INTO v_cliente_id, v_nome, v_cpf, v_tel, v_email, v_end
  FROM profiles
  WHERE regexp_replace(COALESCE(cpf,''), '\D', '', 'g') = '44444444444'
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'Cliente CPF 444.444.444-44 nao encontrado. Abortando.';
    RETURN;
  END IF;

  SELECT id INTO v_gestor_id FROM profiles WHERE role = 'gestor' ORDER BY created_at LIMIT 1;

  -- 1) Senha de login do cliente (precisa do pgcrypto, ja habilitado no Supabase)
  UPDATE auth.users
     SET encrypted_password = crypt('cliente123', gen_salt('bf')),
         email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
         updated_at = NOW()
   WHERE id = v_cliente_id;
  RAISE NOTICE 'Senha definida (cliente123) para o usuario %', v_email;

  -- 2) Scooter (garante uma vinculada)
  SELECT id INTO v_scooter_id FROM scooters WHERE cliente_id = v_cliente_id ORDER BY created_at LIMIT 1;
  IF v_scooter_id IS NULL THEN
    INSERT INTO scooters (cliente_id, modelo, marca, cor, ano, numero_serie, chassi, data_compra)
    VALUES (v_cliente_id, 'Mobyou Beach X11', 'Mobyou', 'Preto', 2025, 'SN-TESTE-0001', 'TESTE9BWZZZ377VT004251', CURRENT_DATE)
    RETURNING id INTO v_scooter_id;
    INSERT INTO garantias (scooter_id, cliente_id, data_compra, data_inicio, data_fim, status)
    VALUES (v_scooter_id, v_cliente_id, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'ativa');
  END IF;

  -- 3) Documentos para assinatura (1 por modelo, se ainda nao houver desse tipo)
  FOR m IN
    SELECT tipo, titulo, conteudo_template
    FROM modelos_contrato
    WHERE tipo IN ('compra_venda','entrega','desbloqueio') AND ativo = TRUE
  LOOP
    IF NOT EXISTS (SELECT 1 FROM contratos WHERE cliente_id = v_cliente_id AND tipo = m.tipo) THEN
      v_conteudo := m.conteudo_template;
      v_conteudo := replace(v_conteudo, '{{cliente_nome}}', COALESCE(v_nome,''));
      v_conteudo := replace(v_conteudo, '{{cliente_cpf}}', COALESCE(v_cpf,''));
      v_conteudo := replace(v_conteudo, '{{cliente_telefone}}', COALESCE(v_tel,''));
      v_conteudo := replace(v_conteudo, '{{cliente_email}}', COALESCE(v_email,''));
      v_conteudo := replace(v_conteudo, '{{cliente_endereco}}', COALESCE(v_end,''));
      v_conteudo := replace(v_conteudo, '{{scooter_modelo}}', 'Mobyou Beach X11');
      v_conteudo := replace(v_conteudo, '{{scooter_marca}}', 'Mobyou');
      v_conteudo := replace(v_conteudo, '{{scooter_cor}}', 'Preto');
      v_conteudo := replace(v_conteudo, '{{scooter_ano}}', '2025');
      v_conteudo := replace(v_conteudo, '{{scooter_chassi}}', 'TESTE9BWZZZ377VT004251');
      v_conteudo := replace(v_conteudo, '{{scooter_numero_serie}}', 'SN-TESTE-0001');
      v_conteudo := replace(v_conteudo, '{{data_extenso}}', v_data_ext);
      v_conteudo := replace(v_conteudo, '{{data_atual}}', v_data_ext);

      INSERT INTO contratos (tipo, titulo, cliente_id, scooter_id, conteudo, status)
      VALUES (m.tipo::contrato_tipo, m.titulo, v_cliente_id, v_scooter_id, v_conteudo, 'enviado');
    END IF;
  END LOOP;

  -- 4) OS de teste com orcamento 'enviado' (para testar aprovacao + timeline)
  IF NOT EXISTS (
    SELECT 1 FROM ordens_servico WHERE cliente_id = v_cliente_id AND status = 'orcamento_enviado'
  ) THEN
    INSERT INTO ordens_servico (scooter_id, cliente_id, status, km_atual, observacoes)
    VALUES (v_scooter_id, v_cliente_id, 'orcamento_enviado', 1200, 'OS de teste')
    RETURNING id INTO v_ordem_id;

    INSERT INTO timeline_eventos (ordem_id, responsavel_id, tipo, titulo, descricao)
    VALUES (v_ordem_id, v_gestor_id, 'criacao', 'Ordem de servico criada', 'OS de teste criada'),
           (v_ordem_id, v_gestor_id, 'orcamento', 'Orçamento enviado', 'Orçamento enviado para aprovação');

    INSERT INTO orcamentos (ordem_id, criado_por, pecas, servicos, mao_de_obra, custos_adicionais, valor_total, status, data_envio)
    VALUES (
      v_ordem_id, v_gestor_id,
      '[{"nome":"Pastilha de freio","valor":80}]'::jsonb,
      '[{"nome":"Revisão de freios","valor":120}]'::jsonb,
      120, 0, 200, 'enviado', NOW()
    );
  END IF;

  RAISE NOTICE 'Ambiente de teste do cliente pronto.';
END $$;
