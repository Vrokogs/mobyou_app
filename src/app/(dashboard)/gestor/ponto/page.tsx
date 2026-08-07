"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Clock, AlertTriangle, Users, CalendarDays } from "lucide-react";
import type { FolhaPonto } from "@/types/database";

interface PontoRow extends FolhaPonto {
  colaborador: { nome: string; role: string } | null;
}

const hora = (ts: string | null) =>
  ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

export default function GestorPontoPage() {
  const [rows, setRows] = useState<PontoRow[]>([]);
  const [data, setData] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: d } = await supabase
        .from("folha_ponto")
        .select("*, colaborador:profiles!colaborador_id(nome, role)")
        .eq("data", data)
        .order("entrada", { ascending: true });
      setRows((d ?? []) as unknown as PontoRow[]);
      setLoading(false);
    }
    load();
  }, [data]);

  const comAtraso = rows.filter((r) => r.atraso_minutos > 0);
  const presentes = rows.filter((r) => r.entrada);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-6 w-6" /> Folha de Ponto — Equipe
          </h1>
          <p className="text-muted-foreground text-sm">Registros de entrada, almoço e saída dos colaboradores</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Data</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Presentes</p>
            <p className="text-2xl font-bold mt-1">{presentes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Com atraso</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{comAtraso.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total de registros</p>
            <p className="text-2xl font-bold mt-1">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro de ponto nesta data.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Almoço</TableHead>
                    <TableHead>Volta</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Atraso</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.colaborador?.nome ?? "—"}
                        <span className="block text-xs text-muted-foreground capitalize">{r.colaborador?.role}</span>
                      </TableCell>
                      <TableCell className="font-mono">{hora(r.entrada)}</TableCell>
                      <TableCell className="font-mono">{hora(r.almoco_saida)}</TableCell>
                      <TableCell className="font-mono">{hora(r.almoco_volta)}</TableCell>
                      <TableCell className="font-mono">{hora(r.saida)}</TableCell>
                      <TableCell>
                        {r.atraso_minutos > 0
                          ? <Badge variant="secondary" className="bg-red-100 text-red-800">{r.atraso_minutos} min</Badge>
                          : <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Em dia</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-sm text-muted-foreground">
                        {r.justificativa || (r.atraso_minutos > 0 ? "—" : "")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
