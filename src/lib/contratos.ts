// Regra dos documentos enviados para assinatura.
//
// O único contrato que vai para o cliente é o de compra e venda da modalidade
// de garantia escolhida na venda: 3 meses, 6 meses ou 1 ano. O termo de vistoria
// e retirada e o termo de responsabilidade de desbloqueio existem como modelo,
// mas são assinados presencialmente e NÃO são gerados automaticamente — antes
// desta regra os três saíam juntos em todo cadastro.
//
// A regra mora aqui porque quatro telas geravam contrato por conta própria e
// só uma delas acertava a modalidade.

export type ModeloCompraVenda = {
  titulo: string;
  conteudo_template: string;
  modalidade: string | null;
};

// Cliente do Supabase (browser ou admin). O retorno de .from() fica em unknown
// de propósito: tipar a query inteira aqui faz o TS percorrer os tipos gerados
// do banco e estourar em "type instantiation is excessively deep".
type SupabaseLike = { from: (table: string) => unknown };

type QueryModelos = {
  select: (cols: string) => {
    eq: (col: string, val: unknown) => {
      eq: (col: string, val: unknown) => PromiseLike<{ data: unknown }>;
    };
  };
};

/**
 * Busca o contrato de compra e venda da modalidade de garantia informada.
 * Devolve null quando não existe modelo ativo para aquela modalidade — nesse
 * caso é melhor não gerar nada do que mandar o cliente assinar a garantia
 * errada.
 */
export async function buscarContratoDaGarantia(
  supabase: SupabaseLike,
  modalidade: string | null | undefined,
): Promise<ModeloCompraVenda | null> {
  if (!modalidade) return null;
  const query = supabase.from("modelos_contrato") as QueryModelos;
  const { data } = await query
    .select("titulo, conteudo_template, modalidade")
    .eq("tipo", "compra_venda")
    .eq("ativo", true);
  const lista = (data ?? []) as ModeloCompraVenda[];
  return lista.find((m) => m.modalidade === modalidade) ?? null;
}

// Mensagem única para quando falta o modelo da modalidade escolhida.
export const SEM_MODELO_CONTRATO =
  "Nenhum contrato de compra e venda cadastrado para essa garantia. Rode a migration 025 ou cadastre o modelo em Contratos.";
