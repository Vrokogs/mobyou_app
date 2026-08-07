-- ============================================================================
-- MOBYOU APP - Seed dos 3 modelos de documento (modelos_contrato)
-- 1 Contrato de Compra e Venda + 2 Termos (Vistoria/Retirada e Responsabilidade)
-- Dados do cliente/scooter sao preenchidos via variaveis {{...}} na geracao.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- Idempotente: nao duplica (verifica pelo titulo).
-- ============================================================================

DO $$
DECLARE
  v_gestor_id UUID;
BEGIN
  SELECT id INTO v_gestor_id FROM profiles WHERE role = 'gestor' ORDER BY created_at LIMIT 1;
  IF v_gestor_id IS NULL THEN
    RAISE NOTICE 'Nenhum gestor encontrado. Nada inserido.';
    RETURN;
  END IF;

  -- 1) CONTRATO DE COMPRA E VENDA -------------------------------------------
  IF NOT EXISTS (SELECT 1 FROM modelos_contrato WHERE titulo = 'Contrato de Compra e Venda de Moto Elétrica') THEN
    INSERT INTO modelos_contrato (tipo, titulo, conteudo_template, variaveis_disponiveis, criado_por, ativo)
    VALUES (
      'compra_venda',
      'Contrato de Compra e Venda de Moto Elétrica',
      '<h2 style="text-align:center">CONTRATO DE COMPRA E VENDA</h2>
<p>Pelo presente instrumento particular de Contrato de Compra e Venda, as partes a seguir qualificadas, de um lado:</p>
<p><strong>VENDEDORA</strong> - N&amp;C MOBILIDADE ELÉTRICA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 54.898.852/0001-77, com sede na Rua Wenceslau Brás, 37, loja 02, Pontal da Cruz – São Sebastião, CEP 11.606-127, neste ato representada na forma de seus atos constitutivos, doravante denominada simplesmente VENDEDORA.</p>
<p>De outro lado:</p>
<p><strong>COMPRADOR(A)</strong> - {{cliente_nome}}, portador(a) do CPF nº {{cliente_cpf}}, telefone {{cliente_telefone}}, e-mail {{cliente_email}}, residente e domiciliado(a) na {{cliente_endereco}}, doravante denominado(a) simplesmente COMPRADOR(A).</p>
<p>As partes acima qualificadas têm justo e contratado o que segue, mediante as cláusulas e condições abaixo:</p>
<h3>CLÁUSULA PRIMEIRA – DO OBJETO</h3>
<p>O objeto do presente contrato é a compra e venda do seguinte produto:</p>
<ul>
<li>Marca: {{scooter_marca}}</li>
<li>Modelo: {{scooter_modelo}}</li>
<li>Ano de Fabricação/Modelo: {{scooter_ano}}</li>
<li>Cor: {{scooter_cor}}</li>
<li>Número de Chassi/Série: {{scooter_chassi}}</li>
</ul>
<p>1.2. O produto é um veículo novo; o(a) COMPRADOR(A) declara ter examinado o veículo e ter conhecimento de suas características e estado de conservação, não havendo qualquer vício oculto.</p>
<p>1.3. O(A) COMPRADOR(A) declara ter pleno conhecimento da Resolução 996/2023 do Contran.</p>
<h3>CLÁUSULA SEGUNDA – DO PREÇO E FORMA DE PAGAMENTO</h3>
<p>2.1. O preço certo e ajustado é de R$ ____________ (____________________).</p>
<p>2.2. Forma de pagamento: ( ) à vista no ato da assinatura — ( ) cartão de crédito ( ) cartão de débito ( ) pix ( ) transferência ( ) dinheiro — ( ) parcelado em ______ parcelas de R$ __________.</p>
<h3>CLÁUSULA TERCEIRA – DA ENTREGA E POSSE</h3>
<p>3.1. A VENDEDORA entregará a moto elétrica ao(à) COMPRADOR(A): ( ) neste ato ( ) na data ____________ ( ) retirada em loja.</p>
<p>3.2. A partir da entrega, todas as responsabilidades civis, criminais, administrativas e tributárias relacionadas à posse e uso do equipamento serão do(a) COMPRADOR(A).</p>
<h3>CLÁUSULA QUARTA – DAS GARANTIAS E ASSISTÊNCIA TÉCNICA</h3>
<p>4.1. GARANTIA DE 1 (UM) ANO apenas para o MÓDULO, MOTOR E BATERIA, a partir da data de entrega, cobrindo defeitos de fabricação. Excluem-se danos por mau uso, acidentes, negligência ou modificações não autorizadas. Não há garantia para peças de desgaste natural (pneus, freios, lâmpadas e carregadores).</p>
<p>Reparos por oficinas/pessoas não autorizadas, ou qualquer alteração na configuração de fábrica, implicam perda da garantia, independentemente do prazo restante.</p>
<p>4.3. Assistência técnica nas cidades de São Sebastião – SP e Caraguatatuba – SP. 4.5. Contato Telefone/WhatsApp (11) 97423-4265.</p>
<h3>CLÁUSULA QUINTA – DAS OBRIGAÇÕES DAS PARTES</h3>
<p>5.1. A VENDEDORA: entregar o equipamento nas condições acordadas e os documentos pertinentes (contrato e nota fiscal). 5.2. O(A) COMPRADOR(A): pagar o preço acordado; assumir a responsabilidade pela posse e uso a partir da entrega; regularizar o equipamento junto aos órgãos de trânsito quando aplicável.</p>
<h3>CLÁUSULA SEXTA – DA RESCISÃO</h3>
<p>6.1. Rescisão por culpa do(a) COMPRADOR(A): perda do valor pago a título de indenização. 6.2. Rescisão por culpa da VENDEDORA: restituição dos valores pagos, corrigidos na forma da lei.</p>
<h3>CLÁUSULA SÉTIMA – DA RELAÇÃO CONSUMERISTA</h3>
<p>7.1. Nos termos do art. 49 do CDC, nas compras pela internet há prazo de 7 (sete) dias para arrependimento; compras presenciais não permitem devolução ou ressarcimento.</p>
<h3>CLÁUSULA OITAVA – DO FORO</h3>
<p>8.1. Fica eleito o foro da Comarca de São Sebastião/SP para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato.</p>
<p>São Sebastião – SP, {{data_extenso}}.</p>
<p>VENDEDORA: N&amp;C MOBILIDADE ELÉTRICA LTDA — CNPJ nº 54.898.852/0001-77</p>
<p>COMPRADOR(A): {{cliente_nome}} — CPF: {{cliente_cpf}}</p>',
      '["cliente_nome","cliente_cpf","cliente_telefone","cliente_email","cliente_endereco","scooter_marca","scooter_modelo","scooter_ano","scooter_cor","scooter_chassi","data_extenso"]'::jsonb,
      v_gestor_id,
      TRUE
    );
  END IF;

  -- 2) TERMO DE VISTORIA E RETIRADA -----------------------------------------
  IF NOT EXISTS (SELECT 1 FROM modelos_contrato WHERE titulo = 'Termo de Vistoria e Retirada') THEN
    INSERT INTO modelos_contrato (tipo, titulo, conteudo_template, variaveis_disponiveis, criado_por, ativo)
    VALUES (
      'entrega',
      'Termo de Vistoria e Retirada',
      '<h2 style="text-align:center">TERMO DE VISTORIA E RETIRADA</h2>
<p>Eu, {{cliente_nome}}, portador(a) do CPF nº {{cliente_cpf}}, proprietário(a) do equipamento autopropelido com as seguintes características:</p>
<ul>
<li>Marca: {{scooter_marca}}</li>
<li>Modelo: {{scooter_modelo}}</li>
<li>Ano de Fabricação/Modelo: {{scooter_ano}}</li>
<li>Cor: {{scooter_cor}}</li>
<li>Número de Chassi/Série: {{scooter_chassi}}</li>
</ul>
<p>Por meio do presente Termo de Vistoria e Retirada declaro que escolhi e recebi o equipamento acima descrito, nas seguintes condições, que vistoriei pessoalmente:</p>
<table border="1" cellpadding="4" style="border-collapse:collapse">
<tr><th>ITEM</th><th>Sem defeito</th><th>Com defeito</th><th>Não verificado</th></tr>
<tr><td>Pintura</td><td></td><td></td><td></td></tr>
<tr><td>Bateria</td><td></td><td></td><td></td></tr>
<tr><td>Partida</td><td></td><td></td><td></td></tr>
<tr><td>Painel</td><td></td><td></td><td></td></tr>
<tr><td>Freios</td><td></td><td></td><td></td></tr>
<tr><td>Luzes</td><td></td><td></td><td></td></tr>
<tr><td>Pneus</td><td></td><td></td><td></td></tr>
</table>
<p>São Sebastião, {{data_extenso}}.</p>
<p>____________________________________________<br/>{{cliente_nome}} — CPF: {{cliente_cpf}}</p>',
      '["cliente_nome","cliente_cpf","scooter_marca","scooter_modelo","scooter_ano","scooter_cor","scooter_chassi","data_extenso"]'::jsonb,
      v_gestor_id,
      TRUE
    );
  END IF;

  -- 3) TERMO DE RESPONSABILIDADE (DESBLOQUEIO) ------------------------------
  IF NOT EXISTS (SELECT 1 FROM modelos_contrato WHERE titulo = 'Termo de Responsabilidade - Desbloqueio') THEN
    INSERT INTO modelos_contrato (tipo, titulo, conteudo_template, variaveis_disponiveis, criado_por, ativo)
    VALUES (
      'desbloqueio',
      'Termo de Responsabilidade - Desbloqueio',
      '<h2 style="text-align:center">TERMO DE RESPONSABILIDADE</h2>
<p>Eu, {{cliente_nome}}, portador(a) do CPF nº {{cliente_cpf}}, proprietário(a) do equipamento autopropelido com as seguintes características:</p>
<ul>
<li>Marca: {{scooter_marca}}</li>
<li>Modelo: {{scooter_modelo}}</li>
<li>Ano de Fabricação/Modelo: {{scooter_ano}}</li>
<li>Cor: {{scooter_cor}}</li>
<li>Número de Chassi/Série: {{scooter_chassi}}</li>
</ul>
<p>Por meio do presente Termo de Responsabilidade, solicito à empresa N&amp;C MOBILIDADE ELÉTRICA LTDA o desbloqueio do referido equipamento, para que possa atingir maior velocidade/desempenho.</p>
<p>Declaro ter pleno conhecimento das definições e regulamentações da Resolução 996/2023 do Contran e assumo a responsabilidade integral sobre o uso do referido equipamento, isentando a N&amp;C MOBILIDADE ELÉTRICA LTDA de qualquer responsabilidade solidária ou subsidiária pelo uso do equipamento sem o bloqueio de velocidade, seja em relação à aquisição, desempenho, potência ou a terceiros, inclusive autoridades fiscais, policiais ou de trânsito.</p>
<p>As partes concordam em manter os termos da garantia estabelecida em contrato, desde que respeitadas todas as condições de uso e manutenção do equipamento.</p>
<p>São Sebastião, {{data_extenso}}.</p>
<p>____________________________________________<br/>{{cliente_nome}} — CPF: {{cliente_cpf}}</p>',
      '["cliente_nome","cliente_cpf","scooter_marca","scooter_modelo","scooter_ano","scooter_cor","scooter_chassi","data_extenso"]'::jsonb,
      v_gestor_id,
      TRUE
    );
  END IF;

  RAISE NOTICE 'Modelos de contrato/termos inseridos (ou ja existiam).';
END $$;
