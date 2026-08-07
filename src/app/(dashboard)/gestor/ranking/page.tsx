"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Trophy, Medal, TrendingUp, Store, Bike } from "lucide-react";
import { UNIDADES_VENDA } from "@/lib/constants";

interface Venda {
  id: string;
  unidade: string | null;
  modelo: string | null;
  valor_total: number | null;
  vendedor_id: string;
  created_at: string;
  vendedor: { nome: string } | null;
}

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const medalha = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function GestorRankingPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [periodo, setPeriodo] = useState<string>(`${now.getFullYear()}-${now.getMonth()}`);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [vRes, pRes] = await Promise.all([
        supabase.from("vendas").select("*, vendedor:profiles!vendedor_id(nome)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, nome").eq("role", "vendedor").eq("ativo", true).order("nome"),
      ]);
      setVendas((vRes.data ?? []) as unknown as Venda[]);
      setVendedores((pRes.data ?? []) as { id: string; nome: string }[]);
      setLoading(false);
    }
    load();
  }, []);

  const [ano, mes] = periodo.split("-").map(Number);
  const doPeriodo = vendas.filter((v) => {
    const d = new Date(v.created_at);
    return d.getFullYear() === ano && (mes === -1 || d.getMonth() === mes);
  });

  // Ranking: inclui TODOS os vendedores (mesmo os que não venderam)
  const porVendedor = vendedores.map((vd) => {
    const suas = doPeriodo.filter((v) => v.vendedor_id === vd.id);
    return {
      id: vd.id,
      nome: vd.nome,
      qtd: suas.length,
      total: suas.reduce((s, v) => s + (v.valor_total ?? 0), 0),
    };
  }).sort((a, b) => b.total - a.total || b.qtd - a.qtd);

  const maxTotal = Math.max(1, ...porVendedor.map((v) => v.total));
  const totalGeral = porVendedor.reduce((s, v) => s + v.total, 0);
  const qtdGeral = porVendedor.reduce((s, v) => s + v.qtd, 0);
  const venderam = porVendedor.filter((v) => v.qtd > 0).length;

  // Visão geral por unidade
  const porUnidade = UNIDADES_VENDA.map((u) => {
    const vu = doPeriodo.filter((v) => v.unidade === u);
    return { unidade: u, qtd: vu.length, total: vu.reduce((s, v) => s + (v.valor_total ?? 0), 0) };
  });
  const maxUnidade = Math.max(1, ...porUnidade.map((u) => u.total));

  // opções de período: cada mês do ano corrente + "ano todo"
  const opcoes = [
    { value: `${now.getFullYear()}--1`, label: `Ano ${now.getFullYear()} (todo)` },
    ...MESES.map((m, i) => ({ value: `${now.getFullYear()}-${i}`, label: `${m}/${now.getFullYear()}` })),
  ];

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
          <p className="text-muted-foreground text-sm">Desempenho dos vendedores e visão geral das unidades</p>
        </div>
        <Select value={periodo} onValueChange={(v) => v && setPeriodo(v)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Faturamento do período</p>
          <p className="text-2xl font-bold mt-1 text-primary">{brl(totalGeral)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Bike className="h-3 w-3" /> Motos vendidas</p>
          <p className="text-2xl font-bold mt-1">{qtdGeral}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Vendedores que venderam</p>
          <p className="text-2xl font-bold mt-1">{venderam} <span className="text-base text-muted-foreground font-normal">/ {vendedores.length}</span></p>
        </CardContent></Card>
      </div>

      {/* Ranking de vendedores — gráfico de barras */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Medal className="h-4 w-4" /> Ranking de vendedores</CardTitle></CardHeader>
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
