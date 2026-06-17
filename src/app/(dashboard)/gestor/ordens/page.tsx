"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from "@/lib/constants";
import type {
  OrdemServico,
  OrdemServicoStatus,
  Profile,
  Scooter,
} from "@/types/database";
import {
  Plus,
  Search,
  Eye,
  Loader2,
  ClipboardList,
  Calendar,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

interface OrdemWithRelations extends OrdemServico {
  cliente?: Pick<Profile, "id" | "nome">;
  tecnico?: Pick<Profile, "id" | "nome"> | null;
  scooter?: Pick<Scooter, "id" | "modelo" | "placa">;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "todos", label: "Todos os Status" },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default function OrdensPage() {
  const router = useRouter();
  const [ordens, setOrdens] = useState<OrdemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // New OS dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientes, setClientes] = useState<Pick<Profile, "id" | "nome">[]>([]);
  const [scootersCliente, setScootersCliente] = useState<
    Pick<Scooter, "id" | "modelo" | "placa">[]
  >([]);
  const [newOS, setNewOS] = useState({
    cliente_id: "",
    scooter_id: "",
    data_agendamento: "",
    observacoes: "",
  });
  const [creating, setCreating] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingScooters, setLoadingScooters] = useState(false);

  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from("ordens_servico")
        .select(
          `
          *,
          cliente:profiles!ordens_servico_cliente_id_fkey(id, nome),
          tecnico:profiles!ordens_servico_tecnico_id_fkey(id, nome),
          scooter:scooters!ordens_servico_scooter_id_fkey(id, modelo, placa)
        `
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter);
      }

      if (dateFrom) {
        query = query.gte("data_agendamento", dateFrom);
      }
      if (dateTo) {
        query = query.lte("data_agendamento", dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      setOrdens((data as OrdemWithRelations[]) || []);
    } catch (err) {
      console.error("Erro ao carregar ordens:", err);
      toast.error("Erro ao carregar ordens de servico");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchOrdens();
  }, [fetchOrdens]);

  const filteredOrdens = ordens.filter((os) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      os.numero?.toLowerCase().includes(term) ||
      os.cliente?.nome?.toLowerCase().includes(term) ||
      os.scooter?.modelo?.toLowerCase().includes(term) ||
      os.scooter?.placa?.toLowerCase().includes(term)
    );
  });

  async function loadClientes() {
    setLoadingClientes(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("role", "cliente")
        .eq("ativo", true)
        .order("nome");
      setClientes(data || []);
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoadingClientes(false);
    }
  }

  async function loadScootersForCliente(clienteId: string) {
    setLoadingScooters(true);
    setScootersCliente([]);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("scooters")
        .select("id, modelo, placa")
        .eq("proprietario_id", clienteId)
        .order("modelo");
      setScootersCliente(data || []);
    } catch {
      toast.error("Erro ao carregar scooters");
    } finally {
      setLoadingScooters(false);
    }
  }

  function handleOpenDialog() {
    setNewOS({ cliente_id: "", scooter_id: "", data_agendamento: "", observacoes: "" });
    setScootersCliente([]);
    loadClientes();
    setDialogOpen(true);
  }

  async function handleCreateOS() {
    if (!newOS.cliente_id || !newOS.scooter_id) {
      toast.error("Selecione o cliente e a scooter");
      return;
    }

    setCreating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const numero = `OS-${Date.now().toString(36).toUpperCase()}`;

      const { data, error } = await (supabase
        .from("ordens_servico") as any)
        .insert({
          numero,
          cliente_id: newOS.cliente_id,
          scooter_id: newOS.scooter_id,
          status: "agendado",
          tipo: "manutencao",
          prioridade: "normal",
          data_agendamento: newOS.data_agendamento || null,
          observacoes: newOS.observacoes || null,
          vendedor_id: user?.id || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (data) {
        await (supabase.from("timeline_eventos") as any).insert({
          ordem_id: data.id,
          usuario_id: user?.id || null,
          tipo: "criacao",
          titulo: "Ordem de servico criada",
          descricao: `OS ${numero} criada e agendada`,
        });
      }

      toast.success("Ordem de servico criada com sucesso");
      setDialogOpen(false);
      fetchOrdens();

      if (data) {
        router.push(`/gestor/ordens/${data.id}`);
      }
    } catch (err) {
      console.error("Erro ao criar OS:", err);
      toast.error("Erro ao criar ordem de servico");
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Ordens de Servico
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie todas as ordens de servico
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova OS
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(val) => val && setStatusFilter(val)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground mb-1 block">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>

        <div className="w-full sm:w-auto">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Ate
          </Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-[160px]"
          />
        </div>

        <div className="w-full sm:w-auto sm:flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">
            Buscar
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por numero, cliente, scooter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Scooter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tecnico</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-7 w-7 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredOrdens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma ordem de servico encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrdens.map((os) => (
                <TableRow
                  key={os.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/gestor/ordens/${os.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {os.numero}
                  </TableCell>
                  <TableCell>{os.cliente?.nome || "-"}</TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">
                        {os.scooter?.modelo || "-"}
                      </span>
                      {os.scooter?.placa && (
                        <span className="text-xs text-muted-foreground ml-1.5">
                          {os.scooter.placa}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        ORDER_STATUS_COLORS[os.status]
                      }`}
                    >
                      {ORDER_STATUS_LABELS[os.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {os.tecnico?.nome || (
                      <span className="text-muted-foreground text-xs">
                        Nao atribuido
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(os.data_agendamento)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/gestor/ordens/${os.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* New OS Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Servico</DialogTitle>
            <DialogDescription>
              Crie uma nova OS selecionando o cliente e a scooter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Cliente</Label>
              <Select
                value={newOS.cliente_id}
                onValueChange={(val) => {
                  if (!val) return;
                  setNewOS((prev) => ({
                    ...prev,
                    cliente_id: val,
                    scooter_id: "",
                  }));
                  loadScootersForCliente(val);
                }}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue
                    placeholder={
                      loadingClientes ? "Carregando..." : "Selecione o cliente"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Scooter</Label>
              <Select
                value={newOS.scooter_id}
                onValueChange={(val) =>
                  val && setNewOS((prev) => ({ ...prev, scooter_id: val }))
                }
                disabled={!newOS.cliente_id}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue
                    placeholder={
                      loadingScooters
                        ? "Carregando..."
                        : !newOS.cliente_id
                          ? "Selecione o cliente primeiro"
                          : "Selecione a scooter"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {scootersCliente.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.modelo}
                      {s.placa ? ` - ${s.placa}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">Data Agendamento</Label>
              <Input
                type="date"
                value={newOS.data_agendamento}
                onChange={(e) =>
                  setNewOS((prev) => ({
                    ...prev,
                    data_agendamento: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Observacoes</Label>
              <Textarea
                placeholder="Descricao do problema ou observacoes..."
                value={newOS.observacoes}
                onChange={(e) =>
                  setNewOS((prev) => ({
                    ...prev,
                    observacoes: e.target.value,
                  }))
                }
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleCreateOS} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Criar OS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
