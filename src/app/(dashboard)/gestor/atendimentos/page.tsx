"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, MapPin, Copy, Phone, Bike, Clock, Star } from "lucide-react";
import {
  LOCAIS_ATENDIMENTO, LOCAL_ATENDIMENTO_LABEL, LOCAL_ATENDIMENTO_ENDERECO,
  STATUS_ATENDIMENTO, STATUS_ATENDIMENTO_COR, TIPOS_SOLICITACAO,
} from "@/lib/constants";

interface Atendimento {
  id: string;
  numero: number;
  tipo: string | null;
  local_atendimento: string | null;
  pedido_geral: string | null;
  observacoes: string | null;
  data_agendamento: string | null;
  status_atendimento: string | null;
  created_at: string;
  cliente: { nome: string; telefone: string | null } | null;
  scooter: { modelo: string; chassi: string | null } | null;
}

const tipoLabel = (t: string | null) => TIPOS_SOLICITACAO.find((x) => x.value === t)?.label ?? (t ?? "Atendimento");

function dataHora(a: Atendimento) {
  const isCaragua = a.local_atendimento === "caraguatatuba";
  if (isCaragua || !a.data_agendamento) return "A combinar";
  const d = new Date(a.data_agendamento);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function textoParaTecnico(a: Atendimento): string {
  const isCaragua = a.local_atendimento === "caraguatatuba";
  const linhas = [
    "NOVO ATENDIMENTO – PÓS-VENDA",
    "",
    `Cliente: ${a.cliente?.nome ?? "—"}`,
    `Moto: ${a.scooter?.modelo ?? "—"}`,
    `Contato: ${a.cliente?.telefone ?? "—"}`,
    `Solicitação: ${tipoLabel(a.tipo)}`,
    `Data/Horário: ${dataHora(a)}`,
    `Local: ${LOCAL_ATENDIMENTO_LABEL[a.local_atendimento ?? ""] ?? "—"}`,
    `Endereço: ${LOCAL_ATENDIMENTO_ENDERECO[a.local_atendimento ?? ""] ?? "—"}`,
    "",
    "Pedido geral do cliente:",
    a.pedido_geral || a.observacoes || "—",
  ];
  if (isCaragua) {
    linhas.push("", "Observações:", "Entrar em contato com o cliente para combinar a melhor data e horário para recebimento da moto.");
  }
  return linhas.join("\n");
}

export default function GestorAtendimentosPage() {
  const [rows, setRows] = useState<Atendimento[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("ordens_servico")
      .select("id, numero, tipo, local_atendimento, pedido_geral, observacoes, data_agendamento, status_atendimento, created_at, cliente:profiles!cliente_id(nome, telefone), scooter:scooters!scooter_id(modelo, chassi)")
      .not("local_atendimento", "is", null)
      .order("created_at", { ascending: false });
    setRows((data ?? []) as unknown as Atendimento[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function copiar(a: Atendimento) {
    const txt = textoParaTecnico(a);
    try {
      await navigator.clipboard.writeText(txt);
      toast.success("Pedido copiado! Cole no grupo de WhatsApp dos técnicos.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.", { description: "Selecione e copie manualmente." });
    }
  }

  async function mudarStatus(a: Atendimento, status: string) {
    const supabase = createClient();
    const { error } = await (supabase.from("ordens_servico") as any).update({ status_atendimento: status }).eq("id", a.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    load();
  }

  const novos = rows.filter((a) => a.status_atendimento === "novo" || a.status_atendimento === "aguardando_contato").length;

  function Cartao({ a, destaque }: { a: Atendimento; destaque?: boolean }) {
    const isCaragua = a.local_atendimento === "caraguatatuba";
    return (
      <div className={`rounded-lg border p-4 space-y-2 ${destaque ? "border-orange-300 bg-orange-50/40" : "bg-card"}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold flex items-center gap-1.5">
              {destaque && <Star className="h-4 w-4 text-orange-500" />}
              {a.cliente?.nome ?? "Cliente"}
            </p>
            <p className="text-xs text-muted-foreground">OS #{a.numero} • {new Date(a.created_at).toLocaleDateString("pt-BR")}</p>
          </div>
          <Select value={a.status_atendimento ?? "novo"} onValueChange={(v) => v && mudarStatus(a, v)}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue>
                <Badge variant="secondary" className={STATUS_ATENDIMENTO_COR[a.status_atendimento ?? "novo"]}>
                  {STATUS_ATENDIMENTO[a.status_atendimento ?? "novo"] ?? a.status_atendimento}
                </Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_ATENDIMENTO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <p className="flex items-center gap-1.5"><Bike className="h-3.5 w-3.5 text-muted-foreground" /> {a.scooter?.modelo ?? "—"}</p>
          <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {a.cliente?.telefone ?? "—"}</p>
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {LOCAL_ATENDIMENTO_LABEL[a.local_atendimento ?? ""] ?? "—"}</p>
          <p className={`flex items-center gap-1.5 ${isCaragua ? "text-amber-700 font-medium" : ""}`}><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {dataHora(a)}</p>
        </div>
        <p className="text-xs text-muted-foreground">{LOCAL_ATENDIMENTO_ENDERECO[a.local_atendimento ?? ""] ?? ""}</p>

        <p className="text-sm"><span className="text-muted-foreground">Solicitação:</span> {tipoLabel(a.tipo)}</p>
        {(a.pedido_geral || a.observacoes) && (
          <p className="text-sm bg-muted/40 rounded p-2"><span className="text-muted-foreground">Pedido do cliente:</span> {a.pedido_geral || a.observacoes}</p>
        )}

        <Button size="sm" variant="outline" className="w-full" onClick={() => copiar(a)}>
          <Copy className="h-4 w-4 mr-1.5" /> Copiar pedido para o técnico
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6" /> Atendimentos {novos > 0 && <Badge className="bg-red-500 text-white">{novos} novo(s)</Badge>}
        </h1>
        <p className="text-muted-foreground text-sm">Central de novos atendimentos e agendamentos do pós-venda</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum atendimento solicitado ainda.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {LOCAIS_ATENDIMENTO.map((local) => {
            const doLocal = rows.filter((a) => a.local_atendimento === local.value);
            if (doLocal.length === 0) return null;
            const isCaragua = local.value === "caraguatatuba";
            return (
              <Card key={local.value} className={isCaragua ? "border-orange-300" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${isCaragua ? "text-orange-500" : "text-primary"}`} />
                    {local.label}
                    <Badge variant="secondary">{doLocal.length}</Badge>
                    {isCaragua && <Badge variant="secondary" className="bg-orange-100 text-orange-800">A combinar</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {doLocal.map((a) => <Cartao key={a.id} a={a} destaque={isCaragua} />)}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
