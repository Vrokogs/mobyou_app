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
import { UserPlus, Radar, Loader2 } from "lucide-react";
import { ORIGEM_VENDA, UNIDADES_VENDA, MOBYOU_MODELOS, LEAD_STATUS } from "@/lib/constants";
import type { Lead } from "@/types/database";

const EMPTY = { nome: "", telefone: "", origem: "Lead", unidade: "", modelo_interesse: "", status: "novo", observacoes: "" };

const statusColor: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800",
  em_contato: "bg-amber-100 text-amber-800",
  convertido: "bg-emerald-100 text-emerald-800",
  perdido: "bg-red-100 text-red-800",
};

export default function VendedorLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data ?? []) as unknown as Lead[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function salvar() {
    if (!form.nome.trim()) { toast.error("Informe o nome do lead."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("leads") as any).insert({
        nome: form.nome.trim(),
        telefone: form.telefone || null,
        origem: form.origem,
        unidade: form.unidade || null,
        modelo_interesse: form.modelo_interesse || null,
        status: form.status,
        observacoes: form.observacoes || null,
        vendedor_id: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Lead cadastrado!");
      setOpen(false);
      setForm({ ...EMPTY });
      load();
    } catch (e) {
      toast.error("Erro ao cadastrar lead", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  async function mudarStatus(lead: Lead, status: string) {
    const supabase = createClient();
    const { error } = await (supabase.from("leads") as any).update({ status }).eq("id", lead.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Status atualizado");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Radar className="h-6 w-6" /> Leads
          </h1>
          <p className="text-muted-foreground text-sm">Cadastre a origem de cada cliente potencial</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><UserPlus className="h-4 w-4 mr-1.5" /> Novo Lead</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Origem *</Label>
                  <Select value={form.origem} onValueChange={(v) => v && setForm((f) => ({ ...f, origem: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORIGEM_VENDA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Unidade</Label>
                  <Select value={form.unidade} onValueChange={(v) => v && setForm((f) => ({ ...f, unidade: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Loja" /></SelectTrigger>
                    <SelectContent>
                      {UNIDADES_VENDA.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Modelo de interesse</Label>
                  <Select value={form.modelo_interesse} onValueChange={(v) => v && setForm((f) => ({ ...f, modelo_interesse: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Modelo" /></SelectTrigger>
                    <SelectContent>
                      {MOBYOU_MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Todos os leads</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lead cadastrado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Interesse</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.nome}</TableCell>
                      <TableCell>{l.telefone ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline">{l.origem}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.unidade ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{l.modelo_interesse ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={l.status} onValueChange={(v) => v && mudarStatus(l, v)}>
                          <SelectTrigger className="w-36 h-8">
                            <SelectValue>
                              <Badge variant="secondary" className={statusColor[l.status]}>{LEAD_STATUS[l.status] ?? l.status}</Badge>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(LEAD_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
