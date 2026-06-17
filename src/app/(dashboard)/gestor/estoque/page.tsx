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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Package, AlertTriangle, ArrowUpDown, Pencil, History } from "lucide-react";
import { toast } from "sonner";
import type { Estoque, EstoqueMovimentacao } from "@/types/database";

const CATEGORIAS = [
  "Peca", "Acessorio", "Bateria", "Pneu", "Freio", "Motor",
  "Eletrica", "Carenagem", "Suspensao", "Outros",
];

interface MovimentacaoWithUser extends EstoqueMovimentacao {
  usuario?: { nome: string } | null;
}

export default function EstoquePage() {
  const [itens, setItens] = useState<Estoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Estoque | null>(null);
  const [saving, setSaving] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoWithUser[]>([]);
  const [movDialogOpen, setMovDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Estoque | null>(null);
  const [movForm, setMovForm] = useState({ tipo: "entrada" as string, quantidade: "", motivo: "" });

  const [form, setForm] = useState({
    nome: "",
    codigo: "",
    categoria: "",
    descricao: "",
    quantidade: "0",
    quantidade_minima: "5",
    unidade: "un",
    valor_unitario: "0",
    localizacao: "",
    fornecedor: "",
  });

  const loadItens = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("estoque")
      .select("*")
      .eq("ativo", true)
      .order("nome");

    if (categoriaFilter !== "todas") {
      query = query.eq("categoria", categoriaFilter);
    }

    if (search.trim()) {
      query = query.or(`nome.ilike.%${search}%,codigo.ilike.%${search}%`);
    }

    const { data } = await query;
    setItens((data ?? []) as Estoque[]);
    setLoading(false);
  }, [search, categoriaFilter]);

  useEffect(() => {
    loadItens();
  }, [loadItens]);

  async function loadMovimentacoes(itemId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("estoque_movimentacoes")
      .select("*, usuario:profiles!usuario_id(nome)")
      .eq("estoque_id", itemId)
      .order("created_at", { ascending: false })
      .limit(50);
    setMovimentacoes((data ?? []) as MovimentacaoWithUser[]);
  }

  function openNewItem() {
    setEditingItem(null);
    setForm({
      nome: "", codigo: "", categoria: "", descricao: "",
      quantidade: "0", quantidade_minima: "5", unidade: "un",
      valor_unitario: "0", localizacao: "", fornecedor: "",
    });
    setDialogOpen(true);
  }

  function openEditItem(item: Estoque) {
    setEditingItem(item);
    setForm({
      nome: item.nome,
      codigo: item.codigo,
      categoria: item.categoria,
      descricao: item.descricao || "",
      quantidade: String(item.quantidade),
      quantidade_minima: String(item.quantidade_minima),
      unidade: item.unidade,
      valor_unitario: String(item.valor_unitario),
      localizacao: item.localizacao || "",
      fornecedor: item.fornecedor || "",
    });
    setDialogOpen(true);
  }

  async function openMovimentacoes(item: Estoque) {
    setSelectedItem(item);
    await loadMovimentacoes(item.id);
    setMovDialogOpen(true);
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !form.codigo || !form.categoria) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();
      const itemData = {
        nome: form.nome,
        codigo: form.codigo,
        categoria: form.categoria,
        descricao: form.descricao || null,
        quantidade: parseInt(form.quantidade) || 0,
        quantidade_minima: parseInt(form.quantidade_minima) || 0,
        unidade: form.unidade,
        valor_unitario: parseFloat(form.valor_unitario) || 0,
        localizacao: form.localizacao || null,
        fornecedor: form.fornecedor || null,
        foto_url: null,
        ativo: true,
      };

      if (editingItem) {
        const { error } = await (supabase.from("estoque") as any).update(itemData).eq("id", editingItem.id);
        if (error) {
          toast.error("Erro ao atualizar item", { description: error.message });
        } else {
          toast.success("Item atualizado!");
        }
      } else {
        const { error } = await (supabase.from("estoque") as any).insert(itemData);
        if (error) {
          toast.error("Erro ao criar item", { description: error.message });
        } else {
          toast.success("Item cadastrado!");
        }
      }

      setDialogOpen(false);
      loadItens();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function handleMovimentacao(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || !movForm.quantidade) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const qty = parseInt(movForm.quantidade);
      if (isNaN(qty) || qty <= 0) {
        toast.error("Quantidade invalida");
        setSaving(false);
        return;
      }

      // Insert movement
      const { error: movError } = await (supabase.from("estoque_movimentacoes") as any).insert({
        estoque_id: selectedItem.id,
        tipo: movForm.tipo as "entrada" | "saida" | "ajuste",
        quantidade: qty,
        motivo: movForm.motivo || null,
        ordem_id: null,
        usuario_id: user.id,
      });

      if (movError) {
        toast.error("Erro ao registrar movimentacao", { description: movError.message });
        setSaving(false);
        return;
      }

      // Update stock quantity
      let newQty = selectedItem.quantidade;
      if (movForm.tipo === "entrada") {
        newQty += qty;
      } else if (movForm.tipo === "saida") {
        newQty -= qty;
      } else {
        newQty = qty; // ajuste sets absolute value
      }

      await (supabase.from("estoque") as any).update({ quantidade: Math.max(0, newQty) }).eq("id", selectedItem.id);

      toast.success("Movimentacao registrada!");
      setMovForm({ tipo: "entrada", quantidade: "", motivo: "" });
      await loadMovimentacoes(selectedItem.id);
      loadItens();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(value: number) {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  const lowStockCount = itens.filter((i) => i.quantidade <= i.quantidade_minima).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie pecas e acessorios em estoque.
          </p>
        </div>
        <Button onClick={openNewItem}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{itens.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0))}
                </p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-red-200 bg-red-50/50" : ""}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${lowStockCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 max-w-sm flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou codigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={categoriaFilter} onValueChange={(v: string | null) => setCategoriaFilter(v ?? "todas")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {CATEGORIAS.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens em Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          {itens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum item encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Preco Custo</TableHead>
                  <TableHead>Preco Venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((item) => {
                  const isLow = item.quantidade <= item.quantidade_minima;
                  return (
                    <TableRow
                      key={item.id}
                      className={`cursor-pointer ${isLow ? "bg-red-50/50" : ""}`}
                      onClick={() => openMovimentacoes(item)}
                    >
                      <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold ${isLow ? "text-red-600" : ""}`}>
                          {item.quantidade}
                        </span>
                        <span className="text-muted-foreground text-xs ml-1">{item.unidade}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.quantidade_minima}</TableCell>
                      <TableCell>{formatCurrency(item.valor_unitario)}</TableCell>
                      <TableCell>{formatCurrency(item.valor_unitario * 1.4)}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            Baixo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEditItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => openMovimentacoes(item)}>
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item de Estoque"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize os dados do item." : "Cadastre um novo item no estoque."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Nome do item"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Codigo</Label>
                <Input
                  placeholder="SKU-001"
                  value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v: string | null) => setForm({ ...form, categoria: v ?? "" })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.unidade} onValueChange={(v: string | null) => setForm({ ...form, unidade: v ?? "un" })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">Unidade</SelectItem>
                    <SelectItem value="par">Par</SelectItem>
                    <SelectItem value="kg">Quilograma</SelectItem>
                    <SelectItem value="m">Metro</SelectItem>
                    <SelectItem value="l">Litro</SelectItem>
                    <SelectItem value="cx">Caixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantidade}
                  onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Qtd Minima</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantidade_minima}
                  onChange={(e) => setForm({ ...form, quantidade_minima: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unitario</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_unitario}
                  onChange={(e) => setForm({ ...form, valor_unitario: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Localizacao</Label>
                <Input
                  placeholder="Ex: Prateleira A3"
                  value={form.localizacao}
                  onChange={(e) => setForm({ ...form, localizacao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  placeholder="Nome do fornecedor"
                  value={form.fornecedor}
                  onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                placeholder="Descricao do item..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingItem ? "Atualizar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movimentacoes Dialog */}
      <Dialog open={movDialogOpen} onOpenChange={setMovDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Movimentacoes - {selectedItem?.nome}
            </DialogTitle>
            <DialogDescription>
              Codigo: {selectedItem?.codigo} | Estoque atual: {selectedItem?.quantidade} {selectedItem?.unidade}
            </DialogDescription>
          </DialogHeader>

          {/* New Movement Form */}
          <form onSubmit={handleMovimentacao} className="flex items-end gap-3 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={movForm.tipo} onValueChange={(v: string | null) => setMovForm({ ...movForm, tipo: v ?? "entrada" })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saida</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 w-24">
              <Label className="text-xs">Qtd</Label>
              <Input
                type="number"
                min="1"
                value={movForm.quantidade}
                onChange={(e) => setMovForm({ ...movForm, quantidade: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Motivo</Label>
              <Input
                placeholder="Motivo (opcional)"
                value={movForm.motivo}
                onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
              />
            </div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "..." : "Registrar"}
            </Button>
          </form>

          {/* Movement History */}
          {movimentacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma movimentacao registrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          mov.tipo === "entrada"
                            ? "bg-green-100 text-green-800"
                            : mov.tipo === "saida"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      >
                        {mov.tipo === "entrada" ? "Entrada" : mov.tipo === "saida" ? "Saida" : "Ajuste"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      {mov.tipo === "entrada" ? "+" : mov.tipo === "saida" ? "-" : ""}{mov.quantidade}
                    </TableCell>
                    <TableCell className="text-sm">{mov.motivo || "---"}</TableCell>
                    <TableCell className="text-sm">{mov.usuario?.nome || "---"}</TableCell>
                    <TableCell className="text-sm">{formatDate(mov.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
