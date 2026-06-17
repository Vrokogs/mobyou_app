"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, Circle, Clock, DollarSign, Image as ImageIcon,
  User, Bike, Wrench, FileText,
} from "lucide-react";

interface OrdemDetail {
  id: string;
  numero: number;
  status: string;
  km_atual: number | null;
  observacoes: string | null;
  created_at: string;
  data_agendamento: string | null;
  cliente: { nome: string; telefone: string } | null;
  scooter: { modelo: string; marca: string; cor: string; chassi: string } | null;
  tecnico: { nome: string } | null;
}

interface TimelineEvento {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  foto_url: string | null;
  created_at: string;
  responsavel: { nome: string } | null;
}

interface Orcamento {
  id: string;
  pecas: Array<{ nome: string; quantidade: number; preco_unitario: number }>;
  servicos: Array<{ descricao: string; preco: number }>;
  mao_de_obra: number;
  custos_adicionais: number;
  valor_total: number;
  prazo_estimado: string | null;
  status: string;
}

interface Foto {
  id: string;
  tipo: string;
  url: string;
}

const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", recebido: "Recebido",
  checkin_realizado: "Check-in Realizado", em_analise: "Em Análise Técnica",
  diagnostico_concluido: "Diagnóstico Concluído", orcamento_enviado: "Orçamento Enviado",
  aguardando_aprovacao: "Aguardando sua Aprovação", aprovado: "Aprovado",
  aguardando_inicio: "Aguardando Início do Serviço", em_servico: "Em Serviço",
  testes_finais: "Testes Finais", finalizado: "Finalizado", entregue: "Entregue",
  cancelado: "Cancelado", nao_compareceu: "Não Compareceu", remarcado: "Remarcado",
};

const STATUS_ORDER = [
  "agendado", "confirmado", "recebido", "checkin_realizado", "em_analise",
  "diagnostico_concluido", "orcamento_enviado", "aguardando_aprovacao", "aprovado",
  "aguardando_inicio", "em_servico", "testes_finais", "finalizado", "entregue",
];

export default function ClienteOrdemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ordem, setOrdem] = useState<OrdemDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvento[]>([]);
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel(`os-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "timeline_eventos", filter: `ordem_id=eq.${id}` }, () => {
        loadTimeline();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ordens_servico", filter: `id=eq.${id}` }, () => {
        loadOrdem();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function loadData() {
    await Promise.all([loadOrdem(), loadTimeline(), loadOrcamento(), loadFotos()]);
    setLoading(false);
  }

  async function loadOrdem() {
    const supabase = createClient();
    const { data } = await supabase
      .from("ordens_servico")
      .select("id, numero, status, km_atual, observacoes, created_at, data_agendamento, cliente:profiles!ordens_servico_cliente_id_fkey(nome, telefone), scooter:scooters!ordens_servico_scooter_id_fkey(modelo, marca, cor, chassi), tecnico:profiles!ordens_servico_tecnico_id_fkey(nome)")
      .eq("id", id)
      .single();
    if (data) setOrdem(data as unknown as OrdemDetail);
  }

  async function loadTimeline() {
    const supabase = createClient();
    const { data } = await supabase
      .from("timeline_eventos")
      .select("id, tipo, titulo, descricao, foto_url, created_at, responsavel:profiles!timeline_eventos_responsavel_id_fkey(nome)")
      .eq("ordem_id", id)
      .order("created_at", { ascending: true });
    if (data) setTimeline(data as unknown as TimelineEvento[]);
  }

  async function loadOrcamento() {
    const supabase = createClient();
    const { data } = await supabase
      .from("orcamentos")
      .select("*")
      .eq("ordem_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setOrcamento(data as Orcamento);
  }

  async function loadFotos() {
    const supabase = createClient();
    const { data } = await supabase
      .from("fotos_ordem")
      .select("id, tipo, url")
      .eq("ordem_id", id);
    if (data) setFotos(data);
  }

  async function handleApprove(approved: boolean) {
    setApproving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (orcamento) {
        await supabase.from("orcamentos").update({
          status: approved ? "aprovado" : "rejeitado",
          aprovado_por: approved ? user?.id : null,
          data_aprovacao: new Date().toISOString(),
        }).eq("id", orcamento.id);
      }

      await supabase.from("ordens_servico").update({
        status: approved ? "aprovado" : "cancelado",
      }).eq("id", id);

      await supabase.from("timeline_eventos").insert({
        ordem_id: id,
        tipo: approved ? "aprovacao" : "rejeicao",
        titulo: approved ? "Orçamento Aprovado" : "Orçamento Rejeitado",
        descricao: approved ? "Cliente aprovou o orçamento" : "Cliente rejeitou o orçamento",
        responsavel_id: user?.id,
      });

      toast.success(approved ? "Orçamento aprovado!" : "Orçamento rejeitado");
      loadData();
    } catch {
      toast.error("Erro ao processar");
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ordem) return <p className="text-center py-12 text-muted-foreground">Ordem não encontrada</p>;

  const currentIdx = STATUS_ORDER.indexOf(ordem.status);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />Voltar
        </Button>
        <h1 className="text-xl font-bold">OS #{ordem.numero}</h1>
        <Badge className="text-sm">{STATUS_LABELS[ordem.status] || ordem.status}</Badge>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Bike className="h-4 w-4 text-muted-foreground" />
              <span>{ordem.scooter?.modelo} - {ordem.scooter?.cor}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Chassi: {ordem.scooter?.chassi}</span>
            </div>
            {ordem.tecnico && (
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span>Técnico: {ordem.tecnico.nome}</span>
              </div>
            )}
            {ordem.km_atual && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">KM:</span> {ordem.km_atual}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Progress */}
      <Card>
        <CardHeader><CardTitle className="text-base">Progresso</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STATUS_ORDER.slice(0, Math.min(currentIdx + 3, STATUS_ORDER.length)).map((status, idx) => (
              <div key={status} className="flex items-center">
                {idx > 0 && <div className={`w-6 h-0.5 ${idx <= currentIdx ? "bg-emerald-500" : "bg-muted"}`} />}
                <div className="flex flex-col items-center min-w-[60px]">
                  {idx < currentIdx ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : idx === currentIdx ? (
                    <Circle className="h-5 w-5 text-primary fill-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted" />
                  )}
                  <span className={`text-[10px] mt-1 text-center ${idx === currentIdx ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {STATUS_LABELS[status]?.split(" ").slice(0, 2).join(" ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Approval Section */}
      {(ordem.status === "orcamento_enviado" || ordem.status === "aguardando_aprovacao") && orcamento && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-amber-600" />
              Orçamento para Aprovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orcamento.pecas && orcamento.pecas.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Peças</h4>
                {orcamento.pecas.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{p.nome} (x{p.quantidade})</span>
                    <span>R$ {(p.preco_unitario * p.quantidade).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            {orcamento.servicos && orcamento.servicos.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Serviços</h4>
                {orcamento.servicos.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{s.descricao}</span>
                    <span>R$ {s.preco.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            {orcamento.mao_de_obra > 0 && (
              <div className="flex justify-between text-sm">
                <span>Mão de Obra</span>
                <span>R$ {orcamento.mao_de_obra.toFixed(2)}</span>
              </div>
            )}
            {orcamento.custos_adicionais > 0 && (
              <div className="flex justify-between text-sm">
                <span>Custos Adicionais</span>
                <span>R$ {orcamento.custos_adicionais.toFixed(2)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>R$ {orcamento.valor_total.toFixed(2)}</span>
            </div>
            {orcamento.prazo_estimado && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" /> Prazo estimado: {orcamento.prazo_estimado}
              </p>
            )}
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={() => handleApprove(true)} disabled={approving}>
                <CheckCircle className="mr-2 h-4 w-4" />Aprovar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleApprove(false)} disabled={approving}>
                Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos */}
      {fotos.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" />Fotos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {fotos.map(f => (
                <div key={f.id} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-base">Acompanhamento em Tempo Real</CardTitle></CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhum evento registrado ainda</p>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-muted" />
              {timeline.map((evento, idx) => (
                <div key={evento.id} className="relative pb-6 last:pb-0">
                  <div className={`absolute -left-4 top-1 w-4 h-4 rounded-full border-2 ${
                    idx === timeline.length - 1
                      ? "bg-primary border-primary"
                      : "bg-emerald-500 border-emerald-500"
                  }`} />
                  <div className="ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{evento.titulo}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(evento.created_at).toLocaleDateString("pt-BR")} {new Date(evento.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {evento.descricao && <p className="text-sm text-muted-foreground">{evento.descricao}</p>}
                    {evento.responsavel && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />{evento.responsavel.nome}
                      </p>
                    )}
                    {evento.foto_url && (
                      <img src={evento.foto_url} alt="" className="mt-2 rounded-lg max-w-[200px] h-auto" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
