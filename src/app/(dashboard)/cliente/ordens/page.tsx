"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, ChevronRight, Wrench, AlertTriangle, FileWarning, Info, MapPin } from "lucide-react";
import {
  LOCAIS_ATENDIMENTO, proximasDatasLocal, horariosLocal, MENSAGEM_A_COMBINAR, TIPOS_SOLICITACAO,
} from "@/lib/constants";

interface Ordem {
  id: string;
  numero: number;
  status: string;
  created_at: string;
  scooter: { id: string; modelo: string } | null;
}

interface Scooter {
  id: string;
  modelo: string;
  chassi: string;
}

const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", recebido: "Recebido",
  checkin_realizado: "Check-in", em_analise: "Em Análise",
  diagnostico_concluido: "Diagnóstico", orcamento_enviado: "Orçamento Enviado",
  aguardando_aprovacao: "Aguardando Aprovação", aprovado: "Aprovado",
  aguardando_inicio: "Aguardando Início", em_servico: "Em Serviço",
  testes_finais: "Testes Finais", finalizado: "Finalizado", entregue: "Entregue",
  cancelado: "Cancelado",
};

export default function ClienteOrdensPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [scooters, setScooters] = useState<Scooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ scooter_id: "", local: "", tipo: "preventiva", data: "", hora: "", pedido: "" });
  const [contratosPendentes, setContratosPendentes] = useState(0);

  const localSel = LOCAIS_ATENDIMENTO.find((l) => l.value === form.local);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [ordensRes, scootersRes, contratosRes] = await Promise.all([
      supabase.from("ordens_servico")
        .select("id, numero, status, created_at, scooter:scooters!ordens_servico_scooter_id_fkey(id, modelo)")
        .eq("cliente_id", user.id).order("created_at", { ascending: false }),
      supabase.from("scooters").select("id, modelo, chassi").eq("cliente_id", user.id),
      supabase.from("contratos").select("id, status").eq("cliente_id", user.id).neq("status", "assinado"),
    ]);

    if (ordensRes.data) setOrdens(ordensRes.data as unknown as Ordem[]);
    if (scootersRes.data) setScooters(scootersRes.data as unknown as Scooter[]);
    setContratosPendentes((contratosRes.data ?? []).length);
    setLoading(false);
  }

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault();
    if (contratosPendentes > 0) {
      toast.error("Contrato pendente de assinatura", {
        description: "Assine o contrato para poder agendar manutenções.",
      });
      return;
    }
    if (!form.scooter_id) { toast.error("Selecione a scooter."); return; }
    if (!form.local) { toast.error("Selecione o local de atendimento."); return; }

    const aCombinar = localSel?.tipo === "a_combinar";
    if (!aCombinar && (!form.data || !form.hora)) {
      toast.error("Selecione a data e o horário disponíveis.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dataAgendamento = aCombinar ? null : `${form.data}T${form.hora}:00`;
      const { error } = await (supabase.from("ordens_servico") as any).insert({
        scooter_id: form.scooter_id,
        cliente_id: user.id,
        status: "agendado",
        tipo: form.tipo,
        local_atendimento: form.local,
        pedido_geral: form.pedido || null,
        observacoes: form.pedido || null,
        data_agendamento: dataAgendamento,
        status_atendimento: aCombinar ? "aguardando_contato" : "novo",
      });

      if (error) { toast.error("Erro ao solicitar", { description: error.message }); return; }

      toast.success(aCombinar
        ? "Solicitação enviada! Nosso técnico entrará em contato."
        : "Manutenção agendada!");
      setDialogOpen(false);
      setForm({ scooter_id: "", local: "", tipo: "preventiva", data: "", hora: "", pedido: "" });
      load();
    } catch { toast.error("Erro inesperado"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {contratosPendentes > 0 && (
        <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-red-800 flex items-center gap-1.5">
              <FileWarning className="h-4 w-4" /> Contrato pendente de assinatura
            </p>
            <p className="text-red-700 mt-0.5">
              Você tem {contratosPendentes} contrato(s) aguardando assinatura. Enquanto não estiver
              assinado, <strong>não é possível agendar manutenções</strong>. Vá em{" "}
              <Link href="/cliente/documentos" className="underline font-medium">Meus Documentos</Link> para assinar.
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Ordens</h1>
          <p className="text-muted-foreground">Acompanhe e solicite manutenções</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button disabled={contratosPendentes > 0}><Plus className="mr-2 h-4 w-4" />Solicitar Manutenção</Button>
            }
          />
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar Manutenção</DialogTitle></DialogHeader>
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div className="space-y-2">
                <Label>Scooter</Label>
                <Select items={Object.fromEntries(scooters.map((s) => [s.id, `${s.modelo}${s.chassi ? ` - ${s.chassi}` : ""}`]))} value={form.scooter_id} onValueChange={v => setForm({...form, scooter_id: v ?? ""})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {scooters.map(s => <SelectItem key={s.id} value={s.id}>{s.modelo}{s.chassi ? ` - ${s.chassi}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de solicitação</Label>
                <Select items={Object.fromEntries(TIPOS_SOLICITACAO.map((t) => [t.value, t.label]))} value={form.tipo} onValueChange={v => v && setForm({...form, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_SOLICITACAO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Local de atendimento (escolha o mais perto)</Label>
                <Select items={Object.fromEntries(LOCAIS_ATENDIMENTO.map((l) => [l.value, l.label]))} value={form.local} onValueChange={v => setForm({...form, local: v ?? "", data: "", hora: ""})}>
                  <SelectTrigger><SelectValue placeholder="Selecione a cidade/local" /></SelectTrigger>
                  <SelectContent>
                    {LOCAIS_ATENDIMENTO.map(l => (
                      <SelectItem key={l.value} value={l.value}>
                        <div className="flex flex-col">
                          <span>{l.label}</span>
                          <span className="text-[11px] text-muted-foreground">{l.endereco}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {localSel && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localSel.endereco)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-1.5 rounded-md border bg-muted/40 px-3 py-2 text-xs hover:bg-muted"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{localSel.endereco} <span className="text-primary underline">(ver no mapa)</span></span>
                  </a>
                )}
              </div>

              {/* Caraguatatuba: sem agenda */}
              {localSel?.tipo === "a_combinar" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-800">{MENSAGEM_A_COMBINAR}</p>
                    <p className="text-amber-700 mt-1 font-medium">Data/Horário: A combinar</p>
                  </div>
                </div>
              )}

              {/* Centro / Costa Sul: agenda Ter/Qua/Qui, 10h–17h */}
              {localSel?.tipo === "agenda" && (
                <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> O horário é para você <b>deixar/entregar a moto</b> na assistência.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Dia para deixar a moto (Ter/Qua/Qui)</Label>
                    <Select items={Object.fromEntries(proximasDatasLocal(localSel).map((d) => [d, new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })]))} value={form.data} onValueChange={v => setForm({...form, data: v ?? ""})}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Escolha o dia" /></SelectTrigger>
                      <SelectContent>
                        {proximasDatasLocal(localSel).map((d) => (
                          <SelectItem key={d} value={d}>{new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Horário de entrega (10h–17h)</Label>
                    <Select items={Object.fromEntries(horariosLocal(localSel).map((h) => [h, h]))} value={form.hora} onValueChange={v => setForm({...form, hora: v ?? ""})}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Horário" /></SelectTrigger>
                      <SelectContent>
                        {horariosLocal(localSel).map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Pedido / problema apresentado</Label>
                <Textarea placeholder="Descreva o problema ou o motivo da manutenção..." value={form.pedido} onChange={e => setForm({...form, pedido: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Enviando..." : "Solicitar atendimento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : ordens.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma ordem de serviço</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ordens.map(ordem => (
            <Link key={ordem.id} href={`/cliente/ordens/${ordem.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">OS #{ordem.numero}</span>
                      <Badge>{STATUS_LABELS[ordem.status] || ordem.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {ordem.scooter?.modelo} &bull; {new Date(ordem.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
