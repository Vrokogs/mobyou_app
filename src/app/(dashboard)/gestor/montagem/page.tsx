"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Wrench, Plus, Clock, Loader2, Package } from "lucide-react";
import { MOBYOU_MODELOS, UNIDADES_ESTOQUE, VALOR_HORA_MONTAGEM, MONTAGEM_STATUS } from "@/lib/constants";
import type { Montagem } from "@/types/database";

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const EMPTY = {
  modelo: "", unidade: "", chassi: "",
  data_agendada: "", prazo: "",
  horas: "1", valor_hora: String(VALOR_HORA_MONTAGEM),
  status: "agendada", observacoes: "",
};

const statusColor: Record<string, string> = {
  agendada: "bg-blue-100 text-blue-800",
  em_montagem: "bg-amber-100 text-amber-800",
  concluida: "bg-emerald-100 text-emerald-800",
};

const fmtDT = (ts: string | null) =>
  ts ? new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function GestorMontagemPage() {
  const [rows, setRows] = useState<Montagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("montagens").select("*").order("data_agendada", { ascending: true });
    setRows((data ?? []) as unknown as Montagem[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const valorTotal = (parseFloat(form.horas) || 0) * (parseFloat(form.valor_hora) || 0);

  async function salvar() {
    if (!form.modelo) { toast.error("Selecione o modelo."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("montagens") as any).insert({
        modelo: form.modelo,
        unidade: form.unidade || null,
        chassi: form.chassi || null,
        data_agendada: form.data_agendada ? new Date(form.data_agendada).toISOString() : null,
        prazo: form.prazo ? new Date(form.prazo).toISOString() : null,
        horas: parseFloat(form.horas) || 0,
        valor_hora: parseFloat(form.valor_hora) || VALOR_HORA_MONTAGEM,
        valor_total: valorTotal,
        status: form.status,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
      toast.success("Montagem agendada!");
      setOpen(false);
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  async function mudarStatus(m: Montagem, status: string) {
    const supabase = createClient();
    const { error } = await (supabase.from("montagens") as any).update({ status }).eq("id", m.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    load();
  }

  const totalMes = rows
    .filter((m) => {
      const d = new Date(m.data_agendada ?? m.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, m) => s + (m.valor_total ?? 0), 0);

  const pendentes = rows.filter((m) => m.status !== "concluida").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6" /> Montagem de Motos
          </h1>
          <p className="text-muted-foreground text-sm">
            Galpão — motos em caixa • Serviço a {brl(VALOR_HORA_MONTAGEM)}/hora
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-1.5" /> Agendar montagem</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Agendar montagem</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Modelo *</Label>
                  <Select value={form.modelo} onValueChange={(v) => v && setForm((f) => ({ ...f, modelo: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Modelo" /></SelectTrigger>
                    <SelectContent>
                      {MOBYOU_MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={form.unidade} onValueChange={(v) => v && setForm((f) => ({ ...f, unidade: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Local" /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES_ESTOQUE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chassi (opcional)</Label>
                <Input value={form.chassi} onChange={(e) => setForm((f) => ({ ...f, chassi: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Dia e hora da montagem</Label>
                  <Input type="datetime-local" value={form.data_agendada} onChange={(e) => setForm((f) => ({ ...f, data_agendada: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo de entrega</Label>
                  <Input type="datetime-local" value={form.prazo} onChange={(e) => setForm((f) => ({ ...f, prazo: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Horas de serviço</Label>
                  <Input type="number" step="0.5" min="0" value={form.horas} onChange={(e) => setForm((f) => ({ ...f, horas: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor/hora (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_hora} onChange={(e) => setForm((f) => ({ ...f, valor_hora: e.target.value }))} />
                </div>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground">Valor total do serviço</span>
                <span className="font-bold text-lg">{brl(valorTotal)}</span>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Montagens pendentes</p>
          <p className="text-2xl font-bold mt-1">{pendentes}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Serviço no mês</p>
          <p className="text-2xl font-bold mt-1 text-primary">{brl(totalMes)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Total agendado</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Montagens</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma montagem agendada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Agendada</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.modelo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.unidade ?? "—"}</TableCell>
                      <TableCell className="text-sm">{fmtDT(m.data_agendada)}</TableCell>
                      <TableCell className="text-sm">{fmtDT(m.prazo)}</TableCell>
                      <TableCell>{m.horas}h</TableCell>
                      <TableCell className="font-semibold">{brl(m.valor_total ?? 0)}</TableCell>
                      <TableCell>
                        <Select value={m.status} onValueChange={(v) => v && mudarStatus(m, v)}>
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue>
                              <Badge variant="secondary" className={statusColor[m.status]}>{MONTAGEM_STATUS[m.status] ?? m.status}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(MONTAGEM_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
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
