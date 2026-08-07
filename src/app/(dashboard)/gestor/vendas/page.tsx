"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { DollarSign, MapPin, TrendingUp, Store, Users, Bike, CalendarRange } from "lucide-react";
import { UNIDADES_VENDA } from "@/lib/constants";

interface Venda {
  id: string;
  unidade: string | null;
  modelo: string | null;
  valor_total: number | null;
  forma_pagamento: string;
  origem: string | null;
  vendedor_id: string;
  created_at: string;
  cliente: { nome: string } | null;
  vendedor: { nome: string } | null;
}

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export default function GestorVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("vendas")
        .select("*, cliente:profiles!cliente_id(nome), vendedor:profiles!vendedor_id(nome)")
        .order("created_at", { ascending: false });
      setVendas((data ?? []) as unknown as Venda[]);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();
  const doMes = (v: Venda) => {
    const d = new Date(v.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };
  const doAno = (v: Venda) => new Date(v.created_at).getFullYear() === now.getFullYear();
  const vendasMes = vendas.filter(doMes);
  const totalMes = vendasMes.reduce((s, v) => s + (v.valor_total ?? 0), 0);

  // Faturamento anual acumulado
  const vendasAno = vendas.filter(doAno);
  const totalAno = vendasAno.reduce((s, v) => s + (v.valor_total ?? 0), 0);

  // Números por vendedor (no mês)
  const porVendedorMap: Record<string, { nome: string; qtd: number; total: number }> = {};
  for (const v of vendasMes) {
    const nome = v.vendedor?.nome ?? "Sem vendedor";
    porVendedorMap[nome] = porVendedorMap[nome] || { nome, qtd: 0, total: 0 };
    porVendedorMap[nome].qtd += 1;
    porVendedorMap[nome].total += v.valor_total ?? 0;
  }
  const porVendedor = Object.values(porVendedorMap).sort((a, b) => b.total - a.total);

  // Unidades: as 3 lojas + qualquer outra presente nos dados
  const unidades = Array.from(
    new Set([...UNIDADES_VENDA, ...vendas.map((v) => v.unidade || "Sem unidade")])
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-6 w-6" /> Vendas por Loja
        </h1>
        <p className="text-muted-foreground text-sm">
          Vendas do mês de {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Faturamento anual acumulado */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardContent className="pt-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarRange className="h-3 w-3" /> Faturamento acumulado {now.getFullYear()}
            </p>
            <p className="text-3xl font-bold mt-1 text-primary">{brl(totalAno)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Bike className="h-3 w-3" /> Motos no ano</p>
            <p className="text-2xl font-bold mt-1">{vendasAno.length}</p>
          </div>
        </CardContent>
      </Card>

      {/* Cards de total do mês por loja + total geral */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {UNIDADES_VENDA.map((u) => {
          const vu = vendasMes.filter((v) => v.unidade === u);
          const total = vu.reduce((s, v) => s + (v.valor_total ?? 0), 0);
          return (
            <Card key={u}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Store className="h-3 w-3" /> {u}
                </p>
                <p className="text-xl font-bold mt-1">{brl(total)}</p>
                <p className="text-xs text-muted-foreground">{vu.length} venda(s) no mês</p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Total das 3 lojas (mês)
            </p>
            <p className="text-xl font-bold mt-1 text-primary">{brl(totalMes)}</p>
            <p className="text-xs text-muted-foreground">{vendasMes.length} venda(s) no mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Números por vendedor (mês) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Vendas por vendedor — {now.toLocaleDateString("pt-BR", { month: "long" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {porVendedor.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma venda registrada no mês.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Qtd. motos</TableHead>
                  <TableHead>Valor total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porVendedor.map((v) => (
                  <TableRow key={v.nome}>
                    <TableCell className="font-medium">{v.nome}</TableCell>
                    <TableCell><Badge variant="secondary">{v.qtd}</Badge></TableCell>
                    <TableCell className="font-semibold">{brl(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Por loja: parcial por modelo + lista de cada venda */}
      {unidades.map((u) => {
        const vu = vendas.filter((v) => (v.unidade || "Sem unidade") === u);
        const vuMes = vu.filter(doMes);
        if (vu.length === 0) return null;
        // parcial por modelo (mês)
        const porModelo: Record<string, { qtd: number; total: number }> = {};
        for (const v of vuMes) {
          const m = v.modelo || "Sem modelo";
          porModelo[m] = porModelo[m] || { qtd: 0, total: 0 };
          porModelo[m].qtd += 1;
          porModelo[m].total += v.valor_total ?? 0;
        }
        const totalLoja = vuMes.reduce((s, v) => s + (v.valor_total ?? 0), 0);
        return (
          <Card key={u}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" /> {u}
                </span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {brl(totalLoja)} no mês
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Parcial por moto */}
              {Object.keys(porModelo).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Vendas por moto (mês)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(porModelo).map(([m, info]) => (
                      <div key={m} className="rounded-md border px-3 py-1.5 text-sm">
                        <span className="font-medium">{m}</span>{" "}
                        <span className="text-muted-foreground">
                          — {info.qtd}x • {brl(info.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cada venda da unidade */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vu.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>{new Date(v.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{v.modelo ?? "---"}</TableCell>
                      <TableCell>{v.vendedor?.nome ?? "---"}</TableCell>
                      <TableCell>{v.cliente?.nome ?? "---"}</TableCell>
                      <TableCell>{brl(v.valor_total ?? 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
