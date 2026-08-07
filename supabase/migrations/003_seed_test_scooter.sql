-- ============================================================================
-- MOBYOU APP - Seed: moto de teste vinculada ao cliente existente (por CPF)
-- Vincula uma scooter ao cliente cujo CPF e 444.444.444-44 (Maria Cliente).
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- Idempotente: nao duplica se ja existir (verifica pelo chassi de teste).
-- ============================================================================

DO $$
DECLARE
  v_cliente_id UUID;
  v_scooter_id UUID;
  v_chassi TEXT := 'TESTE9BWZZZ377VT004251';
BEGIN
  -- Encontra o cliente pelo CPF (com ou sem formatacao)
  SELECT id INTO v_cliente_id
  FROM profiles
  WHERE regexp_replace(COALESCE(cpf, ''), '\D', '', 'g') = '44444444444'
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'Cliente com CPF 444.444.444-44 nao encontrado. Nada inserido.';
    RETURN;
  END IF;

  -- Evita duplicar a moto de teste
  IF EXISTS (SELECT 1 FROM scooters WHERE chassi = v_chassi) THEN
    RAISE NOTICE 'Moto de teste (chassi %) ja existe. Nada inserido.', v_chassi;
    RETURN;
  END IF;

  -- Cria a scooter vinculada ao cliente
  INSERT INTO scooters (cliente_id, modelo, marca, cor, ano, numero_serie, chassi, data_compra)
  VALUES (
    v_cliente_id,
    'Mobyou Beach X11',
    'Mobyou',
    'Preto',
    2025,
    'SN-TESTE-0001',
    v_chassi,
    CURRENT_DATE
  )
  RETURNING id INTO v_scooter_id;

  -- Garantia de fabrica de 1 ano
  INSERT INTO garantias (scooter_id, cliente_id, data_compra, data_inicio, data_fim, status)
  VALUES (
    v_scooter_id,
    v_cliente_id,
    CURRENT_DATE,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    'ativa'
  );

  RAISE NOTICE 'Moto de teste criada (id=%) e vinculada ao cliente %.', v_scooter_id, v_cliente_id;
END $$;
