"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, DollarSign, Loader2 } from "lucide-react";
import { UNIDADES_VENDA, MOBYOU_MODELOS, ORIGEM_VENDA } from "@/lib/constants";

interface Venda {
  id: string;
  unidade: string | null;
  modelo: string | null;
  valor_total: number | null;
  entrada: number | null;
  parcelas: number | null;
  forma_pagamento: string;
  created_at: string;
  cliente: { nome: string } | null;
}

interface Cliente { id: string; nome: string }

const FORMA_LABEL: Record<string, string> = {
  pix: "PIX",
  cartao_credito: "Cartão de Crédito",
  cartao_debito: "Cartão de Débito",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  financiamento: "Financiamento",
};

export default function VendedorVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    unidade: UNIDADES_VENDA[0] as string,
    modelo: "",
    cliente_id: "",
    valor_total: "",
    entrada: "0",
    parcelas: "1",
    forma_pagamento: "pix",
    origem: "Lead",
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [vendasRes, clientesRes] = await Promise.all([
      supabase
        .from("vendas")
        .select("*, cliente:profiles!cliente_id(nome)")
        .eq("vendedor_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, nome").eq("role", "cliente").order("nome"),
    ]);
    if (vendasRes.data) setVendas(vendasRes.data as unknown as Venda[]);
    if (clientesRes.data) setClientes(clientesRes.data as unknown as Cliente[]);
    setLoading(false);
  }

  async function handleVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!form.modelo) { toast.error("Selecione o modelo da moto."); return; }
    if (!form.valor_total) { toast.error("Informe o valor da venda."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await (supabase.from("vendas") as any).insert({
        vendedor_id: user.id,
        cliente_id: form.cliente_id || null,
        unidade: form.unidade,
        modelo: form.modelo,
        valor_total: parseFloat(form.valor_total),
        entrada: parseFloat(form.entrada) || 0,
        parcelas: parseInt(form.parcelas) || 1,
        forma_pagamento: form.forma_pagamento,
        origem: form.origem,
      });
      if (error) {
        toast.error("Erro ao registrar venda", { description: error.message });
        return;
      }
      toast.success("Venda registrada com sucesso!");
      setDialogOpen(false);
      setForm({ unidade: UNIDADES_VENDA[0], modelo: "", cliente_id: "", valor_total: "", entrada: "0", parcelas: "1", forma_pagamento: "pix", origem: "Lead" });
      loadData();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  const filtered = vendas.filter((v) => {
    const t = search.toLowerCase();
    return (
      !t ||
      v.cliente?.nome?.toLowerCase().includes(t) ||
      v.modelo?.toLowerCase().includes(t) ||
      v.unidade?.toLowerCase().includes(t)
    );
  });

  const totalMes = vendas
    .filter((v) => {
      const d = new Date(v.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, v) => s + (v.valor_total ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Vendas</h1>
          <p className="text-muted-foreground">
            Registre as vendas que você fez • Total do mês:{" "}
            <strong>R$ {totalMes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Registrar Venda</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
            <form onSubmit={handleVenda} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Loja (unidade)</Label>
                <Select value={form.unidade} onValueChange={(v) => v && setForm({ ...form, unidade: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES_VENDA.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Origem da venda (de onde veio o cliente)</Label>
                <Select value={form.origem} onValueChange={(v) => v && setForm({ ...form, origem: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORIGEM_VENDA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo da moto</Label>
                <Select value={form.modelo} onValueChange={(v) => v && setForm({ ...form, modelo: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                  <SelectContent>
                    {MOBYOU_MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente (opcional)</Label>
                <Select value={form.cliente_id} onValueChange={(v) => v && setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor Total (R$)</Label>
                  <Input type="number" step="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entrada (R$)</Label>
                  <Input type="number" step="0.01" value={form.entrada} onChange={(e) => setForm({ ...form, entrada: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Parcelas</Label>
                  <Input type="number" min="1" value={form.parcelas} onChange={(e) => setForm({ ...form, parcelas: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Forma de Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={(v) => v && setForm({ ...form, forma_pagamento: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(FORMA_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Registrar Venda
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente, modelo ou loja..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Loja</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma venda registrada</TableCell>
                  </TableRow>
                ) : filtered.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>{new Date(venda.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="secondary">{venda.unidade ?? "---"}</Badge></TableCell>
                    <TableCell className="font-medium">{venda.modelo ?? "---"}</TableCell>
                    <TableCell>{venda.cliente?.nome ?? "---"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {(venda.valor_total ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>{venda.parcelas ?? 1}x</TableCell>
                    <TableCell>{FORMA_LABEL[venda.forma_pagamento] ?? venda.forma_pagamento}</TableCell>
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
