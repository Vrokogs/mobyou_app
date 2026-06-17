"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DollarSign, TrendingUp, TrendingDown, BarChart3, Receipt, Target,
} from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface VendaRow {
  id: string;
  numero: string;
  valor: number;
  valor_final: number;
  valor_desconto: number;
  forma_pagamento: string;
  parcelas: number | null;
  data_venda: string;
  status: string;
  cliente?: { nome: string } | null;
  scooter?: { modelo: string } | null;
  vendedor?: { nome: string } | null;
}

interface OrcRow {
  valor_total: number;
  created_at: string;
}

export default function FinanceiroPage() {
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [monthlyData, setMonthlyData] = useState<{ month: string; total: number }[]>([]);
  const [servicosReceita, setServicosReceita] = useState(0);

  const loadFinanceiro = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);

    // Vendas do mes selecionado
    const startDate = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data: vendasData } = await supabase
      .from("vendas")
      .select("*, cliente:profiles!vendas_cliente_id_fkey(nome), scooter:scooters!vendas_scooter_id_fkey(modelo), vendedor:profiles!vendas_vendedor_id_fkey(nome)")
      .gte("data_venda", startDate)
      .lte("data_venda", endDate)
      .order("data_venda", { ascending: false });

    setVendas((vendasData ?? []) as VendaRow[]);

    // Orcamentos aprovados (servicos) no mes
    const { data: orcData } = await supabase
      .from("orcamentos")
      .select("valor_total, created_at")
      .gte("created_at", `${startDate}T00:00:00`)
      .lte("created_at", `${endDate}T23:59:59`);

    const orcArr = (orcData ?? []) as OrcRow[];
    setServicosReceita(orcArr.reduce((sum, o) => sum + (o.valor_total || 0), 0));

    // Dados anuais para grafico
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    const [yearVendas, yearOrc] = await Promise.all([
      supabase.from("vendas").select("valor_final, data_venda").gte("data_venda", yearStart).lte("data_venda", yearEnd),
      supabase.from("orcamentos").select("valor_total, created_at").gte("created_at", `${yearStart}T00:00:00`).lte("created_at", `${yearEnd}T23:59:59`),
    ]);

    const monthTotals: Record<number, number> = {};
    (yearVendas.data ?? []).forEach((v: { valor_final: number; data_venda: string }) => {
      const m = new Date(v.data_venda).getMonth();
      monthTotals[m] = (monthTotals[m] || 0) + (v.valor_final || 0);
    });
    (yearOrc.data ?? []).forEach((o: { valor_total: number; created_at: string }) => {
      const m = new Date(o.created_at).getMonth();
      monthTotals[m] = (monthTotals[m] || 0) + (o.valor_total || 0);
    });

    const chartData = Array.from({ length: 12 }, (_, i) => ({
      month: MONTHS[i].slice(0, 3),
      total: monthTotals[i] || 0,
    }));

    setMonthlyData(chartData);
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadFinanceiro();
  }, [loadFinanceiro]);

  const receitaVendas = vendas.reduce((acc, v) => acc + (v.valor_final || 0), 0);
  const receitaMensal = receitaVendas + servicosReceita;
  const totalTransacoes = vendas.length;
  const ticketMedio = totalTransacoes > 0 ? receitaVendas / totalTransacoes : 0;
  const receitaAnual = monthlyData.reduce((acc, m) => acc + m.total, 0);
  const descontosMensal = vendas.reduce((acc, v) => acc + (v.valor_desconto || 0), 0);
  const custos = receitaMensal * 0.6;
  const lucro = receitaMensal - custos;

  const maxChartValue = Math.max(...monthlyData.map((m) => m.total), 1);

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Visao geral das financas da empresa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={(v: string | null) => setSelectedMonth(v ?? "")}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, i) => (
                <SelectItem key={i} value={String(i + 1)}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={(v: string | null) => setSelectedYear(v ?? "")}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Receita Mensal</p>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(receitaMensal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalTransacoes} vendas + servicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Ticket Medio</p>
              <Target className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(ticketMedio)}</p>
            <p className="text-xs text-muted-foreground mt-1">por venda</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Receita Anual</p>
              <TrendingUp className="h-4 w-4 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-violet-600">{formatCurrency(receitaAnual)}</p>
            <p className="text-xs text-muted-foreground mt-1">{selectedYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Custos Est.</p>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(custos)}</p>
            <p className="text-xs text-muted-foreground mt-1">~60% da receita</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Lucro Est.</p>
              <BarChart3 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(lucro)}</p>
            <p className="text-xs text-muted-foreground mt-1">~40% margem</p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Receita Mensal - {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((data, i) => {
              const height = maxChartValue > 0 ? (data.total / maxChartValue) * 100 : 0;
              const isCurrentMonth = i + 1 === parseInt(selectedMonth);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {data.total > 0 ? `${(data.total / 1000).toFixed(0)}k` : ""}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isCurrentMonth
                        ? "bg-primary"
                        : data.total > 0
                        ? "bg-primary/30"
                        : "bg-muted"
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${MONTHS[i]}: ${formatCurrency(data.total)}`}
                  />
                  <span className={`text-xs ${isCurrentMonth ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {data.month}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transacoes - {MONTHS[parseInt(selectedMonth) - 1]} {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma transacao encontrada neste periodo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Scooter</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendas.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-mono text-xs">{venda.numero}</TableCell>
                    <TableCell className="font-medium">{venda.cliente?.nome ?? "---"}</TableCell>
                    <TableCell>{venda.scooter?.modelo ?? "---"}</TableCell>
                    <TableCell className="text-sm">{venda.vendedor?.nome ?? "---"}</TableCell>
                    <TableCell>{formatCurrency(venda.valor)}</TableCell>
                    <TableCell className="text-orange-600">
                      {venda.valor_desconto > 0 ? `-${formatCurrency(venda.valor_desconto)}` : "---"}
                    </TableCell>
                    <TableCell className="font-bold text-green-700">
                      {formatCurrency(venda.valor_final)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {venda.forma_pagamento?.replace("_", " ") ?? "---"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(venda.data_venda)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          venda.status === "concluida"
                            ? "bg-green-100 text-green-800"
                            : venda.status === "cancelada"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {venda.status}
                      </Badge>
                    </TableCell>
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
