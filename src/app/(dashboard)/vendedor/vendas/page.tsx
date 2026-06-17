"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, DollarSign } from "lucide-react";

interface Venda {
  id: string;
  valor_total: number;
  entrada: number;
  parcelas: number;
  forma_pagamento: string;
  created_at: string;
  cliente: { nome: string } | null;
  scooter: { modelo: string; chassi: string } | null;
}

interface Cliente { id: string; nome: string; }
interface Scooter { id: string; modelo: string; chassi: string; }

export default function VendedorVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [scootersDisponiveis, setScootersDisponiveis] = useState<Scooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    cliente_id: "", scooter_id: "", valor_total: "", entrada: "0",
    parcelas: "1", forma_pagamento: "pix",
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [vendasRes, clientesRes, scootersRes] = await Promise.all([
      supabase.from("vendas").select("*, cliente:profiles!vendas_cliente_id_fkey(nome), scooter:scooters!vendas_scooter_id_fkey(modelo, chassi)").eq("vendedor_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, nome").eq("role", "cliente").order("nome"),
      supabase.from("scooters").select("id, modelo, chassi").is("cliente_id", null).order("modelo"),
    ]);

    if (vendasRes.data) setVendas(vendasRes.data);
    if (clientesRes.data) setClientes(clientesRes.data);
    if (scootersRes.data) setScootersDisponiveis(scootersRes.data);
    setLoading(false);
  }

  async function handleVenda(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: vendaError } = await supabase.from("vendas").insert({
        vendedor_id: user.id,
        cliente_id: form.cliente_id,
        scooter_id: form.scooter_id,
        valor_total: parseFloat(form.valor_total),
        entrada: parseFloat(form.entrada),
        parcelas: parseInt(form.parcelas),
        forma_pagamento: form.forma_pagamento,
      });

      if (vendaError) {
        toast.error("Erro ao registrar venda", { description: vendaError.message });
        return;
      }

      await supabase.from("scooters").update({ cliente_id: form.cliente_id }).eq("id", form.scooter_id);

      const dataCompra = new Date().toISOString();
      const dataFim = new Date();
      dataFim.setFullYear(dataFim.getFullYear() + 1);

      await supabase.from("garantias").insert({
        scooter_id: form.scooter_id,
        cliente_id: form.cliente_id,
        data_compra: dataCompra,
        data_inicio: dataCompra,
        data_fim: dataFim.toISOString(),
        status: "ativa",
      });

      toast.success("Venda registrada com sucesso!");
      setDialogOpen(false);
      setForm({ cliente_id: "", scooter_id: "", valor_total: "", entrada: "0", parcelas: "1", forma_pagamento: "pix" });
      loadData();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  const filtered = vendas.filter(v =>
    v.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    v.scooter?.modelo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-muted-foreground">Registre e acompanhe suas vendas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Venda</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Venda</DialogTitle></DialogHeader>
            <form onSubmit={handleVenda} className="space-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Scooter</Label>
                <Select value={form.scooter_id} onValueChange={v => setForm({...form, scooter_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione a scooter" /></SelectTrigger>
                  <SelectContent>
                    {scootersDisponiveis.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.modelo} - {s.chassi}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm({...form, valor_total: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Entrada</Label>
                  <Input type="number" step="0.01" value={form.entrada} onChange={e => setForm({...form, entrada: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input type="number" min="1" value={form.parcelas} onChange={e => setForm({...form, parcelas: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={form.forma_pagamento} onValueChange={v => setForm({...form, forma_pagamento: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="financiamento">Financiamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Registrando..." : "Registrar Venda"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Scooter</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma venda encontrada</TableCell>
                  </TableRow>
                ) : filtered.map(venda => (
                  <TableRow key={venda.id}>
                    <TableCell className="font-medium">{venda.cliente?.nome}</TableCell>
                    <TableCell>{venda.scooter?.modelo}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {venda.valor_total?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    </TableCell>
                    <TableCell>{venda.parcelas}x</TableCell>
                    <TableCell className="capitalize">{venda.forma_pagamento?.replace("_", " ")}</TableCell>
                    <TableCell>{new Date(venda.created_at).toLocaleDateString("pt-BR")}</TableCell>
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
