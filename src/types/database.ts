export type Role = 'gestor' | 'vendedor' | 'tecnico' | 'cliente';

export type GarantiaStatus = 'ativa' | 'expirada' | 'cancelada';

export type OrdemServicoStatus =
  | 'agendado'
  | 'confirmado'
  | 'recebido'
  | 'checkin_realizado'
  | 'em_analise'
  | 'diagnostico_concluido'
  | 'orcamento_enviado'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'aguardando_inicio'
  | 'em_servico'
  | 'testes_finais'
  | 'finalizado'
  | 'entregue'
  | 'cancelado'
  | 'nao_compareceu'
  | 'remarcado';

export type ContratoTipo =
  | 'compra_venda'
  | 'garantia'
  | 'entrega'
  | 'desbloqueio'
  | 'personalizado';

export type ContratoStatus =
  | 'rascunho'
  | 'enviado'
  | 'visualizado'
  | 'assinado'
  | 'cancelado';

export type Profile = {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string;
  endereco: string | null;
  role: Role;
  avatar_url: string | null;
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Scooter = {
  id: string;
  cliente_id: string | null;
  modelo: string;
  marca: string;
  cor: string | null;
  ano: number | null;
  numero_serie: string | null;
  chassi: string | null;
  data_compra: string | null;
  created_at: string;
  updated_at: string;
};

export type Garantia = {
  id: string;
  scooter_id: string;
  cliente_id: string;
  data_compra: string | null;
  data_inicio: string;
  data_fim: string;
  status: GarantiaStatus;
  created_at: string;
  updated_at: string;
};

export type OrdemServico = {
  id: string;
  numero: number;
  scooter_id: string;
  cliente_id: string;
  tecnico_id: string | null;
  status: OrdemServicoStatus;
  km_atual: number | null;
  foto_km: string | null;
  data_agendamento: string | null;
  data_recebimento: string | null;
  data_finalizacao: string | null;
  data_entrega: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckinItem = {
  id: string;
  ordem_id: string;
  item: string;
  classificacao: string;
  observacao: string | null;
  created_at: string;
};

export type FotoOrdem = {
  id: string;
  ordem_id: string;
  tipo: string;
  url: string;
  storage_path: string | null;
  created_at: string;
};

export type Diagnostico = {
  id: string;
  ordem_id: string;
  tecnico_id: string;
  problemas_encontrados: string | null;
  pecas_necessarias: string | null;
  servicos_necessarios: string | null;
  tempo_estimado: string | null;
  observacoes: string | null;
  created_at: string;
};

export type Orcamento = {
  id: string;
  ordem_id: string;
  criado_por: string | null;
  pecas: unknown | null;
  servicos: unknown | null;
  mao_de_obra: number | null;
  custos_adicionais: number | null;
  prazo_estimado: string | null;
  valor_total: number | null;
  status: string | null;
  aprovado_por: string | null;
  data_aprovacao: string | null;
  data_envio: string | null;
  created_at: string;
  updated_at: string;
};

export type TimelineEvento = {
  id: string;
  ordem_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  responsavel_id: string | null;
  foto_url: string | null;
  video_url: string | null;
  created_at: string;
};

export type Estoque = {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string | null;
  quantidade: number;
  quantidade_minima: number;
  preco_custo: number | null;
  preco_venda: number | null;
  categoria: string | null;
  unidade: string | null;
  created_at: string;
  updated_at: string;
};

export type EstoqueMovimentacao = {
  id: string;
  estoque_id: string;
  tipo: 'entrada' | 'saida' | 'reserva';
  quantidade: number;
  motivo: string | null;
  ordem_id: string | null;
  responsavel_id: string;
  created_at: string;
};

export type Contrato = {
  id: string;
  tipo: ContratoTipo;
  titulo: string;
  cliente_id: string;
  scooter_id: string | null;
  conteudo: string;
  variaveis: Record<string, unknown> | null;
  pdf_url: string | null;
  status: ContratoStatus;
  created_at: string;
  updated_at: string;
};

export type ModeloContrato = {
  id: string;
  tipo: ContratoTipo;
  titulo: string;
  conteudo_template: string;
  variaveis_disponiveis: string[];
  criado_por: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Assinatura = {
  id: string;
  contrato_id: string;
  signatario_id: string;
  tipo: 'cliente' | 'empresa' | 'testemunha';
  nome: string;
  cpf: string | null;
  assinatura_url: string;
  ip_address: string | null;
  user_agent: string | null;
  assinado_em: string;
  created_at: string;
};

export type Certificado = {
  id: string;
  ordem_id: string | null;
  cliente_id: string | null;
  scooter_id: string | null;
  tecnico_id: string | null;
  servico_executado: string | null;
  data_servico: string | null;
  pdf_url: string | null;
  qr_code_data: string | null;
  created_at: string;
};

export type NotaFiscal = {
  id: string;
  tipo_arquivo: string | null;
  arquivo_url: string | null;
  storage_path: string | null;
  dados_extraidos: Record<string, unknown> | null;
  importado_por: string | null;
  cliente_id: string | null;
  scooter_id: string | null;
  valor: number | null;
  parcelas: number | null;
  data_compra: string | null;
  created_at: string;
};

export type KmHistorico = {
  id: string;
  scooter_id: string;
  km: number;
  registrado_por: string;
  origem: string;
  created_at: string;
};

export type Venda = {
  id: string;
  vendedor_id: string;
  cliente_id: string;
  scooter_id: string;
  nota_fiscal_id: string | null;
  valor_total: number | null;
  entrada: number | null;
  parcelas: number | null;
  forma_pagamento: string | null;
  contrato_id: string | null;
  created_at: string;
};

export type Notificacao = {
  id: string;
  usuario_id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  dados: Record<string, unknown> | null;
  link: string | null;
  created_at: string;
};

export type EmpresaConfig = {
  id: string;
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  termos_garantia: string | null;
  politica_privacidade: string | null;
  configuracoes: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};
export type ProfileUpdate = Partial<ProfileInsert>;

export type ScooterInsert = Omit<Scooter, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type ScooterUpdate = Partial<ScooterInsert>;

export type GarantiaInsert = Omit<Garantia, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type GarantiaUpdate = Partial<GarantiaInsert>;

export type OrdemServicoInsert = Omit<OrdemServico, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type OrdemServicoUpdate = Partial<OrdemServicoInsert>;

export type CheckinItemInsert = Omit<CheckinItem, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type CheckinItemUpdate = Partial<CheckinItemInsert>;

export type FotoOrdemInsert = Omit<FotoOrdem, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type FotoOrdemUpdate = Partial<FotoOrdemInsert>;

export type DiagnosticoInsert = Omit<Diagnostico, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type DiagnosticoUpdate = Partial<DiagnosticoInsert>;

export type OrcamentoInsert = Omit<Orcamento, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type OrcamentoUpdate = Partial<OrcamentoInsert>;

export type TimelineEventoInsert = Omit<TimelineEvento, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type TimelineEventoUpdate = Partial<TimelineEventoInsert>;

// OrcamentoItem is used in some UI forms; kept for compatibility
export type OrcamentoItem = {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  tipo: 'peca' | 'servico';
};

export type EstoqueInsert = Omit<Estoque, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type EstoqueUpdate = Partial<EstoqueInsert>;

export type EstoqueMovimentacaoInsert = Omit<EstoqueMovimentacao, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type EstoqueMovimentacaoUpdate = Partial<EstoqueMovimentacaoInsert>;

export type ContratoInsert = Omit<Contrato, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type ContratoUpdate = Partial<ContratoInsert>;

export type ModeloContratoInsert = Omit<ModeloContrato, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type ModeloContratoUpdate = Partial<ModeloContratoInsert>;

export type AssinaturaInsert = Omit<Assinatura, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type AssinaturaUpdate = Partial<AssinaturaInsert>;

export type CertificadoInsert = Omit<Certificado, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type CertificadoUpdate = Partial<CertificadoInsert>;

export type NotaFiscalInsert = Omit<NotaFiscal, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type NotaFiscalUpdate = Partial<NotaFiscalInsert>;

export type KmHistoricoInsert = Omit<KmHistorico, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type KmHistoricoUpdate = Partial<KmHistoricoInsert>;

export type VendaInsert = Omit<Venda, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type VendaUpdate = Partial<VendaInsert>;

export type NotificacaoInsert = Omit<Notificacao, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type NotificacaoUpdate = Partial<NotificacaoInsert>;

export type EmpresaConfigInsert = Omit<EmpresaConfig, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type EmpresaConfigUpdate = Partial<EmpresaConfigInsert>;

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<Profile, ProfileInsert, ProfileUpdate>;
      scooters: TableDefinition<Scooter, ScooterInsert, ScooterUpdate>;
      garantias: TableDefinition<Garantia, GarantiaInsert, GarantiaUpdate>;
      ordens_servico: TableDefinition<OrdemServico, OrdemServicoInsert, OrdemServicoUpdate>;
      checkin_items: TableDefinition<CheckinItem, CheckinItemInsert, CheckinItemUpdate>;
      fotos_ordem: TableDefinition<FotoOrdem, FotoOrdemInsert, FotoOrdemUpdate>;
      diagnosticos: TableDefinition<Diagnostico, DiagnosticoInsert, DiagnosticoUpdate>;
      orcamentos: TableDefinition<Orcamento, OrcamentoInsert, OrcamentoUpdate>;
      timeline_eventos: TableDefinition<TimelineEvento, TimelineEventoInsert, TimelineEventoUpdate>;
      estoque: TableDefinition<Estoque, EstoqueInsert, EstoqueUpdate>;
      estoque_movimentacoes: TableDefinition<EstoqueMovimentacao, EstoqueMovimentacaoInsert, EstoqueMovimentacaoUpdate>;
      contratos: TableDefinition<Contrato, ContratoInsert, ContratoUpdate>;
      modelos_contrato: TableDefinition<ModeloContrato, ModeloContratoInsert, ModeloContratoUpdate>;
      assinaturas: TableDefinition<Assinatura, AssinaturaInsert, AssinaturaUpdate>;
      certificados: TableDefinition<Certificado, CertificadoInsert, CertificadoUpdate>;
      notas_fiscais: TableDefinition<NotaFiscal, NotaFiscalInsert, NotaFiscalUpdate>;
      km_historico: TableDefinition<KmHistorico, KmHistoricoInsert, KmHistoricoUpdate>;
      vendas: TableDefinition<Venda, VendaInsert, VendaUpdate>;
      notificacoes: TableDefinition<Notificacao, NotificacaoInsert, NotificacaoUpdate>;
      empresa_config: TableDefinition<EmpresaConfig, EmpresaConfigInsert, EmpresaConfigUpdate>;
    };
  };
};
