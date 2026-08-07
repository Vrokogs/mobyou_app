"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Send, FileDown, Eye, Pencil, Save, CheckCircle2, Clock, X,
} from "lucide-react";
import { toast } from "sonner";
import { CONTRATO_TIPOS, CONTRATO_STATUS } from "@/lib/constants";
import type { Contrato, ContratoStatus, Assinatura, Profile, Scooter, ModeloContrato } from "@/types/database";

const STATUS_COLORS: Record<ContratoStatus, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  enviado: "bg-blue-100 text-blue-800",
  visualizado: "bg-yellow-100 text-yellow-800",
  assinado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_ICONS: Record<ContratoStatus, React.ReactNode> = {
  rascunho: <Pencil className="h-3 w-3" />,
  enviado: <Send className="h-3 w-3" />,
  visualizado: <Eye className="h-3 w-3" />,
  assinado: <CheckCircle2 className="h-3 w-3" />,
  cancelado: <X className="h-3 w-3" />,
};

const AVAILABLE_VARIABLES = [
  "cliente_nome", "cliente_cpf", "cliente_telefone", "cliente_email", "cliente_endereco",
  "scooter_modelo", "scooter_marca", "scooter_chassi", "scooter_numero_serie",
  "scooter_cor", "scooter_ano", "data_atual", "data_extenso",
];

export default function ContratoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contratoId = params.id as string;

  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [cliente, setCliente] = useState<Profile | null>(null);
  const [scooter, setScooter] = useState<Scooter | null>(null);
  const [assinaturas, setAssinaturas] = useState<(Assinatura & { signatario?: { nome: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");

  const loadContrato = useCallback(async () => {
    const supabase = createClient();

    const { data: contratoData } = await (supabase
      .from("contratos") as any)
      .select("*")
      .eq("id", contratoId)
      .single();

    if (!contratoData) {
      setLoading(false);
      return;
    }

    setContrato(contratoData as Contrato);
    setEditedContent((contratoData as any).conteudo || "");

    // Load related data
    const [clienteRes, scooterRes, assinaturasRes] = await Promise.all([
      (supabase.from("profiles") as any).select("*").eq("id", (contratoData as any).cliente_id).single(),
      (contratoData as any).scooter_id
        ? (supabase.from("scooters") as any).select("*").eq("id", (contratoData as any).scooter_id).single()
        : Promise.resolve({ data: null }),
      (supabase
        .from("assinaturas") as any)
        .select("*, signatario:profiles!assinante_id(nome)")
        .eq("contrato_id", contratoId)
        .order("created_at"),
    ]);

    if (clienteRes.data) setCliente(clienteRes.data as Profile);
    if (scooterRes.data) setScooter(scooterRes.data as Scooter);
    setAssinaturas((assinaturasRes.data ?? []) as (Assinatura & { signatario?: { nome: string } | null })[]);
    setLoading(false);
  }, [contratoId]);

  useEffect(() => {
    loadContrato();
  }, [loadContrato]);

  async function handleSaveContent() {
    if (!contrato) return;
    setSaving(true);
    const supabase = createClient();

    const { error } = await (supabase
      .from("contratos") as any)
      .update({ conteudo: editedContent })
      .eq("id", contrato.id);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
    } else {
      toast.success("Contrato salvo!");
      setEditing(false);
      setContrato({ ...contrato, conteudo: editedContent });
    }
    setSaving(false);
  }

  async function handleChangeStatus() {
    if (!contrato || !newStatus) return;
    setSaving(true);
    const supabase = createClient();

    const { error } = await (supabase
      .from("contratos") as any)
      .update({ status: newStatus })
      .eq("id", contrato.id);

    if (error) {
      toast.error("Erro ao alterar status", { description: error.message });
    } else {
      toast.success(`Status alterado para ${CONTRATO_STATUS[newStatus as ContratoStatus]}`);
      setStatusDialogOpen(false);
      loadContrato();
    }
    setSaving(false);
  }

  async function handleSendToClient() {
    if (!contrato) return;
    setSaving(true);
    const supabase = createClient();

    const { error } = await (supabase
      .from("contratos") as any)
      .update({ status: "enviado" as ContratoStatus })
      .eq("id", contrato.id);

    if (error) {
      toast.error("Erro ao enviar contrato");
    } else {
      toast.success("Contrato enviado para o cliente!");
      loadContrato();
    }
    setSaving(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Skeleton className="h-[600px] w-full" />
          </div>
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <p className="text-muted-foreground text-center py-12">
          Contrato nao encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{contrato.titulo}</h1>
            <p className="text-muted-foreground text-sm font-mono">
              #{contrato.id.slice(0, 8)}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`${STATUS_COLORS[contrato.status]} flex items-center gap-1`}
          >
            {STATUS_ICONS[contrato.status]}
            {CONTRATO_STATUS[contrato.status]}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">Conteudo do Contrato</CardTitle>
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setEditing(false); setEditedContent(contrato.conteudo); }}>
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSaveContent} disabled={saving}>
                      <Save className="h-4 w-4 mr-1" />
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={contrato.status === "assinado"}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <div
                  className="min-h-[500px] p-6 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 prose prose-sm max-w-none"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: editedContent }}
                  onBlur={(e) => setEditedContent(e.currentTarget.innerHTML)}
                />
              ) : (
                <div
                  className="min-h-[500px] p-6 border rounded-lg bg-muted/30 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: contrato.conteudo || "<p class='text-muted-foreground'>Sem conteudo. Clique em Editar para adicionar.</p>" }}
                />
              )}
            </CardContent>
          </Card>

          {/* Signatures Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assinaturas</CardTitle>
            </CardHeader>
            <CardContent>
              {assinaturas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma assinatura registrada.
                </p>
              ) : (
                <div className="space-y-4">
                  {assinaturas.map((assinatura) => {
                    const a = assinatura as unknown as {
                      id: string;
                      nome_assinante?: string | null;
                      cpf?: string | null;
                      data_assinatura?: string | null;
                      ip_address?: string | null;
                      navegador?: string | null;
                      sistema_operacional?: string | null;
                      dispositivo?: string | null;
                      assinatura_imagem?: string | null;
                      rubrica_imagem?: string | null;
                      documento_hash?: string | null;
                      signatario?: { nome: string } | null;
                    };
                    return (
                      <div key={a.id} className="p-4 border rounded-lg bg-green-50/60 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                            <div>
                              <p className="font-medium">
                                {a.nome_assinante || a.signatario?.nome || "Assinante"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Cliente{a.cpf ? ` • CPF: ${a.cpf}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p>{formatDate(a.data_assinatura ?? null)}</p>
                            {a.ip_address && <p>IP: {a.ip_address}</p>}
                            {(a.navegador || a.dispositivo) && (
                              <p>
                                {[a.navegador, a.sistema_operacional, a.dispositivo]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {a.assinatura_imagem && (
                            <div className="sm:col-span-2">
                              <p className="text-[11px] text-muted-foreground mb-1">Assinatura</p>
                              <img
                                src={a.assinatura_imagem}
                                alt="Assinatura"
                                className="h-24 w-full object-contain rounded border bg-white"
                              />
                            </div>
                          )}
                          {a.rubrica_imagem && (
                            <div>
                              <p className="text-[11px] text-muted-foreground mb-1">Rubrica</p>
                              <img
                                src={a.rubrica_imagem}
                                alt="Rubrica"
                                className="h-24 w-full object-contain rounded border bg-white"
                              />
                            </div>
                          )}
                        </div>
                        {a.documento_hash && (
                          <p className="text-[10px] text-muted-foreground break-all">
                            Hash de integridade (SHA-256): {a.documento_hash}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</p>
                <p className="font-medium">{CONTRATO_TIPOS[contrato.tipo]}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Cliente</p>
                <p className="font-medium">{cliente?.nome ?? "---"}</p>
                {cliente?.cpf && <p className="text-xs text-muted-foreground">CPF: {cliente.cpf}</p>}
                {cliente?.email && <p className="text-xs text-muted-foreground">{cliente.email}</p>}
              </div>
              <Separator />
              {scooter && (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Scooter</p>
                    <p className="font-medium">{scooter.marca} {scooter.modelo}</p>
                    {scooter.chassi && <p className="text-xs text-muted-foreground font-mono">Chassi: {scooter.chassi}</p>}
                    {scooter.numero_serie && <p className="text-xs text-muted-foreground font-mono">Serie: {scooter.numero_serie}</p>}
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
                <Badge
                  variant="secondary"
                  className={`${STATUS_COLORS[contrato.status]} mt-1`}
                >
                  {CONTRATO_STATUS[contrato.status]}
                </Badge>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Datas</p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>Criado: {formatDate(contrato.created_at)}</span>
                </div>
                {assinaturas.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    <span>
                      Assinado:{" "}
                      {formatDate(
                        (assinaturas[0] as unknown as { data_assinatura?: string | null })
                          .data_assinatura ?? null
                      )}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Available Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Variaveis Disponiveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_VARIABLES.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono cursor-pointer hover:bg-muted">
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contrato.status === "rascunho" && (
                <Button className="w-full" onClick={handleSendToClient} disabled={saving}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Cliente
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setNewStatus(contrato.status);
                  setStatusDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Alterar Status
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(`
                      <html>
                        <head><title>${contrato.titulo}</title>
                          <style>body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }</style>
                        </head>
                        <body>${contrato.conteudo}</body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Gerar PDF / Imprimir
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Altere o status do contrato.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={(v: string | null) => setNewStatus(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTRATO_STATUS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleChangeStatus} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
