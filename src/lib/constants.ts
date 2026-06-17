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

export const FOTO_TIPOS = [
  { value: 'checkin_frente', label: 'Check-in - Frente' },
  { value: 'checkin_traseira', label: 'Check-in - Traseira' },
  { value: 'checkin_lateral_esquerda', label: 'Check-in - Lateral Esquerda' },
  { value: 'checkin_lateral_direita', label: 'Check-in - Lateral Direita' },
  { value: 'checkin_painel', label: 'Check-in - Painel' },
  { value: 'checkin_dano', label: 'Check-in - Dano' },
  { value: 'diagnostico', label: 'Diagnostico' },
  { value: 'servico', label: 'Servico' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'entrega', label: 'Entrega' },
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
