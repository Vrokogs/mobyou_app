"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Clock, LogIn, Coffee, Utensils, LogOut, AlertTriangle, Loader2 } from "lucide-react";
import { PONTO_ENTRADA_PADRAO, PONTO_TOLERANCIA_MIN } from "@/lib/constants";
import type { FolhaPonto } from "@/types/database";

const hora = (ts: string | null) =>
  ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—";

function calcAtraso(entradaISO: string): number {
  const e = new Date(entradaISO);
  const [h, m] = PONTO_ENTRADA_PADRAO.split(":").map(Number);
  const limite = new Date(e);
  limite.setHours(h, m + PONTO_TOLERANCIA_MIN, 0, 0);
  if (e <= limite) return 0;
  const base = new Date(e);
  base.setHours(h, m, 0, 0);
  return Math.round((e.getTime() - base.getTime()) / 60000);
}

export default function VendedorPontoPage() {
  const [hoje, setHoje] = useState<FolhaPonto | null>(null);
  const [historico, setHistorico] = useState<FolhaPonto[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hojeStr = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data: hist } = await supabase
      .from("folha_ponto")
      .select("*")
      .eq("colaborador_id", user.id)
      .order("data", { ascending: false })
      .limit(30);

    const rows = (hist ?? []) as unknown as FolhaPonto[];
    setHistorico(rows);
    const doDia = rows.find((r) => r.data === hojeStr) ?? null;
    setHoje(doDia);
    setJustificativa(doDia?.justificativa ?? "");
    setLoading(false);
  }, [hojeStr]);

  useEffect(() => { load(); }, [load]);

  async function marcar(campo: "entrada" | "almoco_saida" | "almoco_volta" | "saida") {
    if (!userId) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const agora = new Date().toISOString();
      const patch: Record<string, unknown> = { [campo]: agora };
      if (campo === "entrada") patch.atraso_minutos = calcAtraso(agora);

      if (hoje) {
        const { error } = await (supabase.from("folha_ponto") as any)
          .update(patch).eq("id", hoje.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("folha_ponto") as any).insert({
          colaborador_id: userId,
          data: hojeStr,
          ...patch,
        });
        if (error) throw error;
      }
      const labels = { entrada: "Entrada", almoco_saida: "Saída p/ almoço", almoco_volta: "Volta do almoço", saida: "Saída" };
      toast.success(`${labels[campo]} registrada às ${new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      await load();
    } catch (e) {
      toast.error("Erro ao registrar ponto", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  async function salvarJustificativa() {
    if (!hoje) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("folha_ponto") as any)
        .update({ justificativa }).eq("id", hoje.id);
      if (error) throw error;
      toast.success("Justificativa salva.");
      await load();
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const atraso = hoje?.atraso_minutos ?? 0;
  const etapas: { campo: "entrada" | "almoco_saida" | "almoco_volta" | "saida"; label: string; icon: React.ReactNode; done: boolean; libera: boolean }[] = [
    { campo: "entrada", label: "Entrada", icon: <LogIn className="h-5 w-5" />, done: !!hoje?.entrada, libera: true },
    { campo: "almoco_saida", label: "Saída p/ almoço", icon: <Coffee className="h-5 w-5" />, done: !!hoje?.almoco_saida, libera: !!hoje?.entrada },
    { campo: "almoco_volta", label: "Volta do almoço", icon: <Utensils className="h-5 w-5" />, done: !!hoje?.almoco_volta, libera: !!hoje?.almoco_saida },
    { campo: "saida", label: "Saída", icon: <LogOut className="h-5 w-5" />, done: !!hoje?.saida, libera: !!hoje?.entrada },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Clock className="h-6 w-6" /> Folha de Ponto
        </h1>
        <p className="text-muted-foreground text-sm">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Registro de hoje</span>
            {atraso > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-800 gap-1">
                <AlertTriangle className="h-3 w-3" /> Atraso de {atraso} min
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {etapas.map((et) => (
              <div key={et.campo} className="flex flex-col items-center gap-2 rounded-lg border p-3">
                <div className={`rounded-full p-2 ${et.done ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {et.icon}
                </div>
                <span className="text-xs font-medium text-center">{et.label}</span>
                <span className="text-sm font-mono">{hora(hoje?.[et.campo] ?? null)}</span>
                <Button size="sm" variant={et.done ? "outline" : "default"} className="w-full"
                  disabled={saving || et.done || !et.libera}
                  onClick={() => marcar(et.campo)}>
                  {et.done ? "OK" : "Marcar"}
                </Button>
              </div>
            ))}
          </div>

          {atraso > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
              <Label className="text-xs flex items-center gap-1 text-red-800">
                <AlertTriangle className="h-3 w-3" /> Justificativa do atraso
              </Label>
              <Textarea rows={2} placeholder="Explique o motivo do atraso..."
                value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
              <Button size="sm" onClick={salvarJustificativa} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Salvar justificativa
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Histórico (últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum registro ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Almoço</TableHead>
                    <TableHead>Volta</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Atraso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.data + "T12:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-mono">{hora(r.entrada)}</TableCell>
                      <TableCell className="font-mono">{hora(r.almoco_saida)}</TableCell>
                      <TableCell className="font-mono">{hora(r.almoco_volta)}</TableCell>
                      <TableCell className="font-mono">{hora(r.saida)}</TableCell>
                      <TableCell>
                        {r.atraso_minutos > 0
                          ? <Badge variant="secondary" className="bg-red-100 text-red-800">{r.atraso_minutos} min</Badge>
                          : <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Em dia</Badge>}
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
