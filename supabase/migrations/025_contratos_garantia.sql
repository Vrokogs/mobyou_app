-- ============================================================================
-- MOBYOU APP - Contratos de compra e venda por modalidade de garantia (3m/6m/1a)
-- Modelos enviados pela loja. O modelo é escolhido conforme a garantia da venda.
-- Rode em: https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

ALTER TABLE modelos_contrato ADD COLUMN IF NOT EXISTS modalidade TEXT;

-- Desativa o modelo genérico antigo de compra e venda (sem modalidade)
UPDATE modelos_contrato SET ativo = false WHERE tipo = 'compra_venda' AND modalidade IS NULL;

-- Remove versões anteriores destes modelos por modalidade (reexecução segura)
DELETE FROM modelos_contrato WHERE tipo = 'compra_venda' AND modalidade IN ('3_meses','6_meses','1_ano');

INSERT INTO modelos_contrato (tipo, modalidade, titulo, conteudo_template, ativo) VALUES
('compra_venda', '3_meses', 'Contrato de Compra e Venda de Moto Elétrica', 'CONTRATO DE COMPRA E VENDA DE MOTO ELÉTRICA
Pelo presente instrumento particular de Contrato de Compra e Venda, as partes a seguir qualificadas, de um lado:
VENDEDORA – N&C MOBILIDADE ELÉTRICA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 54.898.852/0001-77, com sede na Rua Wenceslau Bras, 37, Pontal da Cruz, São Sebastião – SP, CEP 11.606-127, neste ato representada na forma de seus atos constitutivos, doravante denominada simplesmente VENDEDORA.
De outro lado:
COMPRADOR(A) – {{cliente_nome}}, brasileiro(a), estado civil ____________________, portador(a) do CPF nº {{cliente_cpf}}, residente e domiciliado(a) na {{cliente_endereco}}, São Sebastião – SP, CEP ____________________, doravante denominado(a) simplesmente COMPRADOR(A).
As partes acima qualificadas, por este instrumento particular, têm justo e contratado o que segue, mediante as cláusulas e condições abaixo:
CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO
1.1. O objeto do presente contrato é a compra e venda da seguinte moto/scooter elétrica:
Marca: {{scooter_marca}}
Modelo: {{scooter_modelo}}
Ano de Fabricação/Modelo: {{scooter_ano}}
Cor: {{scooter_cor}}
Número de Chassi/Série: {{scooter_chassi}}
Potência do Motor: _______________________
1.2. A MOTO/SCOOTER elétrica ora vendida, objeto deste contrato, é um veículo novo. O(A) COMPRADOR(A) declara ter examinado o veículo e ter conhecimento de suas características e condições aparentes no momento da entrega.
CLÁUSULA SEGUNDA – DO PREÇO E FORMA DE PAGAMENTO
2.1. O preço certo e ajustado pela compra e venda da moto/scooter elétrica objeto deste contrato é de R$ ____________________ (________________________________________).
2.2. O pagamento será realizado da seguinte forma:
Pagamento via ________________________________________________.
CLÁUSULA TERCEIRA – DA ENTREGA E POSSE
3.1. A VENDEDORA se compromete a entregar a moto/scooter elétrica ao(à) COMPRADOR(A) no ato da comprovação da compra.
3.2. A partir da entrega do veículo, todas as responsabilidades civis, criminais, administrativas e tributárias relacionadas à posse e ao uso da moto/scooter elétrica serão do(a) COMPRADOR(A).
CLÁUSULA QUARTA – DAS GARANTIAS, MANUTENÇÕES PREVENTIVAS E ASSISTÊNCIA TÉCNICA
4.1. A VENDEDORA oferece a seguinte garantia contratual para a moto/scooter elétrica:
a) Garantia de 03 (três) meses, APENAS para MÓDULO, MOTOR E BATERIA, contada a partir da data de entrega do veículo, abrangendo defeitos de fabricação, observadas as condições estabelecidas neste contrato.
Ficam excluídos da garantia contratual danos decorrentes de mau uso, acidentes, negligência, uso inadequado, falta de manutenção preventiva, intervenções indevidas ou modificações não autorizadas, desde que exista relação entre tais situações e o defeito apresentado.
b) A garantia contratual observará também os termos e condições estabelecidos pelo fabricante, conforme manual do proprietário e/ou termo de garantia entregue ao(à) COMPRADOR(A).
c) Não estão abrangidas pela garantia contratual as peças e componentes sujeitos a desgaste natural decorrente do uso, tais como pneus, pastilhas e demais componentes de freio, lâmpadas e outros itens consumíveis, ressalvados os defeitos de fabricação e os direitos assegurados pela legislação aplicável.
d) A realização de reparos, intervenções ou serviços no veículo por oficinas ou pessoas não autorizadas pela VENDEDORA poderá acarretar a perda da garantia contratual em relação aos componentes ou defeitos relacionados à intervenção realizada.
e) Qualquer alteração não autorizada nas características ou configurações originais de fábrica do veículo poderá acarretar a perda da garantia contratual relativamente aos defeitos ou componentes relacionados à modificação realizada.
DAS MANUTENÇÕES PREVENTIVAS OBRIGATÓRIAS
4.2. Durante o período da garantia contratual de 03 (três) meses, a VENDEDORA recomenda que o(a) COMPRADOR(A) realize 01 (uma) manutenção preventiva até o término do período de garantia, preferencialmente dentro dos primeiros 90 (noventa) dias contados da data de entrega do veículo.
4.3. A manutenção preventiva possui caráter recomendado e não obrigatório, tendo como finalidade verificar as condições gerais de funcionamento, conservação e segurança do veículo.
4.4. Caso o(a) COMPRADOR(A) opte pela realização da manutenção preventiva, esta deverá ser efetuada pela assistência técnica da VENDEDORA, em local por ela indicado, sendo responsabilidade do(a) COMPRADOR(A) levar o veículo até o endereço informado.
4.5. A não realização da manutenção preventiva recomendada durante o período de 03 (três) meses, por si só, não implicará perda automática da garantia contratual.
4.6. A garantia não abrangerá danos decorrentes de mau uso, acidentes, negligência, alterações não autorizadas, intervenções realizadas por terceiros ou falta de cuidados necessários com o veículo, quando houver relação entre essas situações e o defeito apresentado.
4.7. Caso seja realizada manutenção, avaliação ou assistência técnica, os serviços efetuados deverão ser registrados pela VENDEDORA em sistema, ordem de serviço, termo de manutenção ou documento equivalente.
4.8. O(A) COMPRADOR(A) declara estar ciente das condições de uso, conservação, assistência técnica e garantia do veículo, bem como da recomendação de realização de manutenção preventiva até o término da garantia contratual de 03 (três) meses.
DA ASSISTÊNCIA TÉCNICA
4.11. A VENDEDORA dispõe de assistência técnica nas cidades de SÃO SEBASTIÃO – SP e CARAGUATATUBA – SP, cujos endereços serão disponibilizados ao(à) COMPRADOR(A).
Para realização de reparos, manutenções preventivas, avaliações ou demais serviços técnicos, o(a) COMPRADOR(A) deverá levar o veículo até o endereço da assistência técnica indicado pela VENDEDORA.
Parágrafo Primeiro – Em caso de defeito de fabricação abrangido pela garantia, o custo do reparo coberto não será repassado ao(à) COMPRADOR(A), observadas as condições previstas neste contrato.
Parágrafo Segundo – Caso seja constatado que o defeito ou dano tenha sido decorrente de mau uso, acidente, negligência, desgaste natural, alteração não autorizada ou outra situação não abrangida pela garantia, o custo das peças e dos serviços será de responsabilidade do(a) COMPRADOR(A), mediante prévia informação dos valores.
4.12. A VENDEDORA também disponibiliza atendimento de assistência técnica em domicílio. Nessa modalidade, será cobrada do(a) COMPRADOR(A) taxa de deslocamento e/ou atendimento, cujo valor será informado previamente, considerando, entre outros fatores, a distância a ser percorrida pelo mecânico/técnico.
4.13. A VENDEDORA disponibiliza o número de Telefone/WhatsApp (11) 92139-4918 para comunicação com o(a) COMPRADOR(A), inclusive para informações, agendamentos de manutenção preventiva e assistência técnica.
CLÁUSULA QUINTA – DAS OBRIGAÇÕES DAS PARTES
5.1. Obrigações da VENDEDORA:
a) Entregar a moto/scooter elétrica nas condições acordadas neste contrato.
b) Entregar ao(à) COMPRADOR(A) todos os documentos pertinentes à moto/scooter elétrica, incluindo nota fiscal e termo de garantia, quando aplicável.
c) Realizar a primeira manutenção preventiva gratuitamente, nas condições estabelecidas na Cláusula Quarta deste contrato.
d) Disponibilizar assistência técnica para realização das manutenções preventivas e demais serviços relacionados ao veículo.
5.2. Obrigações do(a) COMPRADOR(A):
a) Pagar o preço acordado na forma e prazo estabelecidos neste contrato.
b) Assumir a responsabilidade pela posse e uso da moto/scooter elétrica a partir da entrega.
c) Realizar todos os procedimentos necessários para a regularização da moto/scooter elétrica junto aos órgãos de trânsito, quando aplicável, arcando com os custos correspondentes.
d) Apresentar o veículo à assistência técnica da VENDEDORA para realização das manutenções preventivas a cada 90 (noventa) dias, durante o período da garantia contratual, observando as condições e os valores estabelecidos na Cláusula Quarta.
e) Utilizar e conservar o veículo adequadamente, observando as orientações fornecidas pela VENDEDORA e pelo fabricante.
Parágrafo Primeiro – O(A) COMPRADOR(A) declara-se ciente de que deverá providenciar a documentação necessária para circulação em via pública das motos/scooters elétricas que, conforme suas características técnicas, estejam sujeitas a registro, licenciamento, habilitação ou demais exigências previstas na regulamentação de trânsito vigente.
CLÁUSULA SEXTA – DA RESCISÃO
6.1. Em caso de rescisão por culpa do(a) COMPRADOR(A), serão observadas as consequências previstas neste contrato e na legislação aplicável, considerando os valores eventualmente pagos, as obrigações já cumpridas pelas partes e eventuais perdas e danos devidamente comprovados.
6.2. Em caso de rescisão por culpa da VENDEDORA, serão observados os direitos do(a) COMPRADOR(A) previstos neste contrato e na legislação aplicável, inclusive quanto à eventual restituição dos valores pagos, quando cabível.
CLÁUSULA SÉTIMA – DA RELAÇÃO CONSUMERISTA
7.1. À presente relação de compra e venda aplicam-se, quando caracterizada relação de consumo, as disposições da Lei nº 8.078/1990 – Código de Defesa do Consumidor (CDC).
7.2. Nas contratações realizadas fora do estabelecimento comercial, inclusive por meio da internet, telefone ou outros meios admitidos pela legislação, serão observadas as regras relativas ao direito de arrependimento previstas no Código de Defesa do Consumidor.
7.3. Nas compras realizadas presencialmente no estabelecimento comercial, eventual cancelamento, troca ou devolução observará as hipóteses previstas na legislação aplicável e as condições comerciais da VENDEDORA que não contrariem direitos legalmente assegurados ao consumidor.
CLÁUSULA OITAVA – DO FORO
8.1. Fica eleito o foro da Comarca de São Sebastião, Estado de São Paulo, para dirimir eventuais dúvidas ou litígios decorrentes do presente contrato, ressalvadas as regras legais aplicáveis às relações de consumo e os direitos assegurados ao consumidor quanto ao foro competente.
E, por estarem assim justos e contratados, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença das 02 (duas) testemunhas abaixo, para que produza seus devidos efeitos legais.
São Sebastião – SP, {{data_extenso}}.
VENDEDOR(A):
_______________________________________________________________
N&C MOBILIDADE ELÉTRICA LTDACNPJ nº 54.898.852/0001-77
COMPRADOR(A):
NOME: ______________________________________________
CPF: _______________________________________________
TESTEMUNHA 1:
NOME: ______________________________________________
CPF: _______________________________________________
TESTEMUNHA 2:
NOME: ______________________________________________
CPF: _______________________________________________
', true),
('compra_venda', '6_meses', 'Contrato de Compra e Venda de Moto Elétrica', 'CONTRATO DE COMPRA E VENDA DE MOTO ELÉTRICA
Pelo presente instrumento particular de Contrato de Compra e Venda, as partes a seguir qualificadas, de um lado:
VENDEDORA – N&C MOBILIDADE ELÉTRICA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 54.898.852/0001-77, com sede na Rua Wenceslau Bras, 37, Pontal da Cruz, São Sebastião – SP, CEP 11.606-127, neste ato representada na forma de seus atos constitutivos, doravante denominada simplesmente VENDEDORA.
De outro lado:
COMPRADOR(A) – {{cliente_nome}}, brasileiro(a), estado civil ____________________, portador(a) do CPF nº {{cliente_cpf}}, residente e domiciliado(a) na {{cliente_endereco}}, São Sebastião – SP, CEP ____________________, doravante denominado(a) simplesmente COMPRADOR(A).
As partes acima qualificadas, por este instrumento particular, têm justo e contratado o que segue, mediante as cláusulas e condições abaixo:
CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO
1.1. O objeto do presente contrato é a compra e venda da seguinte moto/scooter elétrica:
Marca: {{scooter_marca}}
Modelo: {{scooter_modelo}}
Ano de Fabricação/Modelo: {{scooter_ano}}
Cor: {{scooter_cor}}
Número de Chassi/Série: {{scooter_chassi}}
Potência do Motor: _______________________
1.2. A MOTO/SCOOTER elétrica ora vendida, objeto deste contrato, é um veículo novo. O(A) COMPRADOR(A) declara ter examinado o veículo e ter conhecimento de suas características e condições aparentes no momento da entrega.
CLÁUSULA SEGUNDA – DO PREÇO E FORMA DE PAGAMENTO
2.1. O preço certo e ajustado pela compra e venda da moto/scooter elétrica objeto deste contrato é de R$ ____________________ (________________________________________).
2.2. O pagamento será realizado da seguinte forma:
Pagamento via ________________________________________________.
CLÁUSULA TERCEIRA – DA ENTREGA E POSSE
3.1. A VENDEDORA se compromete a entregar a moto/scooter elétrica ao(à) COMPRADOR(A) no ato da comprovação da compra.
3.2. A partir da entrega do veículo, todas as responsabilidades civis, criminais, administrativas e tributárias relacionadas à posse e ao uso da moto/scooter elétrica serão do(a) COMPRADOR(A).
CLÁUSULA QUARTA – DAS GARANTIAS, MANUTENÇÕES PREVENTIVAS E ASSISTÊNCIA TÉCNICA
4.1. A VENDEDORA oferece a seguinte garantia contratual para a moto/scooter elétrica:
a) Garantia de 06 (seis) meses, APENAS para MÓDULO, MOTOR E BATERIA, contada a partir da data de entrega do veículo, abrangendo defeitos de fabricação, observadas as condições estabelecidas neste contrato.
Ficam excluídos da garantia contratual danos decorrentes de mau uso, acidentes, negligência, uso inadequado, falta de manutenção preventiva, intervenções indevidas ou modificações não autorizadas, desde que exista relação entre tais situações e o defeito apresentado.
b) A garantia contratual observará também os termos e condições estabelecidos pelo fabricante, conforme manual do proprietário e/ou termo de garantia entregue ao(à) COMPRADOR(A).
c) Não estão abrangidas pela garantia contratual as peças e componentes sujeitos a desgaste natural decorrente do uso, tais como pneus, pastilhas e demais componentes de freio, lâmpadas e outros itens consumíveis, ressalvados os defeitos de fabricação e os direitos assegurados pela legislação aplicável.
d) A realização de reparos, intervenções ou serviços no veículo por oficinas ou pessoas não autorizadas pela VENDEDORA poderá acarretar a perda da garantia contratual em relação aos componentes ou defeitos relacionados à intervenção realizada.
e) Qualquer alteração não autorizada nas características ou configurações originais de fábrica do veículo poderá acarretar a perda da garantia contratual relativamente aos defeitos ou componentes relacionados à modificação realizada.
DAS MANUTENÇÕES PREVENTIVAS OBRIGATÓRIAS
4.2. Para a manutenção da garantia contratual de 06 (seis) meses, o(a) COMPRADOR(A) deverá realizar manutenções preventivas periódicas a cada 90 (noventa) dias, contados a partir da data da entrega do veículo, durante todo o período de vigência da referida garantia.
4.3. As manutenções preventivas deverão ser realizadas exclusivamente pela assistência técnica da VENDEDORA, em local por ela indicado, sendo de responsabilidade do(a) COMPRADOR(A) apresentar e levar o veículo para realização dos serviços dentro dos prazos estabelecidos.
4.4. A primeira manutenção preventiva será gratuita, não sendo cobrado do(a) COMPRADOR(A) o valor referente à mão de obra e aos procedimentos preventivos previstos para essa manutenção.
Parágrafo Único – A gratuidade prevista neste item refere-se exclusivamente aos serviços correspondentes à manutenção preventiva. Caso seja constatada a necessidade de substituição de peças ou realização de reparos decorrentes de mau uso, acidente, avaria, desgaste natural ou situação não coberta pela garantia, eventual custo será previamente informado ao(à) COMPRADOR(A).
4.5. A partir da segunda manutenção preventiva, cada manutenção terá o valor de R$ 300,00 (trezentos reais), a ser pago pelo(a) COMPRADOR(A) diretamente à VENDEDORA no momento da realização do serviço.
4.6. Durante o período de 06 (seis) meses de garantia contratual, o cronograma de manutenções preventivas será, em regra, o seguinte:
1ª manutenção preventiva: aproximadamente 90 dias após a entrega – GRATUITA;
2ª manutenção preventiva: aproximadamente 180 dias após a entrega – R$ 300,00 (trezentos reais).
4.7. Todas as manutenções preventivas realizadas deverão ser registradas pela VENDEDORA em sistema, ordem de serviço, termo de manutenção ou outro documento equivalente, de forma a permitir a comprovação das datas e serviços realizados.
4.8. É responsabilidade do(a) COMPRADOR(A) observar os prazos para realização das manutenções preventivas e apresentar o veículo à assistência técnica da VENDEDORA dentro da periodicidade estabelecida.
4.9. O descumprimento injustificado do cronograma de manutenções preventivas poderá acarretar a perda da cobertura da garantia contratual quando o defeito ou dano apresentado possuir relação com a ausência, atraso ou inadequação da manutenção preventiva, sem prejuízo dos direitos decorrentes da garantia legal previstos na legislação aplicável.
4.10. O(A) COMPRADOR(A) declara estar ciente das condições de uso, manutenção preventiva e garantia do veículo, especialmente da obrigatoriedade das manutenções periódicas previstas nesta cláusula para manutenção da garantia contratual de 06 (seis) meses.
DA ASSISTÊNCIA TÉCNICA
4.11. A VENDEDORA dispõe de assistência técnica nas cidades de SÃO SEBASTIÃO – SP e CARAGUATATUBA – SP, cujos endereços serão disponibilizados ao(à) COMPRADOR(A).
Para realização de reparos, manutenções preventivas, avaliações ou demais serviços técnicos, o(a) COMPRADOR(A) deverá levar o veículo até o endereço da assistência técnica indicado pela VENDEDORA.
Parágrafo Primeiro – Em caso de defeito de fabricação abrangido pela garantia, o custo do reparo coberto não será repassado ao(à) COMPRADOR(A), observadas as condições previstas neste contrato.
Parágrafo Segundo – Caso seja constatado que o defeito ou dano tenha sido decorrente de mau uso, acidente, negligência, desgaste natural, alteração não autorizada ou outra situação não abrangida pela garantia, o custo das peças e dos serviços será de responsabilidade do(a) COMPRADOR(A), mediante prévia informação dos valores.
4.12. A VENDEDORA também disponibiliza atendimento de assistência técnica em domicílio. Nessa modalidade, será cobrada do(a) COMPRADOR(A) taxa de deslocamento e/ou atendimento, cujo valor será informado previamente, considerando, entre outros fatores, a distância a ser percorrida pelo mecânico/técnico.
4.13. A VENDEDORA disponibiliza o número de Telefone/WhatsApp (11) 92139-4918 para comunicação com o(a) COMPRADOR(A), inclusive para informações, agendamentos de manutenção preventiva e assistência técnica.
CLÁUSULA QUINTA – DAS OBRIGAÇÕES DAS PARTES
5.1. Obrigações da VENDEDORA:
a) Entregar a moto/scooter elétrica nas condições acordadas neste contrato.
b) Entregar ao(à) COMPRADOR(A) todos os documentos pertinentes à moto/scooter elétrica, incluindo nota fiscal e termo de garantia, quando aplicável.
c) Realizar a primeira manutenção preventiva gratuitamente, nas condições estabelecidas na Cláusula Quarta deste contrato.
d) Disponibilizar assistência técnica para realização das manutenções preventivas e demais serviços relacionados ao veículo.
5.2. Obrigações do(a) COMPRADOR(A):
a) Pagar o preço acordado na forma e prazo estabelecidos neste contrato.
b) Assumir a responsabilidade pela posse e uso da moto/scooter elétrica a partir da entrega.
c) Realizar todos os procedimentos necessários para a regularização da moto/scooter elétrica junto aos órgãos de trânsito, quando aplicável, arcando com os custos correspondentes.
d) Apresentar o veículo à assistência técnica da VENDEDORA para realização das manutenções preventivas a cada 90 (noventa) dias, durante o período da garantia contratual, observando as condições e os valores estabelecidos na Cláusula Quarta.
e) Utilizar e conservar o veículo adequadamente, observando as orientações fornecidas pela VENDEDORA e pelo fabricante.
Parágrafo Primeiro – O(A) COMPRADOR(A) declara-se ciente de que deverá providenciar a documentação necessária para circulação em via pública das motos/scooters elétricas que, conforme suas características técnicas, estejam sujeitas a registro, licenciamento, habilitação ou demais exigências previstas na regulamentação de trânsito vigente.
CLÁUSULA SEXTA – DA RESCISÃO
6.1. Em caso de rescisão por culpa do(a) COMPRADOR(A), serão observadas as consequências previstas neste contrato e na legislação aplicável, considerando os valores eventualmente pagos, as obrigações já cumpridas pelas partes e eventuais perdas e danos devidamente comprovados.
6.2. Em caso de rescisão por culpa da VENDEDORA, serão observados os direitos do(a) COMPRADOR(A) previstos neste contrato e na legislação aplicável, inclusive quanto à eventual restituição dos valores pagos, quando cabível.
CLÁUSULA SÉTIMA – DA RELAÇÃO CONSUMERISTA
7.1. À presente relação de compra e venda aplicam-se, quando caracterizada relação de consumo, as disposições da Lei nº 8.078/1990 – Código de Defesa do Consumidor (CDC).
7.2. Nas contratações realizadas fora do estabelecimento comercial, inclusive por meio da internet, telefone ou outros meios admitidos pela legislação, serão observadas as regras relativas ao direito de arrependimento previstas no Código de Defesa do Consumidor.
7.3. Nas compras realizadas presencialmente no estabelecimento comercial, eventual cancelamento, troca ou devolução observará as hipóteses previstas na legislação aplicável e as condições comerciais da VENDEDORA que não contrariem direitos legalmente assegurados ao consumidor.
CLÁUSULA OITAVA – DO FORO
8.1. Fica eleito o foro da Comarca de São Sebastião, Estado de São Paulo, para dirimir eventuais dúvidas ou litígios decorrentes do presente contrato, ressalvadas as regras legais aplicáveis às relações de consumo e os direitos assegurados ao consumidor quanto ao foro competente.
E, por estarem assim justos e contratados, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença das 02 (duas) testemunhas abaixo, para que produza seus devidos efeitos legais.
São Sebastião – SP, {{data_extenso}}.
VENDEDOR(A):
_______________________________________________________________
N&C MOBILIDADE ELÉTRICA LTDACNPJ nº 54.898.852/0001-77
COMPRADOR(A):
NOME: ______________________________________________
CPF: _______________________________________________
TESTEMUNHA 1:
NOME: ______________________________________________
CPF: _______________________________________________
TESTEMUNHA 2:
NOME: ______________________________________________
CPF: _______________________________________________
', true),
('compra_venda', '1_ano', 'Contrato de Compra e Venda de Moto Elétrica', 'CONTRATO DE COMPRA E VENDA DE MOTO ELÉTRICA
Pelo presente instrumento particular de Contrato de Compra e Venda, as partes a seguir qualificadas, de um lado:
VENDEDORA – N&C MOBILIDADE ELÉTRICA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 54.898.852/0001-77, com sede na Rua Wenceslau Bras, 37, Pontal da Cruz, São Sebastião – SP, CEP 11.606-127, neste ato representada na forma de seus atos constitutivos, doravante denominada simplesmente VENDEDORA.
De outro lado:
COMPRADOR(A) – {{cliente_nome}}, brasileiro(a), estado civil ____________________, portador(a) do CPF nº {{cliente_cpf}}, residente e domiciliado(a) na {{cliente_endereco}}, São Sebastião – SP, CEP ____________________, doravante denominado(a) simplesmente COMPRADOR(A).
As partes acima qualificadas, por este instrumento particular, têm justo e contratado o que segue, mediante as cláusulas e condições abaixo:
CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO
1.1. O objeto do presente contrato é a compra e venda da seguinte moto/scooter elétrica:
Marca: {{scooter_marca}}
Modelo: {{scooter_modelo}}
Ano de Fabricação/Modelo: {{scooter_ano}}
Cor: {{scooter_cor}}
Número de Chassi/Série: {{scooter_chassi}}
Potência do Motor: _______________________
1.2. A MOTO/SCOOTER elétrica ora vendida, objeto deste contrato, é um veículo novo. O(A) COMPRADOR(A) declara ter examinado o veículo e ter conhecimento de suas características e condições aparentes no momento da entrega.
CLÁUSULA SEGUNDA – DO PREÇO E FORMA DE PAGAMENTO
2.1. O preço certo e ajustado pela compra e venda da moto/scooter elétrica objeto deste contrato é de R$ ____________________ (________________________________________).
2.2. O pagamento será realizado da seguinte forma:
Pagamento via ________________________________________________.
CLÁUSULA TERCEIRA – DA ENTREGA E POSSE
3.1. A VENDEDORA se compromete a entregar a moto/scooter elétrica ao(à) COMPRADOR(A) no ato da comprovação da compra.
3.2. A partir da entrega do veículo, todas as responsabilidades civis, criminais, administrativas e tributárias relacionadas à posse e ao uso da moto/scooter elétrica serão do(a) COMPRADOR(A).
CLÁUSULA QUARTA – DAS GARANTIAS, MANUTENÇÕES PREVENTIVAS E ASSISTÊNCIA TÉCNICA
4.1. A VENDEDORA oferece a seguinte garantia contratual para a moto/scooter elétrica:
a) Garantia de 01 (um) ano, APENAS para MÓDULO, MOTOR E BATERIA, contada a partir da data de entrega do veículo, abrangendo defeitos de fabricação, observadas as condições estabelecidas neste contrato.
Ficam excluídos da garantia contratual danos decorrentes de mau uso, acidentes, negligência, uso inadequado, falta de manutenção preventiva, intervenções indevidas ou modificações não autorizadas, desde que exista relação entre tais situações e o defeito apresentado.
b) A garantia contratual observará também os termos e condições estabelecidos pelo fabricante, conforme manual do proprietário e/ou termo de garantia entregue ao(à) COMPRADOR(A).
c) Não estão abrangidas pela garantia contratual as peças e componentes sujeitos a desgaste natural decorrente do uso, tais como pneus, pastilhas e demais componentes de freio, lâmpadas e outros itens consumíveis, ressalvados os defeitos de fabricação e os direitos assegurados pela legislação aplicável.
d) A realização de reparos, intervenções ou serviços no veículo por oficinas ou pessoas não autorizadas pela VENDEDORA poderá acarretar a perda da garantia contratual em relação aos componentes ou defeitos relacionados à intervenção realizada.
e) Qualquer alteração não autorizada nas características ou configurações originais de fábrica do veículo poderá acarretar a perda da garantia contratual relativamente aos defeitos ou componentes relacionados à modificação realizada.
DAS MANUTENÇÕES PREVENTIVAS OBRIGATÓRIAS
4.2. Para a manutenção da garantia contratual de 01 (um) ano, o(a) COMPRADOR(A) deverá realizar manutenções preventivas periódicas a cada 90 (noventa) dias, contados a partir da data da entrega do veículo, durante todo o período de vigência da referida garantia.
4.3. As manutenções preventivas deverão ser realizadas exclusivamente pela assistência técnica da VENDEDORA, em local por ela indicado, sendo de responsabilidade do(a) COMPRADOR(A) apresentar e levar o veículo para realização dos serviços dentro dos prazos estabelecidos.
4.4. A primeira manutenção preventiva será gratuita, não sendo cobrado do(a) COMPRADOR(A) o valor referente à mão de obra e aos procedimentos preventivos previstos para essa manutenção.
Parágrafo Único – A gratuidade prevista neste item refere-se exclusivamente aos serviços correspondentes à manutenção preventiva. Caso seja constatada a necessidade de substituição de peças ou realização de reparos decorrentes de mau uso, acidente, avaria, desgaste natural ou situação não coberta pela garantia, eventual custo será previamente informado ao(à) COMPRADOR(A).
4.5. A partir da segunda manutenção preventiva, cada manutenção terá o valor de R$ 300,00 (trezentos reais), a ser pago pelo(a) COMPRADOR(A) diretamente à VENDEDORA no momento da realização do serviço.
4.6. Durante o período de 01 (um) ano de garantia contratual, o cronograma de manutenções preventivas será, em regra, o seguinte:
1ª manutenção preventiva: aproximadamente 90 dias após a entrega – GRATUITA;
2ª manutenção preventiva: aproximadamente 180 dias após a entrega – R$ 300,00;
3ª manutenção preventiva: aproximadamente 270 dias após a entrega – R$ 300,00;
4ª manutenção preventiva: aproximadamente 360 dias após a entrega – R$ 300,00.
4.7. Todas as manutenções preventivas realizadas deverão ser registradas pela VENDEDORA em sistema, ordem de serviço, termo de manutenção ou outro documento equivalente, de forma a permitir a comprovação das datas e serviços realizados.
4.8. É responsabilidade do(a) COMPRADOR(A) observar os prazos para realização das manutenções preventivas e apresentar o veículo à assistência técnica da VENDEDORA dentro da periodicidade estabelecida.
4.9. O descumprimento injustificado do cronograma de manutenções preventivas poderá acarretar a perda da cobertura da garantia contratual quando o defeito ou dano apresentado possuir relação com a ausência, atraso ou inadequação da manutenção preventiva, sem prejuízo dos direitos decorrentes da garantia legal previstos na legislação aplicável.
4.10. O(A) COMPRADOR(A) declara estar ciente das condições de uso, manutenção preventiva e garantia do veículo, especialmente da obrigatoriedade das manutenções periódicas previstas nesta cláusula para manutenção da garantia contratual de 01 (um) ano.
DA ASSISTÊNCIA TÉCNICA
4.11. A VENDEDORA dispõe de assistência técnica nas cidades de SÃO SEBASTIÃO – SP e CARAGUATATUBA – SP, cujos endereços serão disponibilizados ao(à) COMPRADOR(A).
Para realização de reparos, manutenções preventivas, avaliações ou demais serviços técnicos, o(a) COMPRADOR(A) deverá levar o veículo até o endereço da assistência técnica indicado pela VENDEDORA.
Parágrafo Primeiro – Em caso de defeito de fabricação abrangido pela garantia, o custo do reparo coberto não será repassado ao(à) COMPRADOR(A), observadas as condições previstas neste contrato.
Parágrafo Segundo – Caso seja constatado que o defeito ou dano tenha sido decorrente de mau uso, acidente, negligência, desgaste natural, alteração não autorizada ou outra situação não abrangida pela garantia, o custo das peças e dos serviços será de responsabilidade do(a) COMPRADOR(A), mediante prévia informação dos valores.
4.12. A VENDEDORA também disponibiliza atendimento de assistência técnica em domicílio. Nessa modalidade, será cobrada do(a) COMPRADOR(A) taxa de deslocamento e/ou atendimento, cujo valor será informado previamente, considerando, entre outros fatores, a distância a ser percorrida pelo mecânico/técnico.
4.13. A VENDEDORA disponibiliza o número de Telefone/WhatsApp (11) 92139-4918 para comunicação com o(a) COMPRADOR(A), inclusive para informações, agendamentos de manutenção preventiva e assistência técnica.
CLÁUSULA QUINTA – DAS OBRIGAÇÕES DAS PARTES
5.1. Obrigações da VENDEDORA:
a) Entregar a moto/scooter elétrica nas condições acordadas neste contrato.
b) Entregar ao(à) COMPRADOR(A) todos os documentos pertinentes à moto/scooter elétrica, incluindo nota fiscal e termo de garantia, quando aplicável.
c) Realizar a primeira manutenção preventiva gratuitamente, nas condições estabelecidas na Cláusula Quarta deste contrato.
d) Disponibilizar assistência técnica para realização das manutenções preventivas e demais serviços relacionados ao veículo.
5.2. Obrigações do(a) COMPRADOR(A):
a) Pagar o preço acordado na forma e prazo estabelecidos neste contrato.
b) Assumir a responsabilidade pela posse e uso da moto/scooter elétrica a partir da entrega.
c) Realizar todos os procedimentos necessários para a regularização da moto/scooter elétrica junto aos órgãos de trânsito, quando aplicável, arcando com os custos correspondentes.
d) Apresentar o veículo à assistência técnica da VENDEDORA para realização das manutenções preventivas a cada 90 (noventa) dias, durante o período da garantia contratual de 01 (um) ano, observando as condições e os valores estabelecidos na Cláusula Quarta.
e) Utilizar e conservar o veículo adequadamente, observando as orientações fornecidas pela VENDEDORA e pelo fabricante.
Parágrafo Primeiro – O(A) COMPRADOR(A) declara-se ciente de que deverá providenciar a documentação necessária para circulação em via pública das motos/scooters elétricas que, conforme suas características técnicas, estejam sujeitas a registro, licenciamento, habilitação ou demais exigências previstas na regulamentação de trânsito vigente.
CLÁUSULA SEXTA – DA RESCISÃO
6.1. Em caso de rescisão por culpa do(a) COMPRADOR(A), serão observadas as consequências previstas neste contrato e na legislação aplicável, considerando os valores eventualmente pagos, as obrigações já cumpridas pelas partes e eventuais perdas e danos devidamente comprovados.
6.2. Em caso de rescisão por culpa da VENDEDORA, serão observados os direitos do(a) COMPRADOR(A) previstos neste contrato e na legislação aplicável, inclusive quanto à eventual restituição dos valores pagos, quando cabível.
CLÁUSULA SÉTIMA – DA RELAÇÃO CONSUMERISTA
7.1. À presente relação de compra e venda aplicam-se, quando caracterizada relação de consumo, as disposições da Lei nº 8.078/1990 – Código de Defesa do Consumidor (CDC).
7.2. Nas contratações realizadas fora do estabelecimento comercial, inclusive por meio da internet, telefone ou outros meios admitidos pela legislação, serão observadas as regras relativas ao direito de arrependimento previstas no Código de Defesa do Consumidor.
7.3. Nas compras realizadas presencialmente no estabelecimento comercial, eventual cancelamento, troca ou devolução observará as hipóteses previstas na legislação aplicável e as condições comerciais da VENDEDORA que não contrariem direitos legalmente assegurados ao consumidor.
CLÁUSULA OITAVA – DO FORO
8.1. Fica eleito o foro da Comarca de São Sebastião, Estado de São Paulo, para dirimir eventuais dúvidas ou litígios decorrentes do presente contrato, ressalvadas as regras legais aplicáveis às relações de consumo e os direitos assegurados ao consumidor quanto ao foro competente.
E, por estarem assim justos e contratados, as partes assinam o presente instrumento em 02 (duas) vias de igual teor e forma, na presença das 02 (duas) testemunhas abaixo, para que produza seus devidos efeitos legais.
São Sebastião – SP, {{data_extenso}}.
VENDEDOR(A):
_______________________________________________________________
N&C MOBILIDADE ELÉTRICA LTDACNPJ nº 54.898.852/0001-77
COMPRADOR(A):
NOME: ______________________________________________
CPF: _______________________________________________
TESTEMUNHA 1:
NOME: ______________________________________________
CPF: _______________________________________________
TESTEMUNHA 2:
NOME: ______________________________________________
CPF: _______________________________________________
', true);
