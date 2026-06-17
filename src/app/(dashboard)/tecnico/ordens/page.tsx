"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { Search, Wrench } from "lucide-react";

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

export default function TecnicoOrdensPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("ordens_servico")
        .select("id, numero, status, km_atual, created_at, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi)")
        .eq("tecnico_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setOrdens(data as Ordem[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = ordens.filter(o => {
    const matchSearch = o.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.scooter?.modelo?.toLowerCase().includes(search.toLowerCase()) ||
      o.numero?.toString().includes(search);
    const matchStatus = statusFilter === "todas" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Minhas Ordens de Serviço</h1>
        <p className="text-muted-foreground">Gerencie os serviços atribuídos a você</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
