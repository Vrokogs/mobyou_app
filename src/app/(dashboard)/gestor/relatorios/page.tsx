"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BarChart3, Store, Boxes, Wrench, Building2, Layers } from "lucide-react";
import { UNIDADES_NEGOCIO } from "@/lib/constants";

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface Linha { valor_total: number | null; unidade_negocio?: string | null; created_at: string }

export default function GestorRelatoriosPage() {
  const [vendas, setVendas] = useState<Linha[]>([]);
  const [ordens, setOrdens] = useState<Linha[]>([]);
  const [pecas, setPecas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [periodo, setPeriodo] = useState<string>(`${now.getFullYear()}-${now.getMonth()}`);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [v, o, p] = await Promise.all([
        supabase.from("vendas").select("valor_total, unidade_negocio, created_at"),
        supabase.from("ordens_servico").select("valor_total, created_at"),
        supabase.from("vendas_pecas").select("valor_total, created_at"),
      ]);
      setVendas((v.data ?? []) as unknown as Linha[]);
      setOrdens((o.data ?? []) as unknown as Linha[]);
      setPecas((p.data ?? []) as unknown as Linha[]);
      setLoading(false);
    }
    load();
  }, []);

  const [ano, mes] = periodo.split("-").map(Number);
  const noPeriodo = (c: string) => {
    const d = new Date(c);
    return d.getFullYear() === ano && (mes === -1 || d.getMonth() === mes);
  };
  const soma = (arr: Linha[]) => arr.filter((x) => noPeriodo(x.created_at)).reduce((s, x) => s + (x.valor_total ?? 0), 0);
  const qtd = (arr: Linha[]) => arr.filter((x) => noPeriodo(x.created_at)).length;

  const vendasPeriodo = vendas.filter((v) => noPeriodo(v.created_at));
  const varejo = vendasPeriodo.filter((v) => (v.unidade_negocio ?? "varejo") === "varejo");
  const atacado = vendasPeriodo.filter((v) => v.unidade_negocio === "atacado");

  const unidades = [
    { key: "varejo", label: "Varejo", icon: Store, color: "text-blue-600", total: varejo.reduce((s, v) => s + (v.valor_total ?? 0), 0), qtd: varejo.length },
    { key: "atacado", label: "Atacado", icon: Building2, color: "text-purple-600", total: atacado.reduce((s, v) => s + (v.valor_total ?? 0), 0), qtd: atacado.length },
    { key: "pecas", label: "Peças de reposição", icon: Boxes, color: "text-amber-600", total: soma(pecas), qtd: qtd(pecas) },
    { key: "oficina", label: "Oficina", icon: Wrench, color: "text-emerald-600", total: soma(ordens), qtd: qtd(ordens) },
  ];
  const consolidado = unidades.reduce((s, u) => s + u.total, 0);
  const maxU = Math.max(1, ...unidades.map((u) => u.total));

  const opcoes = [
    { value: `${now.getFullYear()}--1`, label: `Ano ${now.getFullYear()} (todo)` },
    ...MESES.map((m, i) => ({ value: `${now.getFullYear()}-${i}`, label: `${m}/${now.getFullYear()}` })),
  ];

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-56" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Relatórios por unidade de negócio
          </h1>
          <p className="text-muted-foreground text-sm">Varejo, Atacado, Peças e Oficina — separados e consolidado</p>
        </div>
        <Select items={Object.fromEntries(opcoes.map((o) => [o.value, o.label]))} value={periodo} onValueChange={(v) => v && setPeriodo(v)}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>{opcoes.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Consolidado */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="pt-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" /> Consolidado da empresa</p>
            <p className="text-3xl font-bold mt-1 text-primary">{brl(consolidado)}</p>
          </div>
          <p className="text-xs text-muted-foreground">Soma das 4 unidades no período</p>
        </CardContent>
      </Card>

      {/* Cards por unidade */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {unidades.map((u) => (
          <Card key={u.key}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><u.icon className={`h-3 w-3 ${u.color}`} /> {u.label}</p>
              <p className="text-2xl font-bold mt-1">{brl(u.total)}</p>
              <p className="text-xs text-muted-foreground">{u.qtd} lançamento(s)</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparativo em barras */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Comparativo das unidades</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {unidades.map((u) => (
            <div key={u.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium"><u.icon className={`h-4 w-4 ${u.color}`} /> {u.label}</span>
                <span className="text-muted-foreground">{consolidado > 0 ? Math.round((u.total / consolidado) * 100) : 0}% • <span className="font-semibold text-foreground">{brl(u.total)}</span></span>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${(u.total / maxU) * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {UNIDADES_NEGOCIO.map((u) => u.label).join(" · ")} — cada unidade soma suas próprias transações no período selecionado.
      </p>
    </div>
  );
}
