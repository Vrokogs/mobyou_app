"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Bike, ShieldCheck, FileText, ClipboardList, Wrench, ChevronRight, Calendar } from "lucide-react";

interface ScooterData {
  id: string;
  modelo: string;
  marca: string;
  cor: string;
  ano: number;
  chassi: string;
  numero_serie: string;
  garantia?: { status: string; data_fim: string } | null;
}

interface OrdemAtiva {
  id: string;
  numero: number;
  status: string;
  created_at: string;
  scooter: { modelo: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado", recebido: "Recebido",
  checkin_realizado: "Check-in Realizado", em_analise: "Em Análise Técnica",
  diagnostico_concluido: "Diagnóstico Concluído", orcamento_enviado: "Orçamento Enviado",
  aguardando_aprovacao: "Aguardando Aprovação", aprovado: "Aprovado",
  aguardando_inicio: "Aguardando Início", em_servico: "Em Serviço",
  testes_finais: "Testes Finais", finalizado: "Finalizado", entregue: "Entregue",
  cancelado: "Cancelado", nao_compareceu: "Não Compareceu", remarcado: "Remarcado",
};

const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-800", em_servico: "bg-indigo-100 text-indigo-800",
  finalizado: "bg-emerald-100 text-emerald-800", entregue: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800", aguardando_aprovacao: "bg-yellow-100 text-yellow-800",
  orcamento_enviado: "bg-cyan-100 text-cyan-800",
};

export default function ClienteDashboardPage() {
  const [scooters, setScooters] = useState<ScooterData[]>([]);
  const [ordensAtivas, setOrdensAtivas] = useState<OrdemAtiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, scootersRes, ordensRes] = await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).single(),
        supabase.from("scooters").select("id, modelo, marca, cor, ano, chassi, numero_serie").eq("cliente_id", user.id),
        supabase.from("ordens_servico")
          .select("id, numero, status, created_at, scooter:scooters!ordens_servico_scooter_id_fkey(modelo)")
          .eq("cliente_id", user.id)
          .not("status", "in", "(entregue,cancelado)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (profileRes.data) setUserName(profileRes.data.nome);

      if (scootersRes.data) {
        const scootersWithGarantia = await Promise.all(
          scootersRes.data.map(async (s) => {
            const { data: garantia } = await supabase
              .from("garantias")
              .select("status, data_fim")
              .eq("scooter_id", s.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            return { ...s, garantia };
          })
        );
        setScooters(scootersWithGarantia);
      }

      if (ordensRes.data) setOrdensAtivas(ordensRes.data as OrdemAtiva[]);
      setLoading(false);
    }
    load();
  }, []);

  const quickActions = [
    { title: "Solicitar Manutenção", icon: Wrench, href: "/cliente/ordens?nova=true", color: "bg-blue-50 text-blue-700" },
    { title: "Meus Documentos", icon: FileText, href: "/cliente/documentos", color: "bg-violet-50 text-violet-700" },
    { title: "Histórico Completo", icon: ClipboardList, href: "/cliente/historico", color: "bg-emerald-50 text-emerald-700" },
    { title: "Agendar Revisão", icon: Calendar, href: "/cliente/ordens?nova=true", color: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        {loading ? <Skeleton className="h-8 w-48" /> : (
          <h1 className="text-2xl font-bold">Olá, {userName?.split(" ")[0]}!</h1>
        )}
        <p className="text-muted-foreground">Bem-vindo ao seu painel MOBYOU</p>
      </div>

      {ordensAtivas.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Serviço em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ordensAtivas.map(ordem => (
              <Link key={ordem.id} href={`/cliente/ordens/${ordem.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border hover:shadow-sm transition-shadow">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">OS #{ordem.numero}</span>
                      <Badge className={STATUS_COLORS[ordem.status] || "bg-gray-100 text-gray-800"}>
                        {STATUS_LABELS[ordem.status] || ordem.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{ordem.scooter?.modelo}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickActions.map(action => (
          <Link key={action.title} href={action.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center p-4 text-center gap-2">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium">{action.title}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Bike className="h-5 w-5" />
          Minhas Scooters
        </h2>
        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : scooters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-8 text-center">
              <Bike className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma scooter cadastrada</p>
            </CardContent>
          </Card>
        ) : scooters.map(scooter => (
          <Link key={scooter.id} href={`/cliente/scooter?id=${scooter.id}`}>
            <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg">{scooter.modelo}</h3>
                    <p className="text-sm text-muted-foreground">{scooter.marca} &bull; {scooter.cor} &bull; {scooter.ano}</p>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div><span className="text-muted-foreground">Chassi:</span> {scooter.chassi}</div>
                      <div><span className="text-muted-foreground">Série:</span> {scooter.numero_serie}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ShieldCheck className={`h-6 w-6 ${scooter.garantia?.status === "ativa" ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <Badge variant={scooter.garantia?.status === "ativa" ? "default" : "secondary"}>
                      {scooter.garantia?.status === "ativa" ? "Garantia Ativa" : "Sem Garantia"}
                    </Badge>
                    {scooter.garantia?.data_fim && (
                      <span className="text-xs text-muted-foreground">
                        Até {new Date(scooter.garantia.data_fim).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
