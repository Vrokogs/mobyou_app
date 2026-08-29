"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, TrendingUp, Store, Bike, Building2 } from "lucide-react";
import { UNIDADES_VENDA, VENDEDORES_ATACADO } from "@/lib/constants";

interface Venda {
  id: string;
  unidade: string | null;
  modelo: string | null;
  valor_total: number | null;
  vendedor_id: string;
  unidade_negocio: string | null;
  data_venda: string | null;
  created_at: string;
  vendedor: { nome: string } | null;
}

interface Vendedor { id: string; nome: string; email: string; ativo: boolean }

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const medalha = ["text-yellow-500", "text-gray-400", "text-amber-700"];

interface RankingVendasProps {
  // Faturamento total da empresa: só o gestor vê.
  podeVerFaturamento: boolean;
}

export function RankingVendas({ podeVerFaturamento }: RankingVendasProps) {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [periodo, setPeriodo] = useState<string>(`${now.getFullYear()}-${now.getMonth()}`);
  // Competência: a venda pertence ao mês em que aconteceu (data_venda), não ao
  // mês em que foi cadastrada. Nota antiga importada hoje entra no mês certo.
  const competencia = (v: Venda) => (v.data_venda ?? v.created_at).slice(0, 10);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [vRes, pRes] = await Promise.all([
        supabase.from("vendas").select("*, vendedor:profiles!vendedor_id(nome)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, nome, email, ativo").eq("role", "vendedor").order("nome"),
      ]);
      setVendas((vRes.data ?? []) as unknown as Venda[]);
      setVendedores((pRes.data ?? []) as unknown as Vendedor[]);
      setLoading(false);
    }
    load();
  }, []);

  const [ano, mes] = periodo.split("-").map(Number);
  const doPeriodo = vendas.filter((v) => {
    const iso = competencia(v);
    const a = Number(iso.slice(0, 4));
    const m = Number(iso.slice(5, 7)) - 1;
    return a === ano && (mes === -1 || m === mes);
  });

  // Separa varejo x atacado
  const vendasVarejo = doPeriodo.filter((v) => (v.unidade_negocio ?? "varejo") !== "atacado");
  const vendasAtacado = doPeriodo.filter((v) => v.unidade_negocio === "atacado");

  const ativos = vendedores.filter((v) => v.ativo);

  // Ranking do VAREJO: só vendedores ativos, individualmente.
  // Vendas de quem saiu da equipe não entram no ranking (mas continuam no faturamento).
  const porVendedor = ativos.map((vd) => {
    const suas = vendasVarejo.filter((v) => v.vendedor_id === vd.id);
    return { id: vd.id, nome: vd.nome, qtd: suas.length, total: suas.reduce((s, v) => s + (v.valor_total ?? 0), 0) };
  });
  porVendedor.sort((a, b) => b.total - a.total || b.qtd - a.qtd);

  // Atacado (Julia + Robert): total somado e dividido 50/50
  const totalAtacado = vendasAtacado.reduce((s, v) => s + (v.valor_total ?? 0), 0);
  const qtdAtacado = vendasAtacado.length;
  const duplaAtacado = vendedores.filter((v) => VENDEDORES_ATACADO.includes((v.email || "").toLowerCase()));

  const maxTotal = Math.max(1, ...porVendedor.map((v) => v.total));
  // Faturamento e volume do período: todas as vendas, inclusive de quem saiu da
  // equipe e do atacado. Não depende de quem aparece no ranking.
  const totalGeral = doPeriodo.reduce((s, v) => s + (v.valor_total ?? 0), 0);
  const qtdGeral = doPeriodo.length;
  const venderam = porVendedor.filter((v) => v.qtd > 0).length;

  // Visão geral por unidade
  const porUnidade = UNIDADES_VENDA.map((u) => {
    const vu = doPeriodo.filter((v) => v.unidade === u);
    return { unidade: u, qtd: vu.length, total: vu.reduce((s, v) => s + (v.valor_total ?? 0), 0) };
  });
  const maxUnidade = Math.max(1, ...porUnidade.map((u) => u.total));

  // Opções: os últimos 12 meses (mais recente primeiro) e o fechamento de cada
  // ano com venda registrada. Permite comparar 3, 6 ou 12 meses para trás.
  const opcoes: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opcoes.push({
      value: `${d.getFullYear()}-${d.getMonth()}`,
      label: `${MESES[d.getMonth()]}/${d.getFullYear()}${i === 0 ? " (atual)" : ""}`,
    });
  }
  const anosComVenda = Array.from(new Set(vendas.map((v) => Number(competencia(v).slice(0, 4)))))
    .filter((a) => !Number.isNaN(a))
    .sort((a, b) => b - a);
  for (const a of anosComVenda) opcoes.push({ value: `${a}--1`, label: `Ano ${a} (fechamento)` });

  const periodoLabel = opcoes.find((op) => op.value === periodo)?.label ?? "";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" /> Ranking & Competição
          </h1>
          <p className="text-muted-foreground text-sm">Por competência mensal — a venda conta no mês em que foi feita. Varejo por vendedor e Atacado 50/50.</p>
        </div>
        <Select items={Object.fromEntries(opcoes.map((o) => [o.value, o.label]))} value={periodo} onValueChange={(v) => v && setPeriodo(v)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className={`grid gap-4 ${podeVerFaturamento ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {podeVerFaturamento && (
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Faturamento — {periodoLabel}
            </p>
            <p className="text-2xl font-bold mt-1 text-primary">{brl(totalGeral)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Por competência: cada venda conta no mês em que aconteceu, não no mês
              em que foi cadastrada.
            </p>
          </CardContent></Card>
        )}
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Bike className="h-3 w-3" /> Motos vendidas</p>
          <p className="text-2xl font-bold mt-1">{qtdGeral}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Vendedores que venderam</p>
          <p className="text-2xl font-bold mt-1">{venderam} <span className="text-base text-muted-foreground font-normal">/ {ativos.length}</span></p>
        </CardContent></Card>
      </div>

      {/* Atacado — Julia + Robert, dividido 50/50 */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-purple-600" /> Atacado — Julia & Robert (50/50)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Total do atacado no período</p>
              <p className="text-2xl font-bold text-purple-700">{brl(totalAtacado)}</p>
              <p className="text-xs text-muted-foreground">{qtdAtacado} venda(s) de atacado</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              As vendas de atacado são somadas e divididas igualmente entre Julia e Robert,
              independentemente de quem lançou cada uma.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(duplaAtacado.length ? duplaAtacado : [{ id: "j", nome: "Julia" }, { id: "r", nome: "Robert" }]).map((v) => (
              <div key={v.id} className="rounded-lg border bg-white p-3 text-center">
                <p className="text-sm font-medium">{v.nome}</p>
                <p className="text-xl font-bold text-purple-700 mt-1">{brl(totalAtacado / 2)}</p>
                <p className="text-[11px] text-muted-foreground">50% do atacado</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ranking do VAREJO — gráfico de barras */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Medal className="h-4 w-4" /> Ranking de vendedores — Varejo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {porVendedor.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum vendedor cadastrado.</p>
          ) : porVendedor.map((v, i) => (
            <div key={v.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  {i < 3
                    ? <Trophy className={`h-4 w-4 ${medalha[i]}`} />
                    : <span className="w-4 text-center text-xs text-muted-foreground">{i + 1}</span>}
                  {v.nome}
                  {v.qtd === 0 && <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-[10px]">sem vendas</Badge>}
                </span>
                <span className="text-muted-foreground">{v.qtd} moto(s) • <span className="font-semibold text-foreground">{brl(v.total)}</span></span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-600" : "bg-primary/60"}`}
                  style={{ width: `${Math.max(v.total > 0 ? 4 : 0, (v.total / maxTotal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Visão geral por unidade */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Store className="h-4 w-4" /> Visão geral das unidades</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {porUnidade.map((u) => (
            <div key={u.unidade} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{u.unidade}</span>
                <span className="text-muted-foreground">{u.qtd} moto(s) • <span className="font-semibold text-foreground">{brl(u.total)}</span></span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max(u.total > 0 ? 4 : 0, (u.total / maxUnidade) * 100)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
