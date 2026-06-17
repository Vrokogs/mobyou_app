"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface FinanceiroData {
  receita_mensal: number;
  ticket_medio: number;
  receita_anual: number;
  custos: number;
  lucro: number;
  vendas_recentes: Array<{
    id: string;
    cliente_nome: string;
    valor: number;
    data: string;
    tipo: string;
  }>;
  receita_por_mes: Array<{ mes: string; valor: number }>;
}

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ano, setAno] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    loadData();
  }, [ano]);

  async function loadData() {
    setLoading(true);
    const supabase = createClient();
    const anoNum = parseInt(ano);
    const startOfYear = new Date(anoNum, 0, 1).toISOString();
    const endOfYear = new Date(anoNum, 11, 31, 23, 59, 59).toISOString();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: vendas } = await supabase
      .from("vendas")
      .select("id, valor_total, created_at, cliente:profiles!vendas_cliente_id_fkey(nome)")
      .gte("created_at", startOfYear)
      .lte("created_at", endOfYear)
      .order("created_at", { ascending: false });

    const { data: orcamentos } = await supabase
      .from("orcamentos")
      .select("valor_total, created_at")
      .eq("status", "aprovado")
      .gte("created_at", startOfYear)
      .lte("created_at", endOfYear);

    const vendasArr = vendas || [];
    const orcArr = orcamentos || [];

    const receitaVendas = vendasArr.reduce((sum, v) => sum + (v.valor_total || 0), 0);
    const receitaServicos = orcArr.reduce((sum, o) => sum + (o.valor_total || 0), 0);
    const receitaTotal = receitaVendas + receitaServicos;

    const vendasMes = vendasArr.filter(v => v.created_at >= startOfMonth);
    const orcMes = orcArr.filter(o => o.created_at >= startOfMonth);
    const receitaMensal = vendasMes.reduce((sum, v) => sum + (v.valor_total || 0), 0) +
      orcMes.reduce((sum, o) => sum + (o.valor_total || 0), 0);

    const totalTransacoes = vendasArr.length + orcArr.length;
    const ticketMedio = totalTransacoes > 0 ? receitaTotal / totalTransacoes : 0;

    const receitaPorMes = MESES.map((mes, idx) => {
      const mesVendas = vendasArr.filter(v => new Date(v.created_at).getMonth() === idx).reduce((s, v) => s + (v.valor_total || 0), 0);
      const mesOrc = orcArr.filter(o => new Date(o.created_at).getMonth() === idx).reduce((s, o) => s + (o.valor_total || 0), 0);
      return { mes, valor: mesVendas + mesOrc };
    });

    const vendasRecentes = vendasArr.slice(0, 10).map(v => ({
      id: v.id,
      cliente_nome: (v.cliente as { nome: string } | null)?.nome || "—",
      valor: v.valor_total,
      data: v.created_at,
      tipo: "Venda",
    }));

    setData({
      receita_mensal: receitaMensal,
      ticket_medio: ticketMedio,
      receita_anual: receitaTotal,
      custos: 0,
      lucro: receitaTotal,
      vendas_recentes: vendasRecentes,
      receita_por_mes: receitaPorMes,
    });
    setLoading(false);
  }

  const maxVal = data ? Math.max(...data.receita_por_mes.map(r => r.valor), 1) : 1;

  const cards = [
    { title: "Receita Mensal", value: data?.receita_mensal, icon: DollarSign, color: "text-emerald-600" },
    { title: "Ticket Médio", value: data?.ticket_medio, icon: TrendingUp, color: "text-blue-600" },
    { title: "Receita Anual", value: data?.receita_anual, icon: BarChart3, color: "text-violet-600" },
    { title: "Lucro", value: data?.lucro, icon: TrendingUp, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Visão geral financeira</p>
        </div>
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[2024, 2025, 2026, 2027].map(a => <SelectItem key={a} value={a.toString()}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <p className="text-2xl font-bold">
                  R$ {(c.value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Receita por Mês</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <div className="flex items-end gap-2 h-48">
              {data?.receita_por_mes.map(r => (
                <div key={r.mes} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {r.valor > 0 ? `R$ ${(r.valor / 1000).toFixed(0)}k` : ""}
                  </span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm min-h-[4px] transition-all"
                    style={{ height: `${Math.max((r.valor / maxVal) * 100, 2)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{r.mes}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transações Recentes</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.vendas_recentes.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma transação</TableCell></TableRow>
                ) : data?.vendas_recentes.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.cliente_nome}</TableCell>
                    <TableCell>{v.tipo}</TableCell>
                    <TableCell>R$ {v.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>{new Date(v.data).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
