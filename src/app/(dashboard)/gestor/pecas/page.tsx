"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Boxes, Plus, Loader2, Trash2 } from "lucide-react";
import { UNIDADES_VENDA } from "@/lib/constants";
import type { VendaPeca } from "@/types/database";

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const EMPTY = { descricao: "", quantidade: "1", valor_total: "", unidade: "", forma_pagamento: "pix", observacoes: "" };

export default function GestorPecasPage() {
  const [rows, setRows] = useState<VendaPeca[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("vendas_pecas").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as VendaPeca[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function salvar() {
    if (!form.descricao.trim()) { toast.error("Descreva a peça."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase.from("vendas_pecas") as any).insert({
        descricao: form.descricao.trim(),
        quantidade: parseInt(form.quantidade) || 1,
        valor_total: parseFloat(form.valor_total) || 0,
        unidade: form.unidade || null,
        forma_pagamento: form.forma_pagamento,
        observacoes: form.observacoes || null,
        vendedor_id: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Venda de peça registrada!");
      setOpen(false); setForm({ ...EMPTY }); load();
    } catch (e) {
      toast.error("Erro ao registrar", { description: e instanceof Error ? e.message : "" });
    } finally { setSaving(false); }
  }

  async function apagar(id: string) {
    if (!confirm("Apagar este registro de peça?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("vendas_pecas").delete().eq("id", id);
    if (error) { toast.error("Erro ao apagar"); return; }
    toast.success("Removido."); load();
  }

  const now = new Date();
  const totalMes = rows.filter((r) => {
    const d = new Date(r.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, r) => s + (r.valor_total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Boxes className="h-6 w-6" /> Peças de reposição
          </h1>
          <p className="text-muted-foreground text-sm">Vendas de peças (unidade de negócio Peças) • Mês: <strong>{brl(totalMes)}</strong></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-1.5" /> Registrar venda de peça</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Venda de peça</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Peça / descrição *</Label>
                <Input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" min="1" value={form.quantidade} onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor total (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm((f) => ({ ...f, valor_total: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Loja</Label>
                  <Select value={form.unidade} onValueChange={(v) => v && setForm((f) => ({ ...f, unidade: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Loja" /></SelectTrigger>
                    <SelectContent>{UNIDADES_VENDA.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={(v) => v && setForm((f) => ({ ...f, forma_pagamento: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Vendas de peças</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma venda de peça registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Peça</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{r.descricao}</TableCell>
                      <TableCell>{r.quantidade}</TableCell>
                      <TableCell><Badge variant="secondary">{r.unidade ?? "—"}</Badge></TableCell>
                      <TableCell className="font-semibold">{brl(r.valor_total ?? 0)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => apagar(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
