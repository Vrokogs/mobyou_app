"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  User,
  Bike,
  Camera,
  Upload,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  ClipboardCheck,
  Search,
  AlertTriangle,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, CHECKIN_ITEMS, CHECKIN_CLASSIFICATIONS } from "@/lib/constants";
import type { OrdemServicoStatus } from "@/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrdemDetail {
  id: string;
  numero: string;
  status: OrdemServicoStatus;
  tipo: string;
  prioridade: string;
  descricao_problema: string | null;
  km_entrada: number | null;
  observacoes: string | null;
  created_at: string;
  scooter_id: string;
  cliente: { nome: string; telefone: string | null; email: string } | null;
  scooter: { modelo: string; marca: string; chassi: string | null; placa: string | null; km_atual: number } | null;
}

interface CheckinItemData {
  id?: string;
  item: string;
  classificacao: string;
  observacao: string;
}

interface FotoOrdem {
  id: string;
  tipo: string;
  url: string;
  descricao: string | null;
  created_at: string;
}

interface DiagnosticoData {
  id?: string;
  descricao: string;
  causa_raiz: string;
  recomendacoes: string;
  componentes_afetados: string[];
}

interface PecaNecessaria {
  nome: string;
  quantidade: number;
}

interface ServicoNecessario {
  descricao: string;
  tempo: string;
}

interface TimelineEvento {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  dados: Record<string, unknown> | null;
  created_at: string;
  usuario: { nome: string } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOTO_TIPOS = [
  { value: "frente", label: "Frente" },
  { value: "traseira", label: "Traseira" },
  { value: "lateral_direita", label: "Lateral Direita" },
  { value: "lateral_esquerda", label: "Lateral Esquerda" },
  { value: "painel", label: "Painel" },
  { value: "chassi", label: "Chassi" },
  { value: "km", label: "KM" },
  { value: "diagnostico", label: "Diagnostico" },
  { value: "servico", label: "Servico" },
] as const;

const TECHNICIAN_TRANSITIONS: Record<string, { next: OrdemServicoStatus; label: string; requiresCheckin?: boolean; requiresDiagnostico?: boolean }> = {
  recebido: { next: "checkin_realizado", label: "Concluir Check-in", requiresCheckin: true },
  checkin_realizado: { next: "em_analise", label: "Iniciar Analise" },
  em_analise: { next: "diagnostico_concluido", label: "Concluir Diagnostico", requiresDiagnostico: true },
  aguardando_inicio: { next: "em_servico", label: "Iniciar Servico" },
  em_servico: { next: "testes_finais", label: "Iniciar Testes Finais" },
  testes_finais: { next: "finalizado", label: "Finalizar Servico" },
};

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TecnicoOrdemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const supabase = createClient();

  // Main data
  const [ordem, setOrdem] = useState<OrdemDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Check-in
  const [checkinItems, setCheckinItems] = useState<CheckinItemData[]>([]);
  const [checkinExisting, setCheckinExisting] = useState(false);
  const [savingCheckin, setSavingCheckin] = useState(false);

  // Photos
  const [fotos, setFotos] = useState<FotoOrdem[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState<string | null>(null);

  // KM
  const [kmValue, setKmValue] = useState("");
  const [savingKm, setSavingKm] = useState(false);

  // Diagnostico
  const [diagnostico, setDiagnostico] = useState<DiagnosticoData>({
    descricao: "",
    causa_raiz: "",
    recomendacoes: "",
    componentes_afetados: [],
  });
  const [pecas, setPecas] = useState<PecaNecessaria[]>([]);
  const [servicos, setServicos] = useState<ServicoNecessario[]>([]);
  const [tempoEstimado, setTempoEstimado] = useState("");
  const [obsDiagnostico, setObsDiagnostico] = useState("");
  const [diagnosticoExisting, setDiagnosticoExisting] = useState(false);
  const [savingDiagnostico, setSavingDiagnostico] = useState(false);

  // Timeline / Progresso
  const [timeline, setTimeline] = useState<TimelineEvento[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [eventPhoto, setEventPhoto] = useState<File | null>(null);

  // Status transition
  const [transitioning, setTransitioning] = useState(false);

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  const loadOrdem = useCallback(async () => {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select(
        "id, numero, status, tipo, prioridade, descricao_problema, km_entrada, observacoes, created_at, scooter_id, " +
        "cliente:profiles!ordens_servico_cliente_id_fkey(nome, telefone, email), " +
        "scooter:scooters!ordens_servico_scooter_id_fkey(modelo, marca, chassi, placa, km_atual)"
      )
      .eq("id", orderId)
      .single();

    if (error || !data) {
      toast.error("Erro ao carregar ordem de servico");
      return;
    }
    setOrdem(data as unknown as OrdemDetail);
    setKmValue(data.km_entrada?.toString() ?? "");
  }, [orderId, supabase]);

  const loadCheckin = useCallback(async () => {
    const { data } = await supabase
      .from("checkin_items")
      .select("id, item, classificacao, observacao")
      .eq("ordem_id", orderId);

    if (data && data.length > 0) {
      setCheckinExisting(true);
      setCheckinItems(
        data.map((d) => ({
          id: d.id,
          item: d.item,
          classificacao: d.classificacao,
          observacao: d.observacao ?? "",
        }))
      );
    } else {
      setCheckinItems(
        CHECKIN_ITEMS.map((ci) => ({
          item: ci.value,
          classificacao: "bom",
          observacao: "",
        }))
      );
    }
  }, [orderId, supabase]);

  const loadFotos = useCallback(async () => {
    const { data } = await supabase
      .from("fotos_ordem")
      .select("id, tipo, url, descricao, created_at")
      .eq("ordem_id", orderId)
      .order("created_at", { ascending: false });

    if (data) setFotos(data);
  }, [orderId, supabase]);

  const loadDiagnostico = useCallback(async () => {
    const { data } = await supabase
      .from("diagnosticos")
      .select("id, descricao, causa_raiz, recomendacoes, componentes_afetados")
      .eq("ordem_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setDiagnosticoExisting(true);
      setDiagnostico({
        id: data.id,
        descricao: data.descricao ?? "",
        causa_raiz: data.causa_raiz ?? "",
        recomendacoes: data.recomendacoes ?? "",
        componentes_afetados: data.componentes_afetados ?? [],
      });
    }
  }, [orderId, supabase]);

  const loadTimeline = useCallback(async () => {
    const { data } = await supabase
      .from("timeline_eventos")
      .select("id, tipo, titulo, descricao, dados, created_at, usuario:profiles!timeline_eventos_usuario_id_fkey(nome)")
      .eq("ordem_id", orderId)
      .order("created_at", { ascending: false });

    if (data) setTimeline(data as unknown as TimelineEvento[]);
  }, [orderId, supabase]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadOrdem(), loadCheckin(), loadFotos(), loadDiagnostico(), loadTimeline()]);
      setLoading(false);
    }
    init();
  }, [loadOrdem, loadCheckin, loadFotos, loadDiagnostico, loadTimeline]);

  // -------------------------------------------------------------------------
  // Check-in handlers
  // -------------------------------------------------------------------------

  function updateCheckinItem(index: number, field: keyof CheckinItemData, value: string) {
    setCheckinItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function saveCheckin() {
    setSavingCheckin(true);
    try {
      if (checkinExisting) {
        // Delete old items and re-insert
        await supabase.from("checkin_items").delete().eq("ordem_id", orderId);
      }

      const items = checkinItems.map((ci) => ({
        ordem_id: orderId,
        item: ci.item,
        classificacao: ci.classificacao,
        observacao: ci.observacao || null,
      }));

      const { error } = await supabase.from("checkin_items").insert(items);
      if (error) throw error;

      setCheckinExisting(true);
      toast.success("Check-in salvo com sucesso");
      await loadCheckin();
    } catch {
      toast.error("Erro ao salvar check-in");
    } finally {
      setSavingCheckin(false);
    }
  }

  // -------------------------------------------------------------------------
  // Photo upload
  // -------------------------------------------------------------------------

  async function handlePhotoUpload(tipo: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFoto(tipo);
    try {
      const path = `ordens/${orderId}/${tipo}_${Date.now()}.${file.name.split(".").pop()}`;
      const { error } = await supabase.storage.from("fotos-ordem").upload(path, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("fotos-ordem").getPublicUrl(path);
      const { error: insertError } = await supabase.from("fotos_ordem").insert({
        ordem_id: orderId,
        tipo,
        url: publicUrl,
        storage_path: path,
      } as Record<string, unknown>);

      if (insertError) throw insertError;

      toast.success(`Foto "${tipo}" enviada com sucesso`);
      await loadFotos();
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingFoto(null);
      // Reset file input
      e.target.value = "";
    }
  }

  async function deleteFoto(foto: FotoOrdem) {
    try {
      await supabase.from("fotos_ordem").delete().eq("id", foto.id);
      toast.success("Foto removida");
      await loadFotos();
    } catch {
      toast.error("Erro ao remover foto");
    }
  }

  // -------------------------------------------------------------------------
  // KM
  // -------------------------------------------------------------------------

  async function saveKm() {
    if (!kmValue || !ordem) return;
    setSavingKm(true);
    try {
      const km = parseInt(kmValue, 10);
      if (isNaN(km) || km < 0) {
        toast.error("Quilometragem invalida");
        return;
      }

      const { error } = await supabase
        .from("ordens_servico")
        .update({ km_entrada: km })
        .eq("id", orderId);

      if (error) throw error;

      // Update scooter KM if higher
      if (ordem.scooter && km > ordem.scooter.km_atual) {
        await supabase
          .from("scooters")
          .update({ km_atual: km })
          .eq("id", ordem.scooter_id);
      }

      // Register in KM history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("km_historico").insert({
          scooter_id: ordem.scooter_id,
          km,
          registrado_por: user.id,
          origem: "ordem_servico",
        });
      }

      toast.success("Quilometragem registrada");
      await loadOrdem();
    } catch {
      toast.error("Erro ao registrar quilometragem");
    } finally {
      setSavingKm(false);
    }
  }

  // -------------------------------------------------------------------------
  // Diagnostico
  // -------------------------------------------------------------------------

  function addPeca() {
    setPecas((prev) => [...prev, { nome: "", quantidade: 1 }]);
  }

  function removePeca(index: number) {
    setPecas((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePeca(index: number, field: keyof PecaNecessaria, value: string | number) {
    setPecas((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addServico() {
    setServicos((prev) => [...prev, { descricao: "", tempo: "" }]);
  }

  function removeServico(index: number) {
    setServicos((prev) => prev.filter((_, i) => i !== index));
  }

  function updateServico(index: number, field: keyof ServicoNecessario, value: string) {
    setServicos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function saveDiagnostico() {
    if (!diagnostico.descricao.trim()) {
      toast.error("Descricao do diagnostico e obrigatoria");
      return;
    }

    setSavingDiagnostico(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario nao autenticado");
        return;
      }

      const diagPayload = {
        ordem_id: orderId,
        tecnico_id: user.id,
        descricao: diagnostico.descricao,
        causa_raiz: diagnostico.causa_raiz || null,
        recomendacoes: diagnostico.recomendacoes || null,
        componentes_afetados: diagnostico.componentes_afetados.length > 0 ? diagnostico.componentes_afetados : null,
      };

      if (diagnostico.id) {
        const { error } = await supabase
          .from("diagnosticos")
          .update(diagPayload)
          .eq("id", diagnostico.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("diagnosticos").insert(diagPayload);
        if (error) throw error;
      }

      // Add timeline event with all diagnosis metadata
      const dados: Record<string, unknown> = {};
      if (pecas.length > 0) dados.pecas_necessarias = pecas.filter((p) => p.nome.trim());
      if (servicos.length > 0) dados.servicos_necessarios = servicos.filter((s) => s.descricao.trim());
      if (tempoEstimado) dados.tempo_estimado = tempoEstimado;
      if (obsDiagnostico) dados.observacoes = obsDiagnostico;

      await supabase.from("timeline_eventos").insert({
        ordem_id: orderId,
        usuario_id: user.id,
        tipo: "diagnostico",
        titulo: diagnostico.id ? "Diagnostico atualizado" : "Diagnostico criado",
        descricao: diagnostico.descricao,
        dados: Object.keys(dados).length > 0 ? dados : null,
      });

      setDiagnosticoExisting(true);
      toast.success("Diagnostico salvo com sucesso");
      await Promise.all([loadDiagnostico(), loadTimeline()]);
    } catch {
      toast.error("Erro ao salvar diagnostico");
    } finally {
      setSavingDiagnostico(false);
    }
  }

  // -------------------------------------------------------------------------
  // Timeline / Progress
  // -------------------------------------------------------------------------

  async function addTimelineEvent() {
    if (!newEventTitle.trim()) {
      toast.error("Titulo do evento e obrigatorio");
      return;
    }

    setSavingEvent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let fotoUrl: string | null = null;

      // Upload optional event photo
      if (eventPhoto) {
        const path = `ordens/${orderId}/progresso_${Date.now()}.${eventPhoto.name.split(".").pop()}`;
        const { error: uploadError } = await supabase.storage.from("fotos-ordem").upload(path, eventPhoto);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from("fotos-ordem").getPublicUrl(path);
          fotoUrl = publicUrl;

          await supabase.from("fotos_ordem").insert({
            ordem_id: orderId,
            tipo: "servico",
            url: publicUrl,
            storage_path: path,
          } as Record<string, unknown>);
        }
      }

      const dados: Record<string, unknown> = {};
      if (fotoUrl) dados.foto_url = fotoUrl;

      await supabase.from("timeline_eventos").insert({
        ordem_id: orderId,
        usuario_id: user.id,
        tipo: "progresso",
        titulo: newEventTitle,
        descricao: newEventDesc || null,
        dados: Object.keys(dados).length > 0 ? dados : null,
      });

      setNewEventTitle("");
      setNewEventDesc("");
      setEventPhoto(null);
      toast.success("Evento adicionado");
      await loadTimeline();
    } catch {
      toast.error("Erro ao adicionar evento");
    } finally {
      setSavingEvent(false);
    }
  }

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  async function transitionStatus() {
    if (!ordem) return;

    const transition = TECHNICIAN_TRANSITIONS[ordem.status];
    if (!transition) return;

    // Validate requirements
    if (transition.requiresCheckin && !checkinExisting) {
      toast.error("Realize o check-in antes de avancar");
      return;
    }
    if (transition.requiresDiagnostico && !diagnosticoExisting) {
      toast.error("Crie o diagnostico antes de avancar");
      return;
    }

    setTransitioning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const updateData: Record<string, unknown> = { status: transition.next };

      // Set relevant dates
      if (transition.next === "em_servico") {
        updateData.data_entrada = new Date().toISOString();
      } else if (transition.next === "finalizado") {
        updateData.data_conclusao = new Date().toISOString();
      }

      const { error } = await supabase
        .from("ordens_servico")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Add timeline event
      if (user) {
        await supabase.from("timeline_eventos").insert({
          ordem_id: orderId,
          usuario_id: user.id,
          tipo: "status_change",
          titulo: `Status alterado para "${ORDER_STATUS_LABELS[transition.next] ?? transition.next}"`,
          descricao: null,
          dados: {
            status_anterior: ordem.status,
            status_novo: transition.next,
          },
        });
      }

      toast.success(`Status atualizado para "${ORDER_STATUS_LABELS[transition.next] ?? transition.next}"`);
      await Promise.all([loadOrdem(), loadTimeline()]);
    } catch {
      toast.error("Erro ao atualizar status");
    } finally {
      setTransitioning(false);
    }
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-48 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!ordem) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ordem de servico nao encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const transition = TECHNICIAN_TRANSITIONS[ordem.status];

  const checkinLabel = (item: string) =>
    CHECKIN_ITEMS.find((ci) => ci.value === item)?.label ?? item;

  const classifColor = (c: string) => {
    switch (c) {
      case "bom": return "bg-green-100 text-green-800";
      case "regular": return "bg-yellow-100 text-yellow-800";
      case "ruim": return "bg-red-100 text-red-800";
      case "ausente": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/tecnico/ordens" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">OS #{ordem.numero}</h1>
          <Badge className={ORDER_STATUS_COLORS[ordem.status] ?? "bg-gray-100 text-gray-800"}>
            {ORDER_STATUS_LABELS[ordem.status] ?? ordem.status}
          </Badge>
        </div>
      </div>

      {/* Client / Scooter info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nome</span>
              <span className="font-medium">{ordem.cliente?.nome ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Telefone</span>
              <span>{ordem.cliente?.telefone ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">E-mail</span>
              <span>{ordem.cliente?.email ?? "---"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bike className="h-4 w-4" />
              Scooter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modelo</span>
              <span className="font-medium">{ordem.scooter?.modelo ?? "---"} - {ordem.scooter?.marca ?? ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chassi</span>
              <span className="font-mono text-xs">{ordem.scooter?.chassi ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Placa</span>
              <span>{ordem.scooter?.placa ?? "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">KM Atual</span>
              <span>{ordem.scooter?.km_atual ?? 0} km</span>
            </div>
            {ordem.descricao_problema && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Problema relatado</span>
                  <p className="mt-1">{ordem.descricao_problema}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KM Registration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quilometragem de Entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs space-y-1.5">
              <Label htmlFor="km-input">KM</Label>
              <Input
                id="km-input"
                type="number"
                min={0}
                placeholder="Ex: 12500"
                value={kmValue}
                onChange={(e) => setKmValue(e.target.value)}
              />
            </div>
            <Button onClick={saveKm} disabled={savingKm || !kmValue}>
              {savingKm ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Registrar KM
            </Button>
          </div>
          {ordem.km_entrada != null && (
            <p className="text-sm text-muted-foreground mt-2">
              KM registrado: <strong>{ordem.km_entrada} km</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="checkin">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="checkin">
            <ClipboardCheck className="h-4 w-4 mr-1" />
            Check-in
          </TabsTrigger>
          <TabsTrigger value="fotos">
            <Camera className="h-4 w-4 mr-1" />
            Fotos
          </TabsTrigger>
          <TabsTrigger value="diagnostico">
            <Search className="h-4 w-4 mr-1" />
            Diagnostico
          </TabsTrigger>
          <TabsTrigger value="progresso">
            <Clock className="h-4 w-4 mr-1" />
            Progresso
          </TabsTrigger>
        </TabsList>

        {/* ====================== CHECK-IN TAB ====================== */}
        <TabsContent value="checkin">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Check-in da Scooter</span>
                {checkinExisting && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Realizado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkinItems.map((ci, index) => (
                  <div
                    key={ci.item}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">{checkinLabel(ci.item)}</Label>
                      <Badge className={classifColor(ci.classificacao)}>
                        {CHECKIN_CLASSIFICATIONS.find((c) => c.value === ci.classificacao)?.label ?? ci.classificacao}
                      </Badge>
                    </div>

                    <RadioGroup
                      value={ci.classificacao}
                      onValueChange={(val) => updateCheckinItem(index, "classificacao", val as string)}
                      className="flex flex-wrap gap-3"
                    >
                      {CHECKIN_CLASSIFICATIONS.map((cls) => (
                        <label
                          key={cls.value}
                          className="flex items-center gap-1.5 cursor-pointer"
                        >
                          <RadioGroupItem value={cls.value} />
                          <span className="text-sm">{cls.label}</span>
                        </label>
                      ))}
                    </RadioGroup>

                    <Input
                      placeholder="Observacao (opcional)"
                      value={ci.observacao}
                      onChange={(e) => updateCheckinItem(index, "observacao", e.target.value)}
                    />
                  </div>
                ))}

                <div className="flex justify-end pt-2">
                  <Button onClick={saveCheckin} disabled={savingCheckin}>
                    {savingCheckin && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    {checkinExisting ? "Atualizar Check-in" : "Salvar Check-in"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================== FOTOS TAB ====================== */}
        <TabsContent value="fotos">
          <Card>
            <CardHeader>
              <CardTitle>Fotos da Ordem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Upload grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {FOTO_TIPOS.map((ft) => {
                  const existing = fotos.filter((f) => f.tipo === ft.value);
                  const isUploading = uploadingFoto === ft.value;

                  return (
                    <div key={ft.value} className="space-y-2">
                      <Label className="text-sm font-medium">{ft.label}</Label>

                      {/* Show existing photos for this type */}
                      {existing.map((foto) => (
                        <div key={foto.id} className="relative group">
                          <img
                            src={foto.url}
                            alt={ft.label}
                            className="w-full h-32 object-cover rounded-lg border"
                          />
                          <button
                            type="button"
                            onClick={() => deleteFoto(foto)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {/* Upload button */}
                      <label
                        className={`flex items-center justify-center gap-2 h-24 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                          isUploading
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-primary hover:bg-accent/50"
                        }`}
                      >
                        {isUploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {existing.length > 0 ? "Adicionar mais" : "Enviar foto"}
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={isUploading}
                          onChange={(e) => handlePhotoUpload(ft.value, e)}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* All photos gallery */}
              {fotos.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3">Todas as fotos ({fotos.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {fotos.map((foto) => (
                        <div key={foto.id} className="relative group">
                          <img
                            src={foto.url}
                            alt={foto.tipo}
                            className="w-full h-28 object-cover rounded-lg border"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-b-lg">
                            {FOTO_TIPOS.find((ft) => ft.value === foto.tipo)?.label ?? foto.tipo}
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteFoto(foto)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {fotos.length === 0 && (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma foto enviada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================== DIAGNOSTICO TAB ====================== */}
        <TabsContent value="diagnostico">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Diagnostico Tecnico</span>
                {diagnosticoExisting && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Criado
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Problemas encontrados */}
              <div className="space-y-1.5">
                <Label htmlFor="diag-descricao">Problemas Encontrados *</Label>
                <Textarea
                  id="diag-descricao"
                  placeholder="Descreva detalhadamente os problemas encontrados..."
                  rows={4}
                  value={diagnostico.descricao}
                  onChange={(e) => setDiagnostico((prev) => ({ ...prev, descricao: e.target.value }))}
                />
              </div>

              {/* Causa raiz */}
              <div className="space-y-1.5">
                <Label htmlFor="diag-causa">Causa Raiz</Label>
                <Textarea
                  id="diag-causa"
                  placeholder="Qual a causa raiz do problema?"
                  rows={2}
                  value={diagnostico.causa_raiz}
                  onChange={(e) => setDiagnostico((prev) => ({ ...prev, causa_raiz: e.target.value }))}
                />
              </div>

              {/* Recomendacoes */}
              <div className="space-y-1.5">
                <Label htmlFor="diag-rec">Recomendacoes</Label>
                <Textarea
                  id="diag-rec"
                  placeholder="Recomendacoes tecnicas..."
                  rows={2}
                  value={diagnostico.recomendacoes}
                  onChange={(e) => setDiagnostico((prev) => ({ ...prev, recomendacoes: e.target.value }))}
                />
              </div>

              <Separator />

              {/* Pecas necessarias */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Pecas Necessarias</Label>
                  <Button variant="outline" size="sm" onClick={addPeca}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {pecas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma peca adicionada</p>
                ) : (
                  <div className="space-y-2">
                    {pecas.map((peca, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Nome da peca"
                          value={peca.nome}
                          onChange={(e) => updatePeca(index, "nome", e.target.value)}
                        />
                        <Input
                          className="w-24"
                          type="number"
                          min={1}
                          placeholder="Qtd"
                          value={peca.quantidade}
                          onChange={(e) => updatePeca(index, "quantidade", parseInt(e.target.value) || 1)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removePeca(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Servicos necessarios */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Servicos Necessarios</Label>
                  <Button variant="outline" size="sm" onClick={addServico}>
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {servicos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum servico adicionado</p>
                ) : (
                  <div className="space-y-2">
                    {servicos.map((servico, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Descricao do servico"
                          value={servico.descricao}
                          onChange={(e) => updateServico(index, "descricao", e.target.value)}
                        />
                        <Input
                          className="w-32"
                          placeholder="Tempo (ex: 2h)"
                          value={servico.tempo}
                          onChange={(e) => updateServico(index, "tempo", e.target.value)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => removeServico(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Tempo estimado & observacoes */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="tempo-estimado">Tempo Estimado Total</Label>
                  <Input
                    id="tempo-estimado"
                    placeholder="Ex: 4 horas"
                    value={tempoEstimado}
                    onChange={(e) => setTempoEstimado(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="obs-diag">Observacoes</Label>
                  <Input
                    id="obs-diag"
                    placeholder="Observacoes adicionais"
                    value={obsDiagnostico}
                    onChange={(e) => setObsDiagnostico(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveDiagnostico} disabled={savingDiagnostico}>
                  {savingDiagnostico && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {diagnosticoExisting ? "Atualizar Diagnostico" : "Criar Diagnostico"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====================== PROGRESSO TAB ====================== */}
        <TabsContent value="progresso">
          <div className="space-y-4">
            {/* Add event card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Adicionar Evento de Progresso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="event-title">Titulo *</Label>
                  <Input
                    id="event-title"
                    placeholder="Ex: Troca do pneu traseiro concluida"
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event-desc">Descricao</Label>
                  <Textarea
                    id="event-desc"
                    placeholder="Detalhes do que foi feito..."
                    rows={3}
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Foto (opcional)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEventPhoto(e.target.files?.[0] ?? null)}
                  />
                  {eventPhoto && (
                    <p className="text-xs text-muted-foreground">{eventPhoto.name}</p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button onClick={addTimelineEvent} disabled={savingEvent || !newEventTitle.trim()}>
                    {savingEvent && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Evento
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linha do Tempo ({timeline.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum evento registrado</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {timeline.map((event) => {
                        const iconClass =
                          event.tipo === "status_change"
                            ? "bg-blue-500"
                            : event.tipo === "diagnostico"
                            ? "bg-amber-500"
                            : "bg-primary";

                        const fotoUrl = event.dados?.foto_url as string | undefined;

                        return (
                          <div key={event.id} className="relative pl-10">
                            <div
                              className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full ring-2 ring-background ${iconClass}`}
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{event.titulo}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.created_at).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              {event.descricao && (
                                <p className="text-sm text-muted-foreground">{event.descricao}</p>
                              )}
                              {event.usuario && (
                                <p className="text-xs text-muted-foreground">por {event.usuario.nome}</p>
                              )}
                              {fotoUrl && (
                                <img
                                  src={fotoUrl}
                                  alt="Foto do evento"
                                  className="mt-2 h-24 w-auto rounded-lg border object-cover"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bottom action bar */}
      {transition && (
        <Card className="sticky bottom-4 border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <CardContent className="flex items-center justify-between p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Proxima etapa</p>
              <p className="text-xs text-muted-foreground">
                {ORDER_STATUS_LABELS[ordem.status]} → {ORDER_STATUS_LABELS[transition.next]}
              </p>
            </div>
            <Button onClick={transitionStatus} disabled={transitioning}>
              {transitioning ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              {transition.label}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
