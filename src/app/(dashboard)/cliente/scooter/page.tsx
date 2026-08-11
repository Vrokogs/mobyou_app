"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { Bike, ShieldCheck, MapPin, Calendar, Hash, Battery, Cpu, Cog, CalendarClock, Gift } from "lucide-react";
import { GARANTIA_MODALIDADE_LABEL } from "@/lib/constants";

interface ScooterFull {
  id: string;
  modelo: string;
  marca: string;
  cor: string;
  ano: number;
  chassi: string;
  numero_serie: string;
  data_compra: string;
}

interface GarantiaInfo {
  id: string;
  status: string;
  modalidade: string | null;
  data_inicio: string;
  data_fim: string;
}

interface PrevInfo {
  id: string;
  numero: number;
  data_prevista: string;
  gratuita: boolean;
  obrigatoria: boolean;
  status: string;
}

interface KmEntry {
  id: string;
  km: number;
  created_at: string;
}

export default function ClienteScooterPage() {
  const searchParams = useSearchParams();
  const scooterId = searchParams.get("id");
  const [scooter, setScooter] = useState<ScooterFull | null>(null);
  const [garantia, setGarantia] = useState<GarantiaInfo | null>(null);
  const [kmHistory, setKmHistory] = useState<KmEntry[]>([]);
  const [preventivas, setPreventivas] = useState<PrevInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();

      // Sem ?id= (ex.: menu lateral): usa a scooter do cliente logado.
      let sid = scooterId;
      if (!sid) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: minha } = await supabase
            .from("scooters")
            .select("id")
            .eq("cliente_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          sid = (minha as { id?: string } | null)?.id ?? null;
        }
      }

      if (!sid) {
        setScooter(null);
        setLoading(false);
        return;
      }

      const [scooterRes, garantiaRes, kmRes, prevRes] = await Promise.all([
        supabase.from("scooters").select("*").eq("id", sid).maybeSingle(),
        supabase.from("garantias").select("id, status, modalidade, data_inicio, data_fim").eq("scooter_id", sid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("km_historico").select("id, km, created_at").eq("scooter_id", sid).order("created_at", { ascending: false }).limit(20),
        supabase.from("manutencoes_preventivas").select("id, numero, data_prevista, gratuita, obrigatoria, status").eq("scooter_id", sid).order("data_prevista", { ascending: true }),
      ]);

      if (scooterRes.data) setScooter(scooterRes.data as unknown as ScooterFull);
      if (garantiaRes.data) setGarantia(garantiaRes.data as unknown as GarantiaInfo);
      if (kmRes.data) setKmHistory(kmRes.data as unknown as KmEntry[]);
      if (prevRes.data) setPreventivas(prevRes.data as unknown as PrevInfo[]);
      setLoading(false);
    }
    load();
  }, [scooterId]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!scooter) return <p className="text-center py-12 text-muted-foreground">Scooter não encontrada</p>;

  const garantiaAtiva = garantia?.status === "ativa";
  const diasRestantes = garantia?.data_fim
    ? Math.max(0, Math.ceil((new Date(garantia.data_fim).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bike className="h-6 w-6" />
        {scooter.modelo}
      </h1>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Marca / Modelo</p>
                <p className="font-semibold text-lg">{scooter.marca} {scooter.modelo}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cor</p>
                  <p className="font-medium">{scooter.cor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ano</p>
                  <p className="font-medium">{scooter.ano}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" />Chassi</p>
                  <p className="font-mono font-medium">{scooter.chassi}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nº Série</p>
                  <p className="font-mono font-medium">{scooter.numero_serie}</p>
                </div>
              </div>
              {scooter.data_compra && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Data da Compra</p>
                  <p className="font-medium">{new Date(scooter.data_compra).toLocaleDateString("pt-BR")}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted">
              <ShieldCheck className={`h-10 w-10 ${garantiaAtiva ? "text-emerald-500" : "text-muted-foreground"}`} />
              <Badge variant={garantiaAtiva ? "default" : "secondary"} className="text-xs">
                {garantiaAtiva ? "Garantia Ativa" : "Sem Garantia"}
              </Badge>
              {garantiaAtiva && (
                <span className="text-xs text-muted-foreground">{diasRestantes} dias restantes</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="garantia">
        <TabsList>
          <TabsTrigger value="garantia">Garantia</TabsTrigger>
          <TabsTrigger value="km">Histórico KM</TabsTrigger>
        </TabsList>

        <TabsContent value="garantia" className="mt-4">
          {garantia ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Status</span>
                  <Badge variant={garantiaAtiva ? "default" : "secondary"}>
                    {garantia.status === "ativa" ? "Ativa" : garantia.status === "expirada" ? "Expirada" : "Cancelada"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Início</span>
                  <span>{new Date(garantia.data_inicio).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fim</span>
                  <span>{new Date(garantia.data_fim).toLocaleDateString("pt-BR")}</span>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">
                    Cobertura — {GARANTIA_MODALIDADE_LABEL[garantia.modalidade ?? "1_ano"] ?? "1 ano"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border bg-emerald-50/50 p-3 text-center">
                      <Battery className="h-5 w-5 mx-auto text-emerald-600" />
                      <p className="text-xs font-medium mt-1">Bateria</p>
                    </div>
                    <div className="rounded-lg border bg-emerald-50/50 p-3 text-center">
                      <Cpu className="h-5 w-5 mx-auto text-emerald-600" />
                      <p className="text-xs font-medium mt-1">Módulo</p>
                    </div>
                    <div className="rounded-lg border bg-emerald-50/50 p-3 text-center">
                      <Cog className="h-5 w-5 mx-auto text-emerald-600" />
                      <p className="text-xs font-medium mt-1">Motor</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Garantia contra defeitos de fabricação do módulo, motor e bateria.
                    Não cobre peças de desgaste (pneus, freios, lâmpadas e carregadores)
                    nem danos por mau uso ou modificações.
                  </p>
                </div>

                {preventivas.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-1 flex items-center gap-1">
                        <CalendarClock className="h-4 w-4" /> Revisões / manutenções (R$ 300 • 1ª grátis)
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        {(garantia?.modalidade === "3_meses")
                          ? "Revisão sugestiva — pode ser feita dentro dos 90 dias, não é obrigatória para a garantia."
                          : "As revisões são obrigatórias para manter a garantia."}
                      </p>
                      <div className="space-y-1.5">
                        {preventivas.map((p) => {
                          const hoje = new Date().toISOString().slice(0, 10);
                          const vencida = p.status === "pendente" && p.data_prevista < hoje;
                          return (
                            <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm">
                              <span className="flex items-center gap-2">
                                <span className="font-medium">{p.numero}ª</span>
                                <span className={vencida ? "text-red-600" : "text-muted-foreground"}>
                                  {new Date(p.data_prevista + "T12:00:00").toLocaleDateString("pt-BR")}
                                </span>
                                {p.gratuita && (
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 gap-1 text-[10px]">
                                    <Gift className="h-3 w-3" /> Grátis
                                  </Badge>
                                )}
                              </span>
                              {p.status === "realizada"
                                ? <Badge variant="secondary" className="bg-green-100 text-green-800">Feita</Badge>
                                : vencida
                                  ? <Badge variant="secondary" className="bg-red-100 text-red-800">Vencida</Badge>
                                  : <Badge variant="secondary" className="bg-blue-100 text-blue-800">Agendada</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
                {garantiaAtiva && (
                  <>
                    <Separator />
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-600">{diasRestantes}</p>
                      <p className="text-sm text-muted-foreground">dias restantes</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma garantia registrada</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="km" className="mt-4">
          {kmHistory.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum registro de KM</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {kmHistory.map((entry, idx) => (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{entry.km.toLocaleString("pt-BR")} km</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
