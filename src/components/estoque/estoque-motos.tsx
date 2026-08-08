"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Bike, MapPin, Loader2, Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { UNIDADES_ESTOQUE, ESTOQUE_ESTADOS, MOBYOU_MODELOS } from "@/lib/constants";

interface MotoEstoque {
  id: string;
  unidade: string;
  modelo: string;
  cor: string | null;
  chassi: string | null;
  quantidade: number;
  quantidade_montar: number;
  estado: string;
  venda_id: string | null;
  observacoes: string | null;
}

const EMPTY_FORM = {
  id: "",
  unidade: UNIDADES_ESTOQUE[0] as string,
  modelo: "",
  cor: "",
  chassi: "",
  quantidade: "1",
  quantidade_montar: "0",
  estado: "Disponível",
  vendedor_id: "",
  valor_venda: "",
  venda_id: "",
};

const ESTADO_COR: Record<string, string> = {
  "Disponível": "bg-green-100 text-green-800",
  "Montada": "bg-blue-100 text-blue-800",
  "Para montar": "bg-amber-100 text-amber-800",
  "Reservada": "bg-purple-100 text-purple-800",
  "Vendido": "bg-gray-200 text-gray-700",
  "Avariada": "bg-red-100 text-red-800",
};

export function EstoqueMotos() {
  const [rows, setRows] = useState<MotoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [estadoOriginal, setEstadoOriginal] = useState<string>("");
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);

  const canDelete = role === "gestor";

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: perfil } = await supabase
        .from("profiles").select("role").eq("id", user.id).maybeSingle();
      setRole((perfil as { role?: string } | null)?.role ?? "");
    }
    const { data: vend } = await supabase
      .from("profiles").select("id, nome")
      .in("role", ["vendedor", "gestor"]).order("nome");
    setVendedores((vend ?? []) as { id: string; nome: string }[]);
    const { data } = await (supabase as any).from("estoque_motos")
      .select("*")
      .order("modelo");
    setRows((data ?? []) as MotoEstoque[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNovo() {
    setForm({ ...EMPTY_FORM });
    setEstadoOriginal("");
    setDialogOpen(true);
  }

  async function openEditar(m: MotoEstoque) {
    let vendedorId = "";
    let valorVenda = "";
    // Se já tem venda vinculada, carrega vendedor e valor para exibir/ajustar
    if (m.venda_id) {
      const supabase = createClient();
      const { data: v } = await (supabase as any).from("vendas")
        .select("vendedor_id, valor_total").eq("id", m.venda_id).maybeSingle();
      if (v) {
        vendedorId = v.vendedor_id ?? "";
        valorVenda = v.valor_total != null ? String(v.valor_total) : "";
      }
    }
    setForm({
      ...EMPTY_FORM,
      id: m.id,
      unidade: m.unidade,
      modelo: m.modelo,
      cor: m.cor ?? "",
      chassi: m.chassi ?? "",
      quantidade: String(m.quantidade),
      quantidade_montar: String(m.quantidade_montar),
      estado: m.estado,
      venda_id: m.venda_id ?? "",
      vendedor_id: vendedorId,
      valor_venda: valorVenda,
    });
    setEstadoOriginal(m.estado);
    setDialogOpen(true);
  }

  async function salvar() {
    if (!form.modelo) { toast.error("Selecione o modelo da moto."); return; }
    if (!form.unidade) { toast.error("Selecione a unidade."); return; }

    const estadoVendido = form.estado === "Vendido";
    // Precisa registrar a venda quando está Vendido e ainda não foi contabilizada
    const precisaRegistrar = estadoVendido && !form.venda_id;
    if (precisaRegistrar && !form.vendedor_id) {
      toast.error("Selecione o vendedor que realizou a venda.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const vendedorNome =
        vendedores.find((v) => v.id === form.vendedor_id)?.nome ?? "";

      const payload: Record<string, unknown> = {
        unidade: form.unidade,
        modelo: form.modelo,
        cor: form.cor || null,
        chassi: form.chassi || null,
        quantidade: parseInt(form.quantidade) || 0,
        quantidade_montar: parseInt(form.quantidade_montar) || 0,
        estado: form.estado,
      };
      if (estadoVendido && form.vendedor_id) {
        payload.vendedor_id = form.vendedor_id;
        payload.observacoes = `Vendido por ${vendedorNome} em ${new Date().toLocaleDateString("pt-BR")}`;
      }

      // 1) Grava a moto e obtém o id
      let motoId = form.id;
      if (form.id) {
        const { error } = await (supabase as any).from("estoque_motos")
          .update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { data: novo, error } = await (supabase as any).from("estoque_motos")
          .insert(payload).select("id").single();
        if (error) throw error;
        motoId = (novo as { id: string }).id;
      }

      // 2) Contabiliza / atualiza a venda vinculada (vendedor + unidade + modelo + chassi)
      if (estadoVendido && form.vendedor_id) {
        const vendaPayload = {
          vendedor_id: form.vendedor_id,
          unidade: form.unidade,
          modelo: form.modelo,
          chassi: form.chassi || null,
          valor_total: parseFloat(form.valor_venda) || 0,
          entrada: 0,
          parcelas: 1,
          forma_pagamento: "pix",
        };
        if (form.venda_id) {
          // Já contabilizada: apenas ajusta os dados da venda existente
          const { error: uErr } = await (supabase as any).from("vendas")
            .update(vendaPayload).eq("id", form.venda_id);
          if (uErr) throw uErr;
          toast.success("Venda atualizada.");
        } else {
          const { data: v, error: vErr } = await (supabase as any).from("vendas")
            .insert(vendaPayload).select("id").single();
          if (vErr) throw vErr;
          // Vincula a venda à moto (evita duplicar na próxima edição)
          await (supabase as any).from("estoque_motos")
            .update({ venda_id: (v as { id: string }).id }).eq("id", motoId);
          toast.success(`Vendida! Contabilizada para ${vendedorNome} (${form.unidade}).`);
        }
        setDialogOpen(false);
        load();
        setSaving(false);
        return;
      }

      toast.success("Estoque atualizado!");
      setDialogOpen(false);
      load();
    } catch (e) {
      toast.error("Erro ao salvar", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  async function remover(id: string) {
    const supabase = createClient();
    const { error } = await (supabase as any).from("estoque_motos").delete().eq("id", id);
    if (error) toast.error("Erro ao remover", { description: error.message });
    else { toast.success("Removido."); load(); }
  }

  // Unidades a exibir: as 3 fixas + qualquer outra que apareça nos dados
  const unidades = Array.from(
    new Set([...UNIDADES_ESTOQUE, ...rows.map((r) => r.unidade)])
  );
  const totalGeral = rows.reduce((s, r) => s + r.quantidade, 0);
  const totalMontar = rows.reduce((s, r) => s + r.quantidade_montar, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bike className="h-6 w-6" /> Estoque de Motos
          </h1>
          <p className="text-muted-foreground text-sm">
            {totalGeral} moto(s) no total • {totalMontar} para montar •{" "}
            {UNIDADES_ESTOQUE.length} unidades
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button onClick={openNovo}><Plus className="h-4 w-4 mr-1" />Adicionar moto</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar estoque" : "Adicionar moto ao estoque"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Unidade</Label>
                <Select value={form.unidade} onValueChange={(v) => v && setForm((f) => ({ ...f, unidade: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES_ESTOQUE.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo</Label>
                <Select value={form.modelo} onValueChange={(v) => v && setForm((f) => ({ ...f, modelo: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                  <SelectContent>
                    {MOBYOU_MODELOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Cor</Label>
                  <Input value={form.cor} onChange={(e) => setForm((f) => ({ ...f, cor: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => v && setForm((f) => ({ ...f, estado: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ESTOQUE_ESTADOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Chassi</Label>
                <Input placeholder="Número do chassi (opcional)" value={form.chassi}
                  onChange={(e) => setForm((f) => ({ ...f, chassi: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" min="0" value={form.quantidade}
                    onChange={(e) => setForm((f) => ({ ...f, quantidade: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Para montar</Label>
                  <Input type="number" min="0" value={form.quantidade_montar}
                    onChange={(e) => setForm((f) => ({ ...f, quantidade_montar: e.target.value }))} />
                </div>
              </div>

              {form.estado === "Vendido" && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-3 space-y-3">
                  <p className="text-xs font-medium text-orange-800">
                    Dados da venda (registra para o vendedor e a unidade)
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Vendedor</Label>
                    <Select items={Object.fromEntries(vendedores.map((v) => [v.id, v.nome]))} value={form.vendedor_id} onValueChange={(v) => v && setForm((f) => ({ ...f, vendedor_id: v }))}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Quem vendeu?" /></SelectTrigger>
                      <SelectContent>
                        {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor da venda (R$)</Label>
                    <Input type="number" step="0.01" placeholder="0,00" value={form.valor_venda}
                      onChange={(e) => setForm((f) => ({ ...f, valor_venda: e.target.value }))} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {form.venda_id
                      ? "Venda já contabilizada — salvar apenas ajusta o vendedor/valor."
                      : "Ao salvar, a venda é contabilizada para o vendedor e a unidade (aparece no ranking e no financeiro)."}
                  </p>
                  {estadoOriginal !== "Vendido" && (
                    <p className="text-[11px] text-muted-foreground">Chassi: {form.chassi || "(sem chassi)"} — a moto sai do estoque como vendida.</p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={salvar} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {unidades.map((unidade) => {
        const itens = rows.filter((r) => r.unidade === unidade);
        const subtotal = itens.reduce((s, r) => s + r.quantidade, 0);
        const subMontar = itens.reduce((s, r) => s + r.quantidade_montar, 0);
        return (
          <Card key={unidade}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4 text-primary" />
                  {unidade}
                </span>
                <span className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                  <Badge variant="secondary">{subtotal} motos</Badge>
                  {subMontar > 0 && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                      <Wrench className="h-3 w-3 mr-1" />{subMontar} p/ montar
                    </Badge>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itens.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Sem motos nesta unidade.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Chassi</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Para montar</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.modelo}</TableCell>
                        <TableCell>{m.cor ?? "---"}</TableCell>
                        <TableCell className="font-mono text-xs">{m.chassi ?? "---"}</TableCell>
                        <TableCell>{m.quantidade}</TableCell>
                        <TableCell>{m.quantidade_montar || "---"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={ESTADO_COR[m.estado] ?? ""}>
                            {m.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEditar(m)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button variant="ghost" size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => remover(m.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
