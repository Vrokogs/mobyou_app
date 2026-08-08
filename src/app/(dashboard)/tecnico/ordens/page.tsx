"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Search, Wrench, Plus, Loader2 } from "lucide-react";

interface Ordem {
  id: string;
  numero: number;
  status: string;
  km_atual: number | null;
  created_at: string;
  cliente: { nome: string } | null;
  scooter: { modelo: string; chassi: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  recebido: "Recebido", checkin_realizado: "Check-in", em_analise: "Em Análise",
  diagnostico_concluido: "Diagnóstico", aguardando_inicio: "Aguardando",
  em_servico: "Em Serviço", testes_finais: "Testes Finais",
  finalizado: "Finalizado", entregue: "Entregue",
};

const STATUS_COLORS: Record<string, string> = {
  recebido: "bg-purple-100 text-purple-800", checkin_realizado: "bg-violet-100 text-violet-800",
  em_analise: "bg-amber-100 text-amber-800", diagnostico_concluido: "bg-orange-100 text-orange-800",
  aguardando_inicio: "bg-teal-100 text-teal-800", em_servico: "bg-blue-100 text-blue-800",
  testes_finais: "bg-sky-100 text-sky-800", finalizado: "bg-emerald-100 text-emerald-800",
  entregue: "bg-green-100 text-green-800",
};

interface ClienteOpt { id: string; nome: string }
interface ScooterOpt { id: string; modelo: string; chassi: string | null; cliente_id: string | null }

const EMPTY_OS = { cliente_id: "", scooter_id: "", data_agendamento: "", observacoes: "" };

export default function TecnicoOrdensPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [userId, setUserId] = useState("");
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [scooters, setScooters] = useState<ScooterOpt[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_OS });

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [ordensRes, clientesRes, scootersRes] = await Promise.all([
      supabase
        .from("ordens_servico")
        .select("id, numero, status, km_atual, created_at, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi)")
        .eq("tecnico_id", user.id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, nome").eq("role", "cliente").order("nome"),
      supabase.from("scooters").select("id, modelo, chassi, cliente_id"),
    ]);

    if (ordensRes.data) setOrdens(ordensRes.data as unknown as Ordem[]);
    setClientes((clientesRes.data ?? []) as unknown as ClienteOpt[]);
    setScooters((scootersRes.data ?? []) as unknown as ScooterOpt[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function criarOS() {
    if (!form.cliente_id) { toast.error("Selecione o cliente."); return; }
    if (!form.scooter_id) { toast.error("Selecione a scooter."); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await (supabase.from("ordens_servico") as any).insert({
        cliente_id: form.cliente_id,
        scooter_id: form.scooter_id,
        tecnico_id: userId,
        status: "recebido",
        data_agendamento: form.data_agendamento ? new Date(form.data_agendamento).toISOString() : null,
        observacoes: form.observacoes || null,
      });
      if (error) throw error;
      toast.success("Ordem de serviço criada!");
      setDialogOpen(false);
      setForm({ ...EMPTY_OS });
      load();
    } catch (e) {
      toast.error("Erro ao criar OS", { description: e instanceof Error ? e.message : "" });
    } finally {
      setSaving(false);
    }
  }

  // Scooters do cliente selecionado (ou todas se nenhum cliente escolhido)
  const scootersDoCliente = form.cliente_id
    ? scooters.filter((s) => s.cliente_id === form.cliente_id)
    : scooters;
  const clienteItems = Object.fromEntries(clientes.map((c) => [c.id, c.nome]));
  const scooterItems = Object.fromEntries(
    scootersDoCliente.map((s) => [s.id, `${s.modelo}${s.chassi ? ` - ${s.chassi}` : ""}`])
  );

  const filtered = ordens.filter(o => {
    const matchSearch = o.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.scooter?.modelo?.toLowerCase().includes(search.toLowerCase()) ||
      o.numero?.toString().includes(search);
    const matchStatus = statusFilter === "todas" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Minhas Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie os serviços atribuídos a você</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus className="h-4 w-4 mr-1.5" /> Nova OS</Button>} />
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <Select items={clienteItems} value={form.cliente_id}
                  onValueChange={(v) => v && setForm((f) => ({ ...f, cliente_id: v, scooter_id: "" }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Scooter</Label>
                <Select items={scooterItems} value={form.scooter_id}
                  onValueChange={(v) => v && setForm((f) => ({ ...f, scooter_id: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione a scooter" /></SelectTrigger>
                  <SelectContent>
                    {scootersDoCliente.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Nenhuma scooter para este cliente</div>
                    ) : scootersDoCliente.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.modelo}{s.chassi ? ` - ${s.chassi}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data/hora (opcional)</Label>
                <Input type="datetime-local" value={form.data_agendamento}
                  onChange={(e) => setForm((f) => ({ ...f, data_agendamento: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Textarea rows={2} placeholder="Motivo do serviço, sintomas relatados..."
                  value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={criarOS} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Criar OS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma ordem encontrada</p>
            </CardContent>
          </Card>
        ) : filtered.map(ordem => (
          <Link key={ordem.id} href={`/tecnico/ordens/${ordem.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">OS #{ordem.numero}</span>
                    <Badge className={STATUS_COLORS[ordem.status] || "bg-gray-100 text-gray-800"}>
                      {STATUS_LABELS[ordem.status] || ordem.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ordem.cliente?.nome} &bull; {ordem.scooter?.modelo} &bull; Chassi: {ordem.scooter?.chassi}
                  </p>
                  {ordem.km_atual && (
                    <p className="text-xs text-muted-foreground">{ordem.km_atual} km</p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(ordem.created_at).toLocaleDateString("pt-BR")}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
