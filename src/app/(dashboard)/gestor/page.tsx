"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import type { OrdemServicoStatus } from "@/types/database";
import {
  CalendarCheck,
  Wrench,
  FileText,
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatCard {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: number;
  trendLabel: string;
}

interface RecentOrder {
  id: string;
  numero: string;
  status: OrdemServicoStatus;
  created_at: string;
  cliente: { nome: string } | null;
  scooter: { modelo: string; marca: string } | null;
}

interface TimelineEvent {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  created_at: string;
}

export default function GestorDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const today = new Date().toISOString().split("T")[0];

      const [
        agendamentosRes,
        osAndamentoRes,
        orcamentosRes,
        clientesRes,
        ordersRes,
        timelineRes,
      ] = await Promise.all([
        supabase
          .from("ordens_servico")
          .select("id", { count: "exact", head: true })
          .eq("data_agendamento", today),
        supabase
          .from("ordens_servico")
          .select("id", { count: "exact", head: true })
          .in("status", ["em_servico", "em_analise", "testes_finais", "aguardando_inicio"]),
        supabase
          .from("orcamentos")
          .select("id", { count: "exact", head: true })
          .is("aprovado", null),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "cliente")
          .eq("ativo", true),
        supabase
          .from("ordens_servico")
          .select("id, numero, status, created_at, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, marca)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("timeline_eventos")
          .select("id, tipo, titulo, descricao, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      setStats([
        {
          title: "Agendamentos Hoje",
          value: agendamentosRes.count ?? 0,
          icon: <CalendarCheck className="h-5 w-5 text-blue-600" />,
          trend: 12,
          trendLabel: "vs ontem",
        },
        {
          title: "OS em Andamento",
          value: osAndamentoRes.count ?? 0,
          icon: <Wrench className="h-5 w-5 text-amber-600" />,
          trend: -3,
          trendLabel: "vs semana",
        },
        {
          title: "Orcamentos Pendentes",
          value: orcamentosRes.count ?? 0,
          icon: <FileText className="h-5 w-5 text-orange-600" />,
          trend: 5,
          trendLabel: "vs semana",
        },
        {
          title: "Clientes Ativos",
          value: clientesRes.count ?? 0,
          icon: <Users className="h-5 w-5 text-green-600" />,
          trend: 8,
          trendLabel: "vs mes",
        },
      ]);

      setRecentOrders(
        (ordersRes.data as unknown as RecentOrder[]) ?? []
      );
      setTimeline(
        (timelineRes.data as unknown as TimelineEvent[]) ?? []
      );
      setLoading(false);
    }

    loadData();
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }

  function formatDate(dateStr: string) {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return dateStr;
    }
  }

  function getTimelineIcon(tipo: string) {
    switch (tipo) {
      case "status_change":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "checkin":
        return <CalendarCheck className="h-4 w-4 text-green-500" />;
      case "diagnostico":
        return <Wrench className="h-4 w-4 text-amber-500" />;
      case "orcamento":
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-2">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {getGreeting()}! Aqui esta o resumo do seu dia.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover:ring-2 hover:ring-primary/20 transition-all">
            <CardContent className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </span>
                <div className="rounded-lg bg-muted p-2">{stat.icon}</div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-bold">{stat.value}</span>
                <div className="flex items-center gap-1 text-xs">
                  {stat.trend > 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={
                      stat.trend > 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {Math.abs(stat.trend)}%
                  </span>
                  <span className="text-muted-foreground">{stat.trendLabel}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ordens Recentes</CardTitle>
            <CardDescription>Ultimas 5 ordens de servico criadas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma ordem de servico encontrada.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numero</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Scooter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.numero}
                      </TableCell>
                      <TableCell>
                        {order.cliente?.nome ?? "---"}
                      </TableCell>
                      <TableCell>
                        {order.scooter
                          ? `${order.scooter.marca} ${order.scooter.modelo}`
                          : "---"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={ORDER_STATUS_COLORS[order.status] ?? ""}
                        >
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(order.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Ultimos eventos do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade recente.
              </p>
            ) : (
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className="rounded-full bg-muted p-1.5">
                        {getTimelineIcon(event.tipo)}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium leading-tight">
                        {event.titulo}
                      </p>
                      {event.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.descricao}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
