"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Hash,
  Search,
  Bike,
  User,
  ShieldCheck,
  Wrench,
  Award,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, GARANTIA_STATUS } from "@/lib/constants";
import type { Scooter, Profile, Garantia, OrdemServico, Certificado, OrdemServicoStatus, GarantiaStatus } from "@/types/database";

interface ChassiResult {
  scooter: Scooter | null;
  cliente: Profile | null;
  garantias: Garantia[];
  ordens: OrdemServico[];
  certificados: Certificado[];
}

export default function ChassiPage() {
  const [chassi, setChassi] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<ChassiResult | null>(null);

  async function handleSearch() {
    if (!chassi.trim()) return;

    setLoading(true);
    setSearched(true);
    const supabase = createClient();

    const { data: scooterData } = await supabase
      .from("scooters")
      .select("*")
      .eq("chassi", chassi.trim())
      .single();

    if (!scooterData) {
      setResult({ scooter: null, cliente: null, garantias: [], ordens: [], certificados: [] });
      setLoading(false);
      return;
    }

    const scooter = scooterData as Scooter;

    const promises: Promise<unknown>[] = [
      supabase
        .from("garantias")
        .select("*")
        .eq("scooter_id", scooter.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("ordens_servico")
        .select("*")
        .eq("scooter_id", scooter.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("certificados")
        .select("*")
        .order("created_at", { ascending: false }),
    ];

    if (scooter.proprietario_id) {
      promises.push(
        supabase
          .from("profiles")
          .select("*")
          .eq("id", scooter.proprietario_id)
          .single()
      );
    }

    const results = await Promise.all(promises);

    const garantiasRes = results[0] as { data: Garantia[] | null };
    const ordensRes = results[1] as { data: OrdemServico[] | null };
    const certRes = results[2] as { data: Certificado[] | null };
    const ownerRes = scooter.proprietario_id && results[3]
      ? (results[3] as { data: Profile | null })
      : null;

    setResult({
      scooter,
      cliente: ownerRes?.data ?? null,
      garantias: garantiasRes.data ?? [],
      ordens: ordensRes.data ?? [],
      certificados: certRes.data ?? [],
    });
    setLoading(false);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Consulta por Chassi</h1>
        <p className="text-muted-foreground">
          Pesquise pelo numero do chassi para visualizar todas as informacoes vinculadas.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 max-w-lg">
            <div className="relative flex-1">
              <Hash className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Digite o numero do chassi..."
                value={chassi}
                onChange={(e) => setChassi(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading || !chassi.trim()}>
              <Search className="h-4 w-4 mr-1" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-6 w-full mb-3" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searched && !loading && !result?.scooter && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Chassi nao encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Nenhuma scooter foi encontrada com o chassi &quot;{chassi}&quot;.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {result?.scooter && !loading && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bike className="h-5 w-5" />
                  Scooter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      <Bike className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <Link
                        href={`/gestor/scooters/${result.scooter.id}`}
                        className="font-semibold text-lg text-primary hover:underline"
                      >
                        {result.scooter.marca} {result.scooter.modelo}
                      </Link>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{result.scooter.status}</Badge>
                        {result.scooter.ano && (
                          <Badge variant="outline">{result.scooter.ano}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Chassi:</span>{" "}
                      <span className="font-mono">{result.scooter.chassi}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Serie:</span>{" "}
                      <span className="font-mono">{result.scooter.numero_serie ?? "---"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cor:</span>{" "}
                      <span>{result.scooter.cor ?? "---"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">KM:</span>{" "}
                      <span>{result.scooter.km_atual} km</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {result.cliente ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <Link
                          href={`/gestor/clientes/${result.cliente.id}`}
                          className="font-semibold text-lg text-primary hover:underline"
                        >
                          {result.cliente.nome}
                        </Link>
                        <Badge
                          variant={result.cliente.ativo ? "default" : "destructive"}
                          className={
                            result.cliente.ativo
                              ? "bg-green-100 text-green-800 ml-2"
                              : "bg-red-100 text-red-800 ml-2"
                          }
                        >
                          {result.cliente.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">CPF:</span>{" "}
                        <span>{result.cliente.cpf ?? "---"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Telefone:</span>{" "}
                        <span>{result.cliente.telefone ?? "---"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">E-mail:</span>{" "}
                        <span>{result.cliente.email}</span>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Garantias ({result.garantias.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.garantias.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma garantia encontrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>KM Limite</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.garantias.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="capitalize font-medium">
                          {g.tipo}
                        </TableCell>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Ordens de Servico ({result.ordens.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.ordens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
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
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.ordens.map((o) => (
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

          {result.certificados.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Certificados ({result.certificados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {result.certificados.map((cert) => (
                    <Card key={cert.id} size="sm">
                      <CardContent className="pt-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Award className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              #{cert.hash.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(cert.created_at)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
