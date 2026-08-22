"use client";

import { RankingVendas } from "@/components/ranking/ranking-vendas";

// Ranking liberado a todos os vendedores, mas sem o faturamento da empresa.
export default function VendedorRankingPage() {
  return <RankingVendas podeVerFaturamento={false} />;
}
