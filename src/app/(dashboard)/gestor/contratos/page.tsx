"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Plus, Search, Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CONTRATO_TIPOS, CONTRATO_STATUS } from "@/lib/constants";
import type { Contrato, ContratoTipo, ContratoStatus, ModeloContrato, Profile, Scooter } from "@/types/database";

interface ContratoWithRelations extends Contrato {
  cliente?: { nome: string } | null;
  scooter?: { modelo: string; chassi: string | null } | null;
}

const STATUS_COLORS: Record<ContratoStatus, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  enviado: "bg-blue-100 text-blue-800",
  visualizado: "bg-yellow-100 text-yellow-800",
  assinado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoWithRelations[]>([]);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [scooters, setScooters] = useState<Scooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modeloDialogOpen, setModeloDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("contratos");

  // New contract form
  const [newContrato, setNewContrato] = useState({
    tipo: "" as string,
    modelo_id: "" as string,
    cliente_id: "" as string,
    scooter_id: "" as string,
    titulo: "" as string,
  });

  // New modelo form
  const [newModelo, setNewModelo] = useState({
    nome: "",
    tipo: "" as string,
    conteudo: "",
    variaveis: "",
  });

  // Edit modelo
  const [editingModelo, setEditingModelo] = useState<ModeloContrato | null>(null);

  const loadContratos = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("contratos")
      .select("*, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi)")
      .order("created_at", { ascending: false });

    if (tipoFilter !== "todos") {
      query = query.eq("tipo", tipoFilter);
    }

    if (search.trim()) {
      query = query.or(`titulo.ilike.%${search}%,numero.ilike.%${search}%`);
    }

    const { data } = await query;
    setContratos((data ?? []) as ContratoWithRelations[]);
  }, [tipoFilter, search]);

  const loadModelos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("modelos_contrato")
      .select("*")
      .eq("ativo", true)
      .order("nome");
    setModelos((data ?? []) as ModeloContrato[]);
  }, []);

  const loadClientes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "cliente")
      .eq("ativo", true)
      .order("nome");
    setClientes((data ?? []) as Profile[]);
  }, []);

  const loadScooters = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("scooters")
      .select("*")
      .order("modelo");
    setScooters((data ?? []) as Scooter[]);
  }, []);

  useEffect(() => {
    Promise.all([loadContratos(), loadModelos(), loadClientes(), loadScooters()]).then(() => {
      setLoading(false);
    });
  }, [loadContratos, loadModelos, loadClientes, loadScooters]);

  const filteredModelos = modelos.filter(
    (m) => !newContrato.tipo || m.tipo === newContrato.tipo
  );

  function replaceVariables(conteudo: string, clienteId: string, scooterId: string) {
    const cliente = clientes.find((c) => c.id === clienteId);
    const scooter = scooters.find((s) => s.id === scooterId);
    let result = conteudo;

    if (cliente) {
      result = result.replace(/\{\{cliente_nome\}\}/g, cliente.nome || "");
      result = result.replace(/\{\{cliente_cpf\}\}/g, cliente.cpf || "");
      result = result.replace(/\{\{cliente_telefone\}\}/g, cliente.telefone || "");
      result = result.replace(/\{\{cliente_email\}\}/g, cliente.email || "");
      result = result.replace(/\{\{cliente_endereco\}\}/g, cliente.endereco || "");
    }

    if (scooter) {
      result = result.replace(/\{\{scooter_modelo\}\}/g, scooter.modelo || "");
      result = result.replace(/\{\{scooter_marca\}\}/g, scooter.marca || "");
      result = result.replace(/\{\{scooter_chassi\}\}/g, scooter.chassi || "");
      result = result.replace(/\{\{scooter_numero_serie\}\}/g, scooter.numero_serie || "");
      result = result.replace(/\{\{scooter_cor\}\}/g, scooter.cor || "");
      result = result.replace(/\{\{scooter_ano\}\}/g, String(scooter.ano ?? ""));
    }

    result = result.replace(/\{\{data_atual\}\}/g, new Date().toLocaleDateString("pt-BR"));
    result = result.replace(/\{\{data_extenso\}\}/g, new Date().toLocaleDateString("pt-BR", {
      day: "numeric", month: "long", year: "numeric",
    }));

    return result;
  }

  async function handleCreateContrato(e: React.FormEvent) {
    e.preventDefault();
    if (!newContrato.tipo || !newContrato.cliente_id) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let conteudo = "";
      if (newContrato.modelo_id) {
        const modelo = modelos.find((m) => m.id === newContrato.modelo_id);
        if (modelo) {
          conteudo = replaceVariables(modelo.conteudo, newContrato.cliente_id, newContrato.scooter_id);
        }
      }

      const numero = `CTR-${Date.now().toString(36).toUpperCase()}`;
      const titulo = newContrato.titulo || `${CONTRATO_TIPOS[newContrato.tipo as ContratoTipo]} - ${clientes.find((c) => c.id === newContrato.cliente_id)?.nome || ""}`;

      const { error } = await (supabase.from("contratos") as any).insert({
        numero,
        tipo: newContrato.tipo as ContratoTipo,
        titulo,
        conteudo,
        cliente_id: newContrato.cliente_id,
        scooter_id: newContrato.scooter_id || null,
        ordem_id: null,
        venda_id: null,
        status: "rascunho" as ContratoStatus,
        valor: null,
        data_envio: null,
        data_visualizacao: null,
        data_assinatura: null,
        criado_por: user.id,
        modelo_id: newContrato.modelo_id || null,
      });

      if (error) {
        toast.error("Erro ao criar contrato", { description: error.message });
      } else {
        toast.success("Contrato criado com sucesso!");
        setDialogOpen(false);
        setNewContrato({ tipo: "", modelo_id: "", cliente_id: "", scooter_id: "", titulo: "" });
        loadContratos();
      }
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveModelo(e: React.FormEvent) {
    e.preventDefault();
    if (!newModelo.nome || !newModelo.tipo || !newModelo.conteudo) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const variaveis = newModelo.variaveis
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

      if (editingModelo) {
        const { error } = await (supabase
          .from("modelos_contrato") as any)
          .update({
            nome: newModelo.nome,
            tipo: newModelo.tipo as ContratoTipo,
            conteudo: newModelo.conteudo,
            variaveis,
          })
          .eq("id", editingModelo.id);

        if (error) {
          toast.error("Erro ao atualizar modelo", { description: error.message });
        } else {
          toast.success("Modelo atualizado!");
        }
      } else {
        const { error } = await (supabase.from("modelos_contrato") as any).insert({
          nome: newModelo.nome,
          tipo: newModelo.tipo as ContratoTipo,
          conteudo: newModelo.conteudo,
          variaveis,
          ativo: true,
          criado_por: user.id,
        });

        if (error) {
          toast.error("Erro ao criar modelo", { description: error.message });
        } else {
          toast.success("Modelo criado com sucesso!");
        }
      }

      setModeloDialogOpen(false);
      setNewModelo({ nome: "", tipo: "", conteudo: "", variaveis: "" });
      setEditingModelo(null);
      loadModelos();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteModelo(id: string) {
    const supabase = createClient();
    await (supabase.from("modelos_contrato") as any).update({ ativo: false }).eq("id", id);
    toast.success("Modelo removido");
    loadModelos();
  }

  function openEditModelo(modelo: ModeloContrato) {
    setEditingModelo(modelo);
    setNewModelo({
      nome: modelo.nome,
      tipo: modelo.tipo,
      conteudo: modelo.conteudo,
      variaveis: modelo.variaveis.join(", "),
    });
    setModeloDialogOpen(true);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-10 w-full" />
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
          <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie contratos e modelos de contrato.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Contrato
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 max-w-sm flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por titulo ou numero..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Tabs value={tipoFilter} onValueChange={setTipoFilter}>
                <TabsList variant="line">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="compra_venda">Compra e Venda</TabsTrigger>
                  <TabsTrigger value="garantia">Garantia</TabsTrigger>
                  <TabsTrigger value="entrega">Entrega</TabsTrigger>
                  <TabsTrigger value="desbloqueio">Desbloqueio</TabsTrigger>
                  <TabsTrigger value="personalizado">Personalizado</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Lista de Contratos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {contratos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum contrato encontrado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titulo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contratos.map((contrato) => (
                        <TableRow key={contrato.id}>
                          <TableCell className="font-medium">
                            {contrato.titulo}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {CONTRATO_TIPOS[contrato.tipo] ?? contrato.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {contrato.cliente?.nome ?? "---"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={STATUS_COLORS[contrato.status] ?? ""}
                            >
                              {CONTRATO_STATUS[contrato.status] ?? contrato.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(contrato.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon-sm" render={<Link href={`/gestor/contratos/${contrato.id}`} />}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="modelos">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => {
                setEditingModelo(null);
                setNewModelo({ nome: "", tipo: "", conteudo: "", variaveis: "" });
                setModeloDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Modelo
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Modelos de Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                {modelos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum modelo cadastrado.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Variaveis</TableHead>
                        <TableHead>Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelos.map((modelo) => (
                        <TableRow key={modelo.id}>
                          <TableCell className="font-medium">{modelo.nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {CONTRATO_TIPOS[modelo.tipo] ?? modelo.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {modelo.variaveis.slice(0, 3).map((v) => (
                                <Badge key={v} variant="outline" className="text-xs">
                                  {`{{${v}}}`}
                                </Badge>
                              ))}
                              {modelo.variaveis.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{modelo.variaveis.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon-sm" onClick={() => openEditModelo(modelo)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" onClick={() => handleDeleteModelo(modelo.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* New Contract Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
            <DialogDescription>
              Crie um novo contrato a partir de um modelo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContrato} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Contrato</Label>
              <Select value={newContrato.tipo} onValueChange={(v: string | null) => setNewContrato({ ...newContrato, tipo: v ?? "", modelo_id: "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRATO_TIPOS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo de Contrato</Label>
              <Select value={newContrato.modelo_id} onValueChange={(v: string | null) => setNewContrato({ ...newContrato, modelo_id: v ?? "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um modelo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredModelos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={newContrato.cliente_id} onValueChange={(v: string | null) => setNewContrato({ ...newContrato, cliente_id: v ?? "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Scooter (opcional)</Label>
              <Select value={newContrato.scooter_id} onValueChange={(v: string | null) => setNewContrato({ ...newContrato, scooter_id: v ?? "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a scooter" />
                </SelectTrigger>
                <SelectContent>
                  {scooters.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.modelo} {s.chassi ? `- ${s.chassi}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titulo (opcional)</Label>
              <Input
                placeholder="Titulo do contrato (auto-gerado se vazio)"
                value={newContrato.titulo}
                onChange={(e) => setNewContrato({ ...newContrato, titulo: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Criando..." : "Criar Contrato"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modelo Dialog */}
      <Dialog open={modeloDialogOpen} onOpenChange={setModeloDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingModelo ? "Editar Modelo" : "Novo Modelo de Contrato"}</DialogTitle>
            <DialogDescription>
              Defina o conteudo do modelo com variaveis entre {"{{"}chaves{"}}"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveModelo} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Modelo</Label>
                <Input
                  placeholder="Ex: Contrato de Compra Padrao"
                  value={newModelo.nome}
                  onChange={(e) => setNewModelo({ ...newModelo, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newModelo.tipo} onValueChange={(v: string | null) => setNewModelo({ ...newModelo, tipo: v ?? "" })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRATO_TIPOS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Variaveis (separadas por virgula)</Label>
              <Input
                placeholder="cliente_nome, cliente_cpf, scooter_modelo, data_atual"
                value={newModelo.variaveis}
                onChange={(e) => setNewModelo({ ...newModelo, variaveis: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Variaveis disponiveis: cliente_nome, cliente_cpf, cliente_telefone, cliente_email, cliente_endereco, scooter_modelo, scooter_marca, scooter_chassi, scooter_numero_serie, scooter_cor, scooter_ano, data_atual, data_extenso
              </p>
            </div>

            <div className="space-y-2">
              <Label>Conteudo do Modelo</Label>
              <Textarea
                placeholder="Digite o conteudo do contrato usando {{variavel}} para campos dinamicos..."
                value={newModelo.conteudo}
                onChange={(e) => setNewModelo({ ...newModelo, conteudo: e.target.value })}
                rows={12}
                className="font-mono text-sm"
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : editingModelo ? "Atualizar" : "Criar Modelo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
