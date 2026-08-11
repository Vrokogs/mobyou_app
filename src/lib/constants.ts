import type {
  OrdemServicoStatus,
  GarantiaStatus,
  ContratoTipo,
  ContratoStatus,
  Role,
} from '@/types/database';

export const ORDER_STATUS_LABELS: Record<OrdemServicoStatus, string> = {
  agendado: 'Agendado',
  confirmado: 'Confirmado',
  recebido: 'Recebido',
  checkin_realizado: 'Check-in Realizado',
  em_analise: 'Em Analise',
  diagnostico_concluido: 'Diagnostico Concluido',
  orcamento_enviado: 'Orcamento Enviado',
  aguardando_aprovacao: 'Aguardando Aprovacao',
  aprovado: 'Aprovado',
  aguardando_inicio: 'Aguardando Inicio',
  em_servico: 'Em Servico',
  testes_finais: 'Testes Finais',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  nao_compareceu: 'Nao Compareceu',
  remarcado: 'Remarcado',
};

export const ORDER_STATUS_COLORS: Record<OrdemServicoStatus, string> = {
  agendado: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-indigo-100 text-indigo-800',
  recebido: 'bg-purple-100 text-purple-800',
  checkin_realizado: 'bg-violet-100 text-violet-800',
  em_analise: 'bg-amber-100 text-amber-800',
  diagnostico_concluido: 'bg-orange-100 text-orange-800',
  orcamento_enviado: 'bg-cyan-100 text-cyan-800',
  aguardando_aprovacao: 'bg-yellow-100 text-yellow-800',
  aprovado: 'bg-lime-100 text-lime-800',
  aguardando_inicio: 'bg-teal-100 text-teal-800',
  em_servico: 'bg-blue-100 text-blue-800',
  testes_finais: 'bg-sky-100 text-sky-800',
  finalizado: 'bg-emerald-100 text-emerald-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  nao_compareceu: 'bg-gray-100 text-gray-800',
  remarcado: 'bg-pink-100 text-pink-800',
};

export const CHECKIN_ITEMS = [
  { value: 'freio_dianteiro', label: 'Freio Dianteiro' },
  { value: 'freio_traseiro', label: 'Freio Traseiro' },
  { value: 'pneu_dianteiro', label: 'Pneu Dianteiro' },
  { value: 'pneu_traseiro', label: 'Pneu Traseiro' },
  { value: 'suspensao_dianteira', label: 'Suspensao Dianteira' },
  { value: 'suspensao_traseira', label: 'Suspensao Traseira' },
  { value: 'farol', label: 'Farol' },
  { value: 'lanterna', label: 'Lanterna' },
  { value: 'seta_dianteira', label: 'Seta Dianteira' },
  { value: 'seta_traseira', label: 'Seta Traseira' },
  { value: 'painel', label: 'Painel' },
  { value: 'acelerador', label: 'Acelerador' },
  { value: 'bateria', label: 'Bateria' },
  { value: 'carregador', label: 'Carregador' },
  { value: 'motor', label: 'Motor' },
  { value: 'controlador', label: 'Controlador' },
  { value: 'carenagem', label: 'Carenagem' },
  { value: 'retrovisores', label: 'Retrovisores' },
  { value: 'buzina', label: 'Buzina' },
  { value: 'chave', label: 'Chave' },
  { value: 'banco', label: 'Banco' },
  { value: 'bagageiro', label: 'Bagageiro' },
  { value: 'cavalete', label: 'Cavalete' },
  { value: 'pedais', label: 'Pedais' },
] as const;

export const CHECKIN_CLASSIFICATIONS = [
  { value: 'bom', label: 'Bom' },
  { value: 'regular', label: 'Regular' },
  { value: 'ruim', label: 'Ruim' },
  { value: 'nao_aplicavel', label: 'Nao Aplicavel' },
  { value: 'ausente', label: 'Ausente' },
] as const;

// Tipos de foto - DEVEM corresponder ao enum foto_tipo do banco
// (frente, traseira, lateral_direita, lateral_esquerda, painel, chassi, km,
//  diagnostico, servico) + 'avaria' (migration 004)
export const FOTO_TIPOS = [
  { value: 'km', label: 'KM' },
  { value: 'avaria', label: 'Avaria' },
  { value: 'frente', label: 'Frente' },
  { value: 'lateral_direita', label: 'Lateral Direita' },
  { value: 'lateral_esquerda', label: 'Lateral Esquerda' },
  { value: 'traseira', label: 'Traseira' },
  { value: 'painel', label: 'Painel' },
  { value: 'chassi', label: 'Chassi' },
  { value: 'diagnostico', label: 'Diagnostico' },
  { value: 'servico', label: 'Servico' },
] as const;

// Check-in fotografico em 3 etapas
export const FOTO_ETAPAS = [
  {
    grupo: 'km',
    titulo: 'KM (Hodometro)',
    descricao: 'Foto da quilometragem atual no painel',
    tipos: [{ value: 'km', label: 'KM' }],
  },
  {
    grupo: 'avarias',
    titulo: 'Avarias',
    descricao: 'Marcas, amassos, batidas ou falta de material',
    tipos: [{ value: 'avaria', label: 'Avaria' }],
  },
  {
    grupo: 'laterais_frente',
    titulo: 'Laterais e Frente',
    descricao: 'Frente e laterais da scooter',
    tipos: [
      { value: 'frente', label: 'Frente' },
      { value: 'lateral_direita', label: 'Lateral Direita' },
      { value: 'lateral_esquerda', label: 'Lateral Esquerda' },
    ],
  },
] as const;

export const ROLES: { value: Role; label: string }[] = [
  { value: 'gestor', label: 'Gestor' },
  { value: 'vendedor', label: 'Vendedor' },
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'cliente', label: 'Cliente' },
];

export const GARANTIA_STATUS: Record<GarantiaStatus, string> = {
  ativa: 'Ativa',
  expirada: 'Expirada',
  cancelada: 'Cancelada',
};

// Modalidades de garantia por venda
export const GARANTIA_MODALIDADES = [
  { value: '1_ano', label: '1 ano', meses: 12 },
  { value: '6_meses', label: '6 meses', meses: 6 },
  { value: '3_meses', label: '3 meses', meses: 3 },
] as const;

export const GARANTIA_MODALIDADE_LABEL: Record<string, string> = {
  '1_ano': '1 ano',
  '6_meses': '6 meses',
  '3_meses': '3 meses',
};

// Manutenção preventiva/revisão a cada 60 dias
export const PREVENTIVA_INTERVALO_DIAS = 60;
export const PREVENTIVA_VALOR = 300; // R$ 300 por revisão (1ª grátis)

export const PREVENTIVA_STATUS: Record<string, string> = {
  pendente: 'Pendente',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

// Quantas preventivas gerar por modalidade (a cada 60 dias dentro do período)
// 3 meses: 1 revisão sugestiva (dentro dos 90 dias)
// 6 meses: 3 revisões obrigatórias  |  1 ano: 6 revisões obrigatórias
const PREVENTIVA_QTD_POR_MODALIDADE: Record<string, number> = {
  '3_meses': 1,
  '6_meses': 3,
  '1_ano': 6,
};

// Para 6 meses e 1 ano a revisão é obrigatória para manter a garantia.
// Para 3 meses é sugestiva.
export function preventivaObrigatoria(modalidade: string | null | undefined): boolean {
  return modalidade === '6_meses' || modalidade === '1_ano';
}

export interface PreventivaGerada {
  numero: number;
  data_prevista: string;
  gratuita: boolean;
  obrigatoria: boolean;
  valor: number;
}

// Gera a agenda de revisões conforme a modalidade da garantia.
export function gerarPreventivas(
  dataInicioISO: string,
  modalidade: string,
  primeiraGratuita: boolean,
): PreventivaGerada[] {
  const qtd = PREVENTIVA_QTD_POR_MODALIDADE[modalidade] ?? 6;
  const obrigatoria = preventivaObrigatoria(modalidade);
  const base = new Date(dataInicioISO + 'T12:00:00');
  const out: PreventivaGerada[] = [];
  for (let i = 1; i <= qtd; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + PREVENTIVA_INTERVALO_DIAS * i);
    const gratuita = i === 1 && primeiraGratuita;
    out.push({
      numero: i,
      data_prevista: d.toISOString().slice(0, 10),
      gratuita,
      obrigatoria,
      valor: gratuita ? 0 : PREVENTIVA_VALOR,
    });
  }
  return out;
}

export const CONTRATO_TIPOS: Record<ContratoTipo, string> = {
  compra_venda: 'Compra e Venda',
  garantia: 'Garantia',
  entrega: 'Entrega',
  desbloqueio: 'Desbloqueio',
  personalizado: 'Personalizado',
};

export const CONTRATO_STATUS: Record<ContratoStatus, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  visualizado: 'Visualizado',
  assinado: 'Assinado',
  cancelado: 'Cancelado',
};

// Catalogo de modelos MOBYOU
export const MOBYOU_MARCA = 'Mobyou';

export const MOBYOU_MODELOS = [
  'Mobyou Beach X11',
  'Mobyou X13',
  'Mobyou X14',
  'Mobyou Lola',
  'Mobyou Triciclo',
  'Mobyou Triciclo Wave',
  'Mobyou T6 Plus',
  'Mobyou Frankfurt',
  'Mobyou Bolin',
  'Bike Atlanta',
  'Mobyou Migo',
  'Mobyou Bibi',
  'Mobyou Fyron',
] as const;

export type MobyouModelo = (typeof MOBYOU_MODELOS)[number];

// Unidades (lojas) para o estoque de motos
export const GALPAO_UNIDADE = 'Galpão Central (motos em caixa)';

export const UNIDADES_ESTOQUE = [
  'São Sebastião - Pontal',
  'Boiçucanga',
  'Caraguatatuba Shopping',
  GALPAO_UNIDADE,
] as const;

// Lojas de venda (não incluem o galpão)
export const UNIDADES_VENDA = [
  'São Sebastião - Pontal',
  'Boiçucanga',
  'Caraguatatuba Shopping',
] as const;

// Estado/condição da moto no estoque
export const ESTOQUE_ESTADOS = [
  'Disponível',
  'Montada',
  'Para montar',
  'Em caixa',
  'Reservada',
  'Vendido',
  'Avariada',
] as const;

// Unidades de negócio da empresa (dimensão separada das lojas físicas)
export const UNIDADES_NEGOCIO = [
  { value: 'varejo', label: 'Varejo', descricao: 'Vendas diretas ao consumidor final' },
  { value: 'atacado', label: 'Atacado', descricao: 'Vendas para lojistas, revendedores e parceiros' },
  { value: 'pecas', label: 'Peças de reposição', descricao: 'Peças vendidas separadamente' },
  { value: 'oficina', label: 'Oficina', descricao: 'Manutenção, revisão, garantia e mão de obra' },
] as const;

export const UNIDADE_NEGOCIO_LABEL: Record<string, string> = {
  varejo: 'Varejo',
  atacado: 'Atacado',
  pecas: 'Peças de reposição',
  oficina: 'Oficina',
};

// Vendedores que operam no atacado (Julia + Robert) — vendas de atacado somadas e
// divididas 50/50 entre eles (regra do briefing).
export const VENDEDORES_ATACADO = ['julia@mobyou.com', 'robert@mobyou.com'];

// Origem do lead / da venda (de onde veio o cliente)
export const ORIGEM_VENDA = [
  'Lead',
  'Passeando no shopping',
  'Anúncios',
  'Rádio',
  'Indicação',
  'Redes sociais',
  'Outros',
] as const;

export type OrigemVenda = (typeof ORIGEM_VENDA)[number];

// Montagem de motos: valor cobrado por hora de serviço
export const VALOR_HORA_MONTAGEM = 250;

// Vendedores que também executam a etapa de manutenção (acesso ao sistema de OS).
// E-mails em minúsculo. Amplie esta lista para liberar OS a outros vendedores.
export const VENDEDORES_MANUTENCAO = ['julia@mobyou.com', 'robert@mobyou.com'];

export function podeManutencao(email?: string | null): boolean {
  return !!email && VENDEDORES_MANUTENCAO.includes(email.toLowerCase());
}

// Folha de ponto: horário padrão de entrada e tolerância (minutos)
export const PONTO_ENTRADA_PADRAO = '08:00';
export const PONTO_TOLERANCIA_MIN = 10;

export const LEAD_STATUS: Record<string, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

export const MONTAGEM_STATUS: Record<string, string> = {
  agendada: 'Agendada',
  em_montagem: 'Em montagem',
  concluida: 'Concluída',
};
