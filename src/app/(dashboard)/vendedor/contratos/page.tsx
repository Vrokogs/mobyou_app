"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Send, Eye, FileText } from "lucide-react";
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

export default function VendedorContratosPage() {
  const [contratos, setContratos] = useState<ContratoWithRelations[]>([]);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [scooters, setScooters] = useState<Scooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const [newContrato, setNewContrato] = useState({
    tipo: "",
    modelo_id: "",
    cliente_id: "",
    scooter_id: "",
    titulo: "",
  });

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Load all contratos for clients this vendedor serves
    let query = supabase
      .from("contratos")
      .select("*, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi)")
      .order("created_at", { ascending: false });

    if (tipoFilter !== "todos") {
      query = query.eq("tipo", tipoFilter);
    }

    if (search.trim()) {
      query = query.ilike("titulo", `%${search}%`);
    }

    const { data: contratosData } = await query;
    setContratos((contratosData ?? []) as ContratoWithRelations[]);

    // Load templates, clients, scooters
    const [modelosRes, clientesRes, scootersRes] = await Promise.all([
      supabase.from("modelos_contrato").select("*").eq("ativo", true).order("titulo"),
      supabase.from("profiles").select("*").eq("role", "cliente").eq("ativo", true).order("nome"),
      supabase.from("scooters").select("*").order("modelo"),
    ]);

    setModelos((modelosRes.data ?? []) as ModeloContrato[]);
    setClientes((clientesRes.data ?? []) as Profile[]);
    setScooters((scootersRes.data ?? []) as Scooter[]);
    setLoading(false);
  }, [tipoFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  function handlePreview() {
    if (!newContrato.modelo_id) {
      toast.error("Selecione um modelo para visualizar");
      return;
    }
    const modelo = modelos.find((m) => m.id === newContrato.modelo_id);
    if (modelo) {
      const content = replaceVariables(modelo.conteudo_template, newContrato.cliente_id, newContrato.scooter_id);
      setPreviewContent(content);
      setPreviewOpen(true);
    }
  }

  async function handleCreateContrato(e: React.FormEvent) {
    e.preventDefault();
    if (!newContrato.tipo || !newContrato.cliente_id || !userId) {
      toast.error("Preencha os campos obrigatorios");
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();

      let conteudo = "";
      if (newContrato.modelo_id) {
        const modelo = modelos.find((m) => m.id === newContrato.modelo_id);
        if (modelo) {
          conteudo = replaceVariables(modelo.conteudo_template, newContrato.cliente_id, newContrato.scooter_id);
        }
      }

      const titulo = newContrato.titulo || `${CONTRATO_TIPOS[newContrato.tipo as ContratoTipo]} - ${clientes.find((c) => c.id === newContrato.cliente_id)?.nome || ""}`;

      const { error } = await supabase.from("contratos").insert({
        tipo: newContrato.tipo as ContratoTipo,
        titulo,
        conteudo,
        cliente_id: newContrato.cliente_id,
        scooter_id: newContrato.scooter_id || null,
        status: "rascunho" as ContratoStatus,
        variaveis: {},
      });

      if (error) {
        toast.error("Erro ao criar contrato", { description: error.message });
      } else {
        toast.success("Contrato criado com sucesso!");
        setDialogOpen(false);
        setNewContrato({ tipo: "", modelo_id: "", cliente_id: "", scooter_id: "", titulo: "" });
        loadData();
      }
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendContract(contratoId: string) {
    const supabase = createClient();
    const { error } = await (supabase
      .from("contratos") as any)
      .update({ status: "enviado" as ContratoStatus })
      .eq("id", contratoId);

    if (error) {
      toast.error("Erro ao enviar contrato");
    } else {
      toast.success("Contrato enviado para assinatura!");
      loadData();
    }
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
            Crie e gerencie contratos dos seus clientes.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo Contrato
        </Button>
      </div>

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
            Meus Contratos
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
                    <TableCell className="font-medium">{contrato.titulo}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CONTRATO_TIPOS[contrato.tipo] ?? contrato.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell>{contrato.cliente?.nome ?? "---"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[contrato.status] ?? ""}
                      >
                        {CONTRATO_STATUS[contrato.status] ?? contrato.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(contrato.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setPreviewContent(contrato.conteudo);
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {contrato.status === "rascunho" && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleSendContract(contrato.id)}
                          >
                            <Send className="h-4 w-4 text-blue-600" />
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
                    <SelectItem key={m.id} value={m.id}>{m.titulo}</SelectItem>
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
                placeholder="Titulo do contrato"
                value={newContrato.titulo}
                onChange={(e) => setNewContrato({ ...newContrato, titulo: e.target.value })}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handlePreview}>
                <Eye className="h-4 w-4 mr-1" />
                Visualizar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? "Criando..." : "Criar Contrato"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visualizacao do Contrato</DialogTitle>
          </DialogHeader>
          <div
            className="p-6 border rounded-lg bg-white prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewContent || "<p>Sem conteudo</p>" }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
