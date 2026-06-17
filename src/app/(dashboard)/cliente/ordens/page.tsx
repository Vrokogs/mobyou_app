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
import { Plus, ChevronRight, Wrench } from "lucide-react";

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
  const [form, setForm] = useState({ scooter_id: "", data_agendamento: "", observacoes: "" });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [ordensRes, scootersRes] = await Promise.all([
      supabase.from("ordens_servico")
        .select("id, numero, status, created_at, scooter:scooters!ordens_servico_scooter_id_fkey(id, modelo)")
        .eq("cliente_id", user.id).order("created_at", { ascending: false }),
      supabase.from("scooters").select("id, modelo, chassi").eq("cliente_id", user.id),
    ]);

    if (ordensRes.data) setOrdens(ordensRes.data as Ordem[]);
    if (scootersRes.data) setScooters(scootersRes.data);
    setLoading(false);
  }

  async function handleSolicitar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("ordens_servico").insert({
        scooter_id: form.scooter_id,
        cliente_id: user.id,
        status: "agendado",
        data_agendamento: form.data_agendamento || null,
        observacoes: form.observacoes || null,
      });

      if (error) { toast.error("Erro ao solicitar", { description: error.message }); return; }

      toast.success("Manutenção solicitada!");
      setDialogOpen(false);
      setForm({ scooter_id: "", data_agendamento: "", observacoes: "" });
      load();
    } catch { toast.error("Erro inesperado"); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Minhas Ordens</h1>
          <p className="text-muted-foreground">Acompanhe e solicite manutenções</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Solicitar Manutenção</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar Manutenção</DialogTitle></DialogHeader>
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div className="space-y-2">
                <Label>Scooter</Label>
                <Select value={form.scooter_id} onValueChange={v => setForm({...form, scooter_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {scooters.map(s => <SelectItem key={s.id} value={s.id}>{s.modelo} - {s.chassi}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data Preferencial</Label>
                <Input type="date" value={form.data_agendamento} onChange={e => setForm({...form, data_agendamento: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea placeholder="Descreva o problema ou motivo da manutenção..." value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Enviando..." : "Solicitar"}
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
