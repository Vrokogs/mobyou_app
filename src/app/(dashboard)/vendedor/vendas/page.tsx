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
import { Plus, Search, DollarSign, Loader2, Trash2, Receipt, FileText } from "lucide-react";
import { UNIDADES_VENDA, MOBYOU_MODELOS, ORIGEM_VENDA, UNIDADES_NEGOCIO } from "@/lib/constants";

interface Venda {
  id: string;
  unidade: string | null;
  modelo: string | null;
  valor_total: number | null;
  entrada: number | null;
  parcelas: number | null;
  forma_pagamento: string;
  data_venda: string | null;
  nota_fiscal_id: string | null;
  created_at: string;
  cliente: { nome: string } | null;
  nota: { storage_path: string | null; tipo_arquivo: string | null } | null;
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

const hojeISO = () => new Date().toISOString().slice(0, 10);

// data_venda é a competência (DATE, sem fuso). Vendas antigas só têm created_at.
const dataDaVenda = (v: { data_venda: string | null; created_at: string }) =>
  new Date(v.data_venda ? v.data_venda + "T12:00:00" : v.created_at).toLocaleDateString("pt-BR");

// Função, não constante: a data precisa ser a de hoje na hora de abrir o form.
const formVazio = () => ({
  unidade: UNIDADES_VENDA[0] as string,
  modelo: "",
  cliente_id: "",
  valor_total: "",
  entrada: "0",
  parcelas: "1",
  forma_pagamento: "pix",
  origem: "Lead",
  unidade_negocio: "varejo",
  data_venda: hojeISO(),
});

export default function VendedorVendasPage() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(formVazio());
  // Nota fiscal da venda: obrigatória. Sem ela a venda não é gravada.
  const [arquivoNota, setArquivoNota] = useState<File | null>(null);
  const [abrindoNota, setAbrindoNota] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [vendasRes, clientesRes] = await Promise.all([
      supabase
        .from("vendas")
        .select("*, cliente:profiles!cliente_id(nome), nota:notas_fiscais!nota_fiscal_id(storage_path, tipo_arquivo)")
        .eq("vendedor_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, nome").eq("role", "cliente").order("nome"),
    ]);
    if (vendasRes.data) setVendas(vendasRes.data as unknown as Venda[]);
    if (clientesRes.data) setClientes(clientesRes.data as unknown as Cliente[]);
    setLoading(false);
  }

  // Bucket privado: o arquivo só abre com link assinado, gerado no clique.
  async function abrirNota(venda: Venda) {
    const caminho = venda.nota?.storage_path;
    if (!caminho) { toast.error("Esta venda não tem nota anexada."); return; }
    setAbrindoNota(venda.id);
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from("documentos").createSignedUrl(caminho, 300);
    setAbrindoNota("");
    if (error || !data?.signedUrl) {
      toast.error("Não foi possível abrir a nota", { description: error?.message });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deletarVenda(id: string) {
    if (!confirm("Apagar esta venda? Se a moto estiver vinculada no estoque, ela volta a Disponível.")) return;
    try {
      const supabase = createClient();
      await (supabase.from("estoque_motos") as any)
        .update({ estado: "Disponível", venda_id: null, vendedor_id: null })
        .eq("venda_id", id);
      const { data: del, error } = await supabase.from("vendas").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!del || del.length === 0) throw new Error("Sem permissão (rode a migration 021).");
      toast.success("Venda apagada.");
      loadData();
    } catch (e) {
      toast.error("Erro ao apagar venda", { description: e instanceof Error ? e.message : "" });
    }
  }

  async function handleVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!form.modelo) { toast.error("Selecione o modelo da moto."); return; }
    if (!arquivoNota) {
      toast.error("Anexe a nota fiscal.", {
        description: "Toda venda lançada precisa da nota no sistema.",
      });
      return;
    }
    if (!form.valor_total || parseFloat(form.valor_total) <= 0) {
      toast.error("Informe o valor da venda.", {
        description: "Sem valor, a venda entra zerada no faturamento e no ranking.",
      });
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Nota fiscal no Storage. Se falhar, nada é criado — melhor não lançar a
      //    venda do que deixá-la no ranking sem o documento que a comprova.
      const ext = arquivoNota.name.split(".").pop()?.toLowerCase() || "pdf";
      const caminho = `notas/${form.cliente_id || "sem-cliente"}/${Date.now()}.${ext}`;
      const { error: errUpload } = await supabase.storage
        .from("documentos").upload(caminho, arquivoNota, { upsert: true });
      if (errUpload) {
        toast.error("Não foi possível enviar a nota fiscal", { description: errUpload.message });
        return;
      }
      const tipoArquivo = ext === "xml" ? "xml" : ["jpg", "jpeg", "png", "webp"].includes(ext) ? "imagem" : "pdf";
      const { data: pub } = supabase.storage.from("documentos").getPublicUrl(caminho);
      const dataVenda = form.data_venda || hojeISO();
      const valor = parseFloat(form.valor_total);

      // 2. Registro da nota, ligado ao cliente quando houver
      const { data: nfRow } = await (supabase.from("notas_fiscais") as any).insert({
        tipo_arquivo: tipoArquivo,
        arquivo_url: pub.publicUrl,
        storage_path: caminho,
        dados_extraidos: {
          scooters: [{ modelo: form.modelo }],
          venda: {
            valor: form.valor_total,
            data_compra: dataVenda,
            parcelas: form.parcelas,
            forma_pagamento: form.forma_pagamento,
            unidade: form.unidade,
            origem: form.origem,
          },
        },
        importado_por: user.id,
        cliente_id: form.cliente_id || null,
        valor,
        parcelas: parseInt(form.parcelas) || 1,
        data_compra: dataVenda,
      }).select("id").single();

      // 3. Venda, com a competência na data informada
      const { error } = await (supabase.from("vendas") as any).insert({
        nota_fiscal_id: (nfRow as { id?: string } | null)?.id ?? null,
        vendedor_id: user.id,
        cliente_id: form.cliente_id || null,
        unidade: form.unidade,
        modelo: form.modelo,
        valor_total: valor,
        entrada: parseFloat(form.entrada) || 0,
        parcelas: parseInt(form.parcelas) || 1,
        forma_pagamento: form.forma_pagamento,
        origem: form.origem,
        unidade_negocio: form.unidade_negocio,
        data_venda: dataVenda,
        criado_por: user.id,
      });
      if (error) {
        toast.error("Erro ao registrar venda", { description: error.message });
        return;
      }
      toast.success("Venda registrada com sucesso!", {
        description: "A nota ficou guardada junto e pode ser aberta na lista.",
      });
      setDialogOpen(false);
      setForm(formVazio());
      setArquivoNota(null);
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

  // Total do mês pela competência da venda, igual aos relatórios do gestor.
  const totalMes = vendas
    .filter((v) => {
      const d = new Date(v.data_venda ? v.data_venda + "T12:00:00" : v.created_at);
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
        <Dialog
          open={dialogOpen}
          onOpenChange={(v) => {
            setDialogOpen(v);
            if (v) { setForm(formVazio()); setArquivoNota(null); }
          }}
        >
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Origem (de onde veio)</Label>
                  <Select value={form.origem} onValueChange={(v) => v && setForm({ ...form, origem: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORIGEM_VENDA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidade de negócio</Label>
                  <Select
                    items={Object.fromEntries(UNIDADES_NEGOCIO.filter((u) => u.value === "varejo" || u.value === "atacado").map((u) => [u.value, u.label]))}
                    value={form.unidade_negocio}
                    onValueChange={(v) => v && setForm({ ...form, unidade_negocio: v })}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="varejo">Varejo</SelectItem>
                      <SelectItem value="atacado">Atacado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <Select items={Object.fromEntries(clientes.map((c) => [c.id, c.nome]))} value={form.cliente_id} onValueChange={(v) => v && setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Receipt className="h-4 w-4 text-primary" />
                  Nota fiscal <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="file"
                  accept=".xml,.pdf,image/*"
                  onChange={(e) => setArquivoNota(e.target.files?.[0] ?? null)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {arquivoNota
                    ? "Anexado: " + arquivoNota.name
                    : "Obrigatória. XML, PDF ou foto — fica guardada junto da venda."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor Total (R$) <span className="text-destructive">*</span></Label>
                  <Input type="number" step="0.01" min="0.01" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Entrada (R$)</Label>
                  <Input type="number" step="0.01" value={form.entrada} onChange={(e) => setForm({ ...form, entrada: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data da venda</Label>
                <Input type="date" value={form.data_venda} onChange={(e) => setForm({ ...form, data_venda: e.target.value })} />
                <p className="text-[11px] text-muted-foreground">
                  É por esta data que a venda entra no faturamento do mês.
                </p>
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
                <Button type="submit" disabled={saving || !arquivoNota || !form.valor_total}>
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
                  <TableHead>Nota</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma venda registrada</TableCell>
                  </TableRow>
                ) : filtered.map((venda) => (
                  <TableRow key={venda.id}>
                    <TableCell>
                      {dataDaVenda(venda)}
                    </TableCell>
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
                    <TableCell>
                      {venda.nota?.storage_path ? (
                        <Button variant="outline" size="xs" onClick={() => abrirNota(venda)} disabled={abrindoNota === venda.id}>
                          {abrindoNota === venda.id
                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            : <FileText className="h-3 w-3 mr-1" />}
                          Abrir
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">Sem nota</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deletarVenda(venda.id)} title="Apagar venda">
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
