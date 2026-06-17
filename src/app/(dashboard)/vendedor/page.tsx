"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { Users, ShoppingCart, FileText, TrendingUp } from "lucide-react";

interface Stats {
  clientes: number;
  vendas: number;
  vendas_mes: number;
  contratos_pendentes: number;
}

export default function VendedorDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [clientes, vendas, contratos] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cliente"),
        supabase.from("vendas").select("id, valor_total, created_at", { count: "exact" }).eq("vendedor_id", user.id),
        supabase.from("contratos").select("id", { count: "exact", head: true }).in("status", ["rascunho", "enviado"]),
      ]);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const vendasMes = vendas.data?.filter(v => v.created_at >= startOfMonth).length || 0;

      setStats({
        clientes: clientes.count || 0,
        vendas: vendas.count || 0,
        vendas_mes: vendasMes,
        contratos_pendentes: contratos.count || 0,
      });
      setLoading(false);
    }
    loadStats();
  }, []);

  const cards = [
    { title: "Meus Clientes", value: stats?.clientes, icon: Users, color: "text-blue-600" },
    { title: "Total de Vendas", value: stats?.vendas, icon: ShoppingCart, color: "text-emerald-600" },
    { title: "Vendas este Mês", value: stats?.vendas_mes, icon: TrendingUp, color: "text-violet-600" },
    { title: "Contratos Pendentes", value: stats?.contratos_pendentes, icon: FileText, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard do Vendedor</h1>
        <p className="text-muted-foreground">Gerencie suas vendas e clientes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{card.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
