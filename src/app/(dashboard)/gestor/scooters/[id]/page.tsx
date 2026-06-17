"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Bike,
  User,
  ShieldCheck,
  Wrench,
  Gauge,
  Award,
  Phone,
  Mail,
  MapPin,
  Hash,
  Calendar,
  Battery,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, GARANTIA_STATUS } from "@/lib/constants";
import type { Scooter, Profile, Garantia, OrdemServico, KmHistorico, Certificado, OrdemServicoStatus, GarantiaStatus } from "@/types/database";

export default function ScooterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scooterId = params.id as string;

  const [scooter, setScooter] = useState<Scooter | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [kmHistorico, setKmHistorico] = useState<KmHistorico[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const { data: scooterData } = await supabase
      .from("scooters")
      .select("*")
      .eq("id", scooterId)
      .single();

    if (!scooterData) {
      setLoading(false);
      return;
    }

    const s = scooterData as Scooter;
    setScooter(s);

    const promises: Promise<unknown>[] = [
      supabase
        .from("garantias")
        .select("*")
        .eq("scooter_id", scooterId)
        .order("created_at", { ascending: false }),
      supabase
        .from("ordens_servico")
        .select("*")
        .eq("scooter_id", scooterId)
        .order("created_at", { ascending: false }),
      supabase
        .from("km_historico")
        .select("*")
        .eq("scooter_id", scooterId)
        .order("created_at", { ascending: false }),
      supabase
        .from("certificados")
        .select("*")
        .order("created_at", { ascending: false }),
    ];

    if (s.proprietario_id) {
      promises.push(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", s.proprietario_id)
          .single()
      );
    }

    const results = await Promise.all(promises);

    const garantiasResult = results[0] as { data: Garantia[] | null };
    const ordensResult = results[1] as { data: OrdemServico[] | null };
    const kmResult = results[2] as { data: KmHistorico[] | null };
    const certResult = results[3] as { data: Certificado[] | null };

    setGarantias(garantiasResult.data ?? []);
    setOrdens(ordensResult.data ?? []);
    setKmHistorico(kmResult.data ?? []);
    setCertificados(certResult.data ?? []);

    if (s.proprietario_id && results[4]) {
      const ownerResult = results[4] as { data: Profile | null };
      setOwner(ownerResult.data);
    }

    setLoading(false);
  }, [scooterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full mb-3" />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full mb-3" />
              ))}
            </CardContent>
          </Card>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!scooter) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Scooter nao encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/gestor/scooters" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bike className="h-5 w-5" />
              Dados da Scooter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <Bike className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">
                    {scooter.marca} {scooter.modelo}
                  </p>
                  <Badge variant="secondary">{scooter.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Cor:</span>
                  <span>{scooter.cor ?? "---"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ano:</span>
                  <span>{scooter.ano ?? "---"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Chassi:</span>
                  <span className="font-mono text-xs">{scooter.chassi ?? "---"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Serie:</span>
                  <span className="font-mono text-xs">{scooter.numero_serie ?? "---"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">KM:</span>
                  <span>{scooter.km_atual} km</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Battery className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Bateria:</span>
                  <span className="font-mono text-xs">{scooter.bateria_numero ?? "---"}</span>
                </div>
              </div>
              {scooter.observacoes && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">Observacoes:</p>
                  <p className="text-sm mt-1">{scooter.observacoes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Proprietario
            </CardTitle>
          </CardHeader>
          <CardContent>
            {owner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-3">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <Link
                      href={`/gestor/clientes/${owner.id}`}
                      className="font-semibold text-lg text-primary hover:underline"
                    >
                      {owner.nome}
                    </Link>
                    <Badge
                      variant={owner.ativo ? "default" : "destructive"}
                      className={
                        owner.ativo
                          ? "bg-green-100 text-green-800 ml-2"
                          : "bg-red-100 text-red-800 ml-2"
                      }
                    >
                      {owner.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{owner.telefone ?? "---"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{owner.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{owner.endereco ?? "---"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum proprietario vinculado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="garantia">
        <TabsList>
          <TabsTrigger value="garantia">
            <ShieldCheck className="h-4 w-4 mr-1" />
            Garantia ({garantias.length})
          </TabsTrigger>
          <TabsTrigger value="ordens">
            <Wrench className="h-4 w-4 mr-1" />
            Ordens de Servico ({ordens.length})
          </TabsTrigger>
          <TabsTrigger value="km">
            <Gauge className="h-4 w-4 mr-1" />
            KM Historico ({kmHistorico.length})
          </TabsTrigger>
          <TabsTrigger value="certificados">
            <Award className="h-4 w-4 mr-1" />
            Certificados ({certificados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="garantia">
          <Card>
            <CardContent className="pt-4">
              {garantias.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma garantia registrada para esta scooter.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>KM Limite</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {garantias.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="capitalize font-medium">
                          {g.tipo}
                        </TableCell>
                        <TableCell>{g.descricao ?? "---"}</TableCell>
                        <TableCell>{formatDate(g.data_inicio)}</TableCell>
                        <TableCell>{formatDate(g.data_fim)}</TableCell>
                        <TableCell>
                          {g.km_limite ? `${g.km_limite} km` : "---"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              g.status === "ativa"
                                ? "bg-green-100 text-green-800"
                                : g.status === "expirada"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {GARANTIA_STATUS[g.status as GarantiaStatus] ?? g.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ordens">
          <Card>
            <CardContent className="pt-4">
              {ordens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhuma ordem de servico encontrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>KM Entrada</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordens.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">
                          {o.numero}
                        </TableCell>
                        <TableCell className="capitalize">{o.tipo}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={ORDER_STATUS_COLORS[o.status as OrdemServicoStatus] ?? ""}
                          >
                            {ORDER_STATUS_LABELS[o.status as OrdemServicoStatus] ?? o.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(o.created_at)}</TableCell>
                        <TableCell>
                          {o.km_entrada ? `${o.km_entrada} km` : "---"}
                        </TableCell>
                        <TableCell>
                          {o.valor_total
                            ? `R$ ${o.valor_total.toFixed(2)}`
                            : "---"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="km">
          <Card>
            <CardContent className="pt-4">
              {kmHistorico.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum registro de KM encontrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>KM</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kmHistorico.map((km) => (
                      <TableRow key={km.id}>
                        <TableCell className="font-medium">
                          {km.km} km
                        </TableCell>
                        <TableCell className="capitalize">
                          {km.origem}
                        </TableCell>
                        <TableCell>{formatDate(km.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificados">
          <Card>
            <CardContent className="pt-4">
              {certificados.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum certificado encontrado.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {certificados.map((cert) => (
                    <Card key={cert.id} size="sm">
                      <CardContent className="pt-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              Certificado #{cert.hash.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(cert.created_at)}
                            </p>
                          </div>
                          {cert.pdf_url && (
                            <Button variant="outline" size="sm" render={<a href={cert.pdf_url} target="_blank" rel="noopener noreferrer" />}>
                              Ver PDF
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
