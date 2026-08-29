"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { CalendarClock, AlertTriangle, CheckCircle2, Gift } from "lucide-react";
import { PREVENTIVA_STATUS, isClienteLegado } from "@/lib/constants";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

interface Prev {
  id: string;
  numero: number;
  data_prevista: string;
  gratuita: boolean;
  obrigatoria: boolean;
  valor: number | null;
  status: string;
  realizada_em: string | null;
  scooter: { modelo: string; chassi: string | null; data_compra: string | null; legado: boolean } | null;
  cliente: { nome: string; telefone: string | null } | null;
}

const brl = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const hojeISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("pt-BR");

export default function GestorManutencoesPage() {
  const [rows, setRows] = useState<Prev[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"todas" | "pendente" | "vencida" | "realizada">("pendente");
  // Competência do mês: "todos" ou "AAAA-MM"
  const [mesRef, setMesRef] = useState<string>("todos");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("manutencoes_preventivas")
      .select("id, numero, data_prevista, gratuita, obrigatoria, valor, status, realizada_em, scooter:scooters!scooter_id(modelo, chassi, data_compra, legado), cliente:profiles!cliente_id(nome, telefone)")
      .order("data_prevista", { ascending: true });
    setRows((data ?? []) as unknown as Prev[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function marcarRealizada(p: Prev) {
    const supabase = createClient();
    const { error } = await (supabase.from("manutencoes_preventivas") as any)
      .update({ status: "realizada", realizada_em: hojeISO() }).eq("id", p.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Manutenção marcada como realizada.");
    load();
  }

  async function toggleGratuita(p: Prev) {
    const supabase = createClient();
    const { error } = await (supabase.from("manutencoes_preventivas") as any)
      .update({ gratuita: !p.gratuita }).eq("id", p.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    load();
  }

  const hoje = hojeISO();
  const isVencida = (p: Prev) => p.status === "pendente" && p.data_prevista < hoje;
  // Cliente anterior ao corte: sem 1ª gratuita e sem obrigatoriedade, mesmo que
  // o registro antigo no banco ainda diga o contrário.
  const isLegado = (p: Prev) => isClienteLegado(p.scooter?.data_compra, p.scooter?.legado);

  // Meses que têm revisão prevista, do mais próximo para o mais distante.
  const mesesDisponiveis = Array.from(new Set(rows.map((p) => p.data_prevista.slice(0, 7)))).sort();
  const nomeMes = (ym: string) => {
    const [a, m] = ym.split("-");
    return MESES[Number(m) - 1] + "/" + a;
  };

  // Todo o resto da tela respeita o mês escolhido.
  const doMes = mesRef === "todos" ? rows : rows.filter((p) => p.data_prevista.slice(0, 7) === mesRef);

  const vencidas = doMes.filter(isVencida);
  const pendentes = doMes.filter((p) => p.status === "pendente");
  const realizadas = doMes.filter((p) => p.status === "realizada");
  const prox30 = doMes.filter((p) => p.status === "pendente" && p.data_prevista >= hoje &&
    p.data_prevista <= new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10));

  const filtered = doMes.filter((p) => {
    if (filtro === "todas") return true;
    if (filtro === "vencida") return isVencida(p);
    if (filtro === "pendente") return p.status === "pendente" && !isVencida(p);
    return p.status === filtro;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarClock className="h-6 w-6" /> Manutenções Preventivas
        </h1>
        <p className="text-muted-foreground text-sm">
          Agenda de revisões a cada 90 dias. Escolha o mês para antecipar o contato com os clientes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Mês previsto:</span>
        <Select
          items={Object.fromEntries([["todos", "Todos os meses"], ...mesesDisponiveis.map((m) => [m, nomeMes(m)])])}
          value={mesRef}
          onValueChange={(v) => setMesRef(v ?? "todos")}
        >
          <SelectTrigger className="w-56"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {mesesDisponiveis.map((m) => (
              <SelectItem key={m} value={m}>
                {nomeMes(m)} — {rows.filter((p) => p.data_prevista.slice(0, 7) === m).length} revisão(ões)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {mesRef !== "todos" && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {doMes.length} prevista(s) em {nomeMes(mesRef)}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Vencidas</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{vencidas.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Próximos 30 dias</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{prox30.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl font-bold mt-1">{pendentes.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Realizadas</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{realizadas.length}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2">
        {(["pendente", "vencida", "realizada", "todas"] as const).map((f) => (
          <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
            {f === "pendente" ? "Pendentes" : f === "vencida" ? "Vencidas" : f === "realizada" ? "Realizadas" : "Todas"}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Agenda</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma revisão nesta visão.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Scooter</TableHead>
                    <TableHead>Nº</TableHead>
                    <TableHead>Data prevista</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className={isVencida(p) ? "bg-red-50/40" : ""}>
                      <TableCell className="font-medium">{p.cliente?.nome ?? "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums">{p.cliente?.telefone ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.scooter?.modelo ?? "—"}{p.scooter?.chassi ? ` • ${p.scooter.chassi}` : ""}</TableCell>
                      <TableCell>{p.numero}ª</TableCell>
                      <TableCell className={isVencida(p) ? "text-red-600 font-medium" : ""}>{fmt(p.data_prevista)}</TableCell>
                      <TableCell>
                        {isLegado(p)
                          ? <Badge variant="outline" className="text-muted-foreground">Cliente antigo</Badge>
                          : p.obrigatoria
                            ? <Badge variant="secondary" className="bg-orange-100 text-orange-800">Obrigatória</Badge>
                            : <Badge variant="outline" className="text-muted-foreground">Sugestiva</Badge>}
                      </TableCell>
                      <TableCell>
                        {isLegado(p) ? (
                          <span className="font-medium">{brl(p.valor ?? 300)}</span>
                        ) : (
                          <button onClick={() => toggleGratuita(p)} title="Alternar gratuita">
                            {p.gratuita
                              ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 gap-1"><Gift className="h-3 w-3" /> Grátis</Badge>
                              : <span className="font-medium">{brl(p.valor ?? 300)}</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.status === "realizada"
                          ? <Badge variant="secondary" className="bg-green-100 text-green-800">Realizada</Badge>
                          : isVencida(p)
                            ? <Badge variant="secondary" className="bg-red-100 text-red-800">Vencida</Badge>
                            : <Badge variant="secondary" className="bg-blue-100 text-blue-800">{PREVENTIVA_STATUS[p.status] ?? p.status}</Badge>}
                      </TableCell>
                      <TableCell>
                        {p.status !== "realizada" && (
                          <Button size="sm" variant="outline" onClick={() => marcarRealizada(p)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Realizada
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
