"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { Wrench, Clock, CheckCircle, AlertTriangle } from "lucide-react";

interface OrdemResumo {
  id: string;
  numero: number;
  status: string;
  created_at: string;
  cliente: { nome: string } | null;
  scooter: { modelo: string; chassi: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  recebido: "bg-purple-100 text-purple-800",
  checkin_realizado: "bg-violet-100 text-violet-800",
  em_analise: "bg-amber-100 text-amber-800",
  diagnostico_concluido: "bg-orange-100 text-orange-800",
  aguardando_inicio: "bg-teal-100 text-teal-800",
  em_servico: "bg-blue-100 text-blue-800",
  testes_finais: "bg-sky-100 text-sky-800",
};

const STATUS_LABELS: Record<string, string> = {
  recebido: "Recebido",
  checkin_realizado: "Check-in Realizado",
  em_analise: "Em Análise",
  diagnostico_concluido: "Diagnóstico Concluído",
  aguardando_inicio: "Aguardando Início",
  em_servico: "Em Serviço",
  testes_finais: "Testes Finais",
};

export default function TecnicoDashboardPage() {
  const [ordens, setOrdens] = useState<OrdemResumo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("ordens_servico")
        .select("id, numero, status, created_at, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi)")
        .eq("tecnico_id", user.id)
        .in("status", ["recebido", "checkin_realizado", "em_analise", "diagnostico_concluido", "aguardando_inicio", "em_servico", "testes_finais"])
        .order("created_at", { ascending: false });

      if (data) setOrdens(data as OrdemResumo[]);
      setLoading(false);
    }
    load();
  }, []);

  const emAndamento = ordens.filter(o => o.status === "em_servico");
  const aguardando = ordens.filter(o => ["recebido", "checkin_realizado", "aguardando_inicio"].includes(o.status));
  const analise = ordens.filter(o => ["em_analise", "diagnostico_concluido"].includes(o.status));

  const stats = [
    { title: "Em Serviço", value: emAndamento.length, icon: Wrench, color: "text-blue-600" },
    { title: "Aguardando", value: aguardando.length, icon: Clock, color: "text-amber-600" },
    { title: "Em Análise", value: analise.length, icon: AlertTriangle, color: "text-orange-600" },
    { title: "Total Atribuídas", value: ordens.length, icon: CheckCircle, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard do Técnico</h1>
        <p className="text-muted-foreground">Suas ordens de serviço atribuídas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{s.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens Atribuídas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : ordens.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma ordem atribuída</p>
          ) : (
            <div className="space-y-3">
              {ordens.map(ordem => (
                <Link key={ordem.id} href={`/tecnico/ordens/${ordem.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">OS #{ordem.numero}</span>
                        <Badge className={STATUS_COLORS[ordem.status] || "bg-gray-100 text-gray-800"}>
                          {STATUS_LABELS[ordem.status] || ordem.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {ordem.cliente?.nome} - {ordem.scooter?.modelo}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(ordem.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
