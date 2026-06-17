"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogClose,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  FOTO_TIPOS,
} from "@/lib/constants";
import { StatusStepper } from "@/components/ordens/status-stepper";
import { TimelineView } from "@/components/timeline/timeline-view";
import type { TimelineEvent } from "@/components/timeline/timeline-view";
import { CheckinForm, CheckinFormSkeleton } from "@/components/checkin/checkin-form";
import {
  OrcamentoForm,
  OrcamentoFormSkeleton,
} from "@/components/ordens/orcamento-form";
import type {
  OrdemServico,
  OrdemServicoStatus,
  Profile,
  Scooter,
  CheckinItem,
  FotoOrdem,
  Diagnostico,
  Orcamento,
  TimelineEvento,
} from "@/types/database";
import {
  ArrowLeft,
  User,
  Bike,
  Calendar,
  ClipboardCheck,
  Camera,
  Search,
  FileText,
  DollarSign,
  Clock,
  Loader2,
  Upload,
  UserPlus,
  CheckCircle,
  Wrench,
  Truck,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrdemDetail extends OrdemServico {
  cliente?: Profile;
  tecnico?: Profile | null;
  scooter?: Scooter;
}

type StatusAction = {
  label: string;
  nextStatus: OrdemServicoStatus;
  icon: React.ElementType;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost";
  timelineType: string;
  timelineTitle: string;
};

const STATUS_ACTIONS: Partial<Record<OrdemServicoStatus, StatusAction[]>> = {
  agendado: [
    {
      label: "Confirmar",
      nextStatus: "confirmado",
      icon: CheckCircle,
      timelineType: "confirmacao",
      timelineTitle: "Agendamento confirmado",
    },
    {
      label: "Nao Compareceu",
      nextStatus: "nao_compareceu",
      icon: AlertCircle,
      variant: "destructive",
      timelineType: "nao_comparecimento",
      timelineTitle: "Cliente nao compareceu",
    },
    {
      label: "Remarcar",
      nextStatus: "remarcado",
      icon: RefreshCw,
      variant: "outline",
      timelineType: "remarcacao",
      timelineTitle: "OS remarcada",
    },
  ],
  confirmado: [
    {
      label: "Registrar Recebimento",
      nextStatus: "recebido",
      icon: Truck,
      timelineType: "recebimento",
      timelineTitle: "Scooter recebida",
    },
  ],
  recebido: [
    {
      label: "Realizar Check-in",
      nextStatus: "checkin_realizado",
      icon: ClipboardCheck,
      timelineType: "checkin",
      timelineTitle: "Check-in realizado",
    },
  ],
  checkin_realizado: [
    {
      label: "Iniciar Analise",
      nextStatus: "em_analise",
      icon: Search,
      timelineType: "analise",
      timelineTitle: "Analise tecnica iniciada",
    },
  ],
  em_analise: [
    {
      label: "Concluir Diagnostico",
      nextStatus: "diagnostico_concluido",
      icon: FileText,
      timelineType: "diagnostico",
      timelineTitle: "Diagnostico concluido",
    },
  ],
  diagnostico_concluido: [
    {
      label: "Enviar Orcamento",
      nextStatus: "orcamento_enviado",
      icon: DollarSign,
      timelineType: "orcamento_enviado",
      timelineTitle: "Orcamento enviado ao cliente",
    },
  ],
  orcamento_enviado: [
    {
      label: "Aguardar Aprovacao",
      nextStatus: "aguardando_aprovacao",
      icon: Clock,
      timelineType: "status_change",
      timelineTitle: "Aguardando aprovacao do cliente",
    },
  ],
  aguardando_aprovacao: [
    {
      label: "Aprovar",
      nextStatus: "aprovado",
      icon: CheckCircle,
      timelineType: "aprovacao",
      timelineTitle: "Orcamento aprovado pelo cliente",
    },
    {
      label: "Cancelar",
      nextStatus: "cancelado",
      icon: XCircle,
      variant: "destructive",
      timelineType: "cancelamento",
      timelineTitle: "OS cancelada",
    },
  ],
  aprovado: [
    {
      label: "Aguardar Inicio",
      nextStatus: "aguardando_inicio",
      icon: Clock,
      timelineType: "status_change",
      timelineTitle: "Aguardando inicio do servico",
    },
  ],
  aguardando_inicio: [
    {
      label: "Iniciar Servico",
      nextStatus: "em_servico",
      icon: Wrench,
      timelineType: "inicio_servico",
      timelineTitle: "Servico iniciado",
    },
  ],
  em_servico: [
    {
      label: "Testes Finais",
      nextStatus: "testes_finais",
      icon: Search,
      timelineType: "testes",
      timelineTitle: "Testes finais iniciados",
    },
  ],
  testes_finais: [
    {
      label: "Finalizar",
      nextStatus: "finalizado",
      icon: CheckCircle,
      timelineType: "finalizacao",
      timelineTitle: "Servico finalizado",
    },
  ],
  finalizado: [
    {
      label: "Registrar Entrega",
      nextStatus: "entregue",
      icon: Truck,
      timelineType: "entrega",
      timelineTitle: "Scooter entregue ao cliente",
    },
  ],
  nao_compareceu: [
    {
      label: "Remarcar",
      nextStatus: "remarcado",
      icon: RefreshCw,
      variant: "outline",
      timelineType: "remarcacao",
      timelineTitle: "OS remarcada",
    },
  ],
  remarcado: [
    {
      label: "Reagendar",
      nextStatus: "agendado",
      icon: Calendar,
      timelineType: "agendamento",
      timelineTitle: "OS reagendada",
    },
  ],
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function OrdemDetalhePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [ordem, setOrdem] = useState<OrdemDetail | null>(null);
  const [checkinItems, setCheckinItems] = useState<CheckinItem[]>([]);
  const [fotos, setFotos] = useState<FotoOrdem[]>([]);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [tecnicos, setTecnicos] = useState<Pick<Profile, "id" | "nome">[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [changingStatus, setChangingStatus] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTecnico, setSelectedTecnico] = useState("");
  const [assigningTecnico, setAssigningTecnico] = useState(false);
  const [selectedFotoTipo, setSelectedFotoTipo] = useState("checkin_frente");

  const fetchOrdem = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(
          `
          *,
          cliente:profiles!ordens_servico_cliente_id_fkey(*),
          tecnico:profiles!ordens_servico_tecnico_id_fkey(*),
          scooter:scooters!ordens_servico_scooter_id_fkey(*)
        `
        )
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrdem(data as OrdemDetail);
    } catch (err) {
      console.error("Erro ao carregar OS:", err);
      toast.error("Erro ao carregar ordem de servico");
    }
  }, [orderId]);

  const fetchRelatedData = useCallback(async () => {
    try {
      const supabase = createClient();
      const [checkin, fotosRes, diagRes, orcRes] = await Promise.all([
        supabase
          .from("checkin_items")
          .select("*")
          .eq("ordem_id", orderId)
          .order("created_at"),
        supabase
          .from("fotos_ordem")
          .select("*")
          .eq("ordem_id", orderId)
          .order("created_at"),
        supabase
          .from("diagnosticos")
          .select("*")
          .eq("ordem_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("orcamentos")
          .select("*")
          .eq("ordem_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setCheckinItems(checkin.data || []);
      setFotos(fotosRes.data || []);
      setDiagnostico(diagRes.data);
      setOrcamento(orcRes.data);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    }
  }, [orderId]);

  const fetchTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("timeline_eventos")
        .select("*")
        .eq("ordem_id", orderId)
        .order("created_at", { ascending: false });

      const events: TimelineEvent[] = [];
      if (data) {
        for (const ev of data as any[]) {
          let userName: string | undefined;
          if (ev.usuario_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("nome")
              .eq("id", ev.usuario_id)
              .single();
            userName = (profile as any)?.nome;
          }
          events.push({ ...ev, usuario_nome: userName });
        }
      }

      setTimeline(events);
    } catch (err) {
      console.error("Erro ao carregar timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }, [orderId]);

  const fetchTecnicos = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("role", "tecnico")
        .eq("ativo", true)
        .order("nome");
      setTecnicos(data || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await fetchOrdem();
      await fetchRelatedData();
      fetchTimeline();
      fetchTecnicos();
      setLoading(false);
    }
    load();
  }, [fetchOrdem, fetchRelatedData, fetchTimeline, fetchTecnicos]);

  async function handleStatusChange(action: StatusAction) {
    setChangingStatus(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: Record<string, unknown> = {
        status: action.nextStatus,
      };

      if (action.nextStatus === "recebido") {
        updateData.data_entrada = new Date().toISOString();
      }
      if (action.nextStatus === "finalizado") {
        updateData.data_conclusao = new Date().toISOString();
      }
      if (action.nextStatus === "entregue") {
        updateData.data_entrega = new Date().toISOString();
      }

      const { error } = await (supabase
        .from("ordens_servico") as any)
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      await (supabase.from("timeline_eventos") as any).insert({
        ordem_id: orderId,
        usuario_id: user?.id || null,
        tipo: action.timelineType,
        titulo: action.timelineTitle,
        descricao: `Status alterado para: ${ORDER_STATUS_LABELS[action.nextStatus]}`,
      });

      toast.success(`Status alterado para ${ORDER_STATUS_LABELS[action.nextStatus]}`);
      await fetchOrdem();
      fetchTimeline();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      toast.error("Erro ao alterar status");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleAssignTecnico() {
    if (!selectedTecnico) return;
    setAssigningTecnico(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase
        .from("ordens_servico") as any)
        .update({ tecnico_id: selectedTecnico })
        .eq("id", orderId);

      if (error) throw error;

      const tecnicoNome = tecnicos.find((t) => t.id === selectedTecnico)?.nome;

      await (supabase.from("timeline_eventos") as any).insert({
        ordem_id: orderId,
        usuario_id: user?.id || null,
        tipo: "atribuicao",
        titulo: "Tecnico atribuido",
        descricao: `Tecnico ${tecnicoNome} atribuido a OS`,
      });

      toast.success("Tecnico atribuido com sucesso");
      setAssignDialogOpen(false);
      setSelectedTecnico("");
      await fetchOrdem();
      fetchTimeline();
    } catch (err) {
      console.error("Erro ao atribuir tecnico:", err);
      toast.error("Erro ao atribuir tecnico");
    } finally {
      setAssigningTecnico(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const filePath = `ordens/${orderId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("fotos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("fotos").getPublicUrl(filePath);

      const { error: insertError } = await (supabase
        .from("fotos_ordem") as any)
        .insert({
          ordem_id: orderId,
          tipo: selectedFotoTipo,
          url: publicUrl,
          descricao: null,
        });

      if (insertError) throw insertError;

      const { data: { user } } = await supabase.auth.getUser();
      await (supabase.from("timeline_eventos") as any).insert({
        ordem_id: orderId,
        usuario_id: user?.id || null,
        tipo: "foto",
        titulo: "Foto adicionada",
        descricao: `Foto do tipo "${FOTO_TIPOS.find((t) => t.value === selectedFotoTipo)?.label}" adicionada`,
      });

      toast.success("Foto enviada com sucesso");
      await fetchRelatedData();
      fetchTimeline();
    } catch (err) {
      console.error("Erro ao enviar foto:", err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ordem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-3 opacity-40" />
        <p className="text-lg font-medium">Ordem de servico nao encontrada</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/gestor/ordens")}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar
        </Button>
      </div>
    );
  }

  const currentActions = STATUS_ACTIONS[ordem.status] || [];
  const fotosByType = FOTO_TIPOS.map((tipo) => ({
    ...tipo,
    fotos: fotos.filter((f) => f.tipo === tipo.value),
  })).filter((t) => t.fotos.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => router.push("/gestor/ordens")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold font-mono">{ordem.numero}</h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-1",
                ORDER_STATUS_COLORS[ordem.status]
              )}
            >
              {ORDER_STATUS_LABELS[ordem.status]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedTecnico(ordem.tecnico_id || "");
              setAssignDialogOpen(true);
            }}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            {ordem.tecnico_id ? "Trocar Tecnico" : "Atribuir Tecnico"}
          </Button>
        </div>
      </div>

      {/* Status Stepper */}
      <Card>
        <CardContent className="pt-4 pb-2">
          <StatusStepper currentStatus={ordem.status} />
        </CardContent>
      </Card>

      {/* Actions Bar */}
      {currentActions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-wrap gap-2 py-3">
            <span className="text-sm font-medium text-muted-foreground mr-2 self-center">
              Acoes:
            </span>
            {currentActions.map((action) => (
              <Button
                key={action.nextStatus}
                variant={action.variant || "default"}
                size="sm"
                onClick={() => handleStatusChange(action)}
                disabled={changingStatus}
              >
                {changingStatus ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <action.icon className="h-3.5 w-3.5 mr-1" />
                )}
                {action.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Informacoes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium">
                        {ordem.cliente?.nome || "-"}
                      </p>
                      {ordem.cliente?.telefone && (
                        <p className="text-xs text-muted-foreground">
                          {ordem.cliente.telefone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Bike className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Scooter</p>
                      <p className="font-medium">
                        {ordem.scooter?.modelo || "-"}
                        {ordem.scooter?.placa && (
                          <span className="text-muted-foreground ml-1">
                            ({ordem.scooter.placa})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Chassi</p>
                      <p className="font-mono text-sm">
                        {ordem.scooter?.chassi || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tecnico</p>
                      <p className="font-medium">
                        {ordem.tecnico?.nome || "Nao atribuido"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Play className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        KM Entrada
                      </p>
                      <p className="font-medium">
                        {ordem.km_entrada
                          ? `${ordem.km_entrada.toLocaleString("pt-BR")} km`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Datas</p>
                      <div className="text-xs space-y-0.5">
                        <p>
                          Agendamento: {formatDate(ordem.data_agendamento)}
                        </p>
                        <p>Entrada: {formatDate(ordem.data_entrada)}</p>
                        <p>Conclusao: {formatDate(ordem.data_conclusao)}</p>
                        <p>Entrega: {formatDate(ordem.data_entrega)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {ordem.observacoes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">
                    Observacoes
                  </p>
                  <p className="text-sm">{ordem.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-in Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Check-in
              </CardTitle>
              {checkinItems.length > 0 && (
                <CardAction>
                  <Badge variant="secondary">
                    {checkinItems.length} itens
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <CheckinForm
                orderId={orderId}
                existingData={checkinItems}
                readOnly={
                  ordem.status !== "recebido" &&
                  ordem.status !== "checkin_realizado"
                }
                onSubmit={async () => {
                  await fetchRelatedData();
                  fetchTimeline();
                }}
              />
            </CardContent>
          </Card>

          {/* Fotos Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos
              </CardTitle>
              <CardAction>
                <div className="flex items-center gap-2">
                  <Select
                    value={selectedFotoTipo}
                    onValueChange={(val) => val && setSelectedFotoTipo(val)}
                  >
                    <SelectTrigger className="h-7 text-xs w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FOTO_TIPOS.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                    />
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Enviar
                    </Button>
                  </div>
                </div>
              </CardAction>
            </CardHeader>
            <CardContent>
              {fotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Camera className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma foto adicionada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fotosByType.map((grupo) => (
                    <div key={grupo.value}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {grupo.label}
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {grupo.fotos.map((foto) => (
                          <div
                            key={foto.id}
                            className="aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                            onClick={() => window.open(foto.url, "_blank")}
                          >
                            <img
                              src={foto.url}
                              alt={foto.descricao || grupo.label}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostico Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Diagnostico
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostico ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Descricao
                    </p>
                    <p>{diagnostico.descricao}</p>
                  </div>
                  {diagnostico.causa_raiz && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Causa Raiz
                      </p>
                      <p>{diagnostico.causa_raiz}</p>
                    </div>
                  )}
                  {diagnostico.componentes_afetados &&
                    diagnostico.componentes_afetados.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Componentes Afetados
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {diagnostico.componentes_afetados.map((comp, i) => (
                            <Badge key={i} variant="secondary">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  {diagnostico.recomendacoes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Recomendacoes
                      </p>
                      <p>{diagnostico.recomendacoes}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        diagnostico.coberto_garantia
                          ? "default"
                          : "secondary"
                      }
                    >
                      {diagnostico.coberto_garantia
                        ? "Coberto pela Garantia"
                        : "Fora da Garantia"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">
                    Diagnostico ainda nao realizado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orcamento Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Orcamento
              </CardTitle>
              {orcamento && (
                <CardAction>
                  <Badge
                    variant={
                      orcamento.aprovado === true
                        ? "default"
                        : orcamento.aprovado === false
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {orcamento.aprovado === true
                      ? "Aprovado"
                      : orcamento.aprovado === false
                        ? "Rejeitado"
                        : "Rascunho"}
                  </Badge>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              <OrcamentoForm
                orderId={orderId}
                diagnosticoData={diagnostico}
                existingOrcamento={orcamento}
                onSubmit={async () => {
                  await fetchRelatedData();
                  fetchTimeline();
                }}
                onSendToClient={async () => {
                  await fetchOrdem();
                  await fetchRelatedData();
                  fetchTimeline();
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium capitalize">
                    {ordem.tipo}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prioridade</span>
                  <Badge
                    variant={
                      ordem.prioridade === "urgente"
                        ? "destructive"
                        : "secondary"
                    }
                    className="capitalize"
                  >
                    {ordem.prioridade}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="font-bold">
                    {formatCurrency(ordem.valor_total)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{formatDate(ordem.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineView events={timeline} loading={loadingTimeline} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Technician Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Atribuir Tecnico</DialogTitle>
            <DialogDescription>
              Selecione o tecnico responsavel por esta OS.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label className="text-sm font-medium">Tecnico</Label>
            <Select
              value={selectedTecnico}
              onValueChange={(val) => val && setSelectedTecnico(val)}
            >
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Selecione o tecnico" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button
              onClick={handleAssignTecnico}
              disabled={!selectedTecnico || assigningTecnico}
            >
              {assigningTecnico ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1.5" />
              )}
              Atribuir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
