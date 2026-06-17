"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, ChevronRight } from "lucide-react";

interface OrdemHistorico {
  id: string;
  numero: number;
  status: string;
  created_at: string;
  data_finalizacao: string | null;
  scooter: { modelo: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  finalizado: "Finalizado", entregue: "Entregue", cancelado: "Cancelado",
  em_servico: "Em Serviço", agendado: "Agendado", em_analise: "Em Análise",
  diagnostico_concluido: "Diagnóstico", orcamento_enviado: "Orçamento Enviado",
  aprovado: "Aprovado", testes_finais: "Testes Finais",
};

export default function ClienteHistoricoPage() {
  const [ordens, setOrdens] = useState<OrdemHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("ordens_servico")
        .select("id, numero, status, created_at, data_finalizacao, scooter:scooters!ordens_servico_scooter_id_fkey(modelo)")
        .eq("cliente_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setOrdens(data as OrdemHistorico[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-muted-foreground">Todas as suas ordens de serviço</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : ordens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum histórico encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordens.map(ordem => (
            <Link key={ordem.id} href={`/cliente/ordens/${ordem.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">OS #{ordem.numero}</span>
                      <Badge variant={ordem.status === "entregue" || ordem.status === "finalizado" ? "default" : "secondary"}>
                        {STATUS_LABELS[ordem.status] || ordem.status}
                      </Badge>
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
