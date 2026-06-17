"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Bike,
  Wrench,
  FileText,
  ShieldCheck,
  FolderOpen,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, GARANTIA_STATUS, CONTRATO_STATUS } from "@/lib/constants";
import type { Profile, Scooter, OrdemServico, Contrato, Garantia } from "@/types/database";
import type { OrdemServicoStatus, GarantiaStatus, ContratoStatus } from "@/types/database";

interface EditFormData {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
}

export default function ClienteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;

  const [cliente, setCliente] = useState<Profile | null>(null);
  const [scooters, setScooters] = useState<Scooter[]>([]);
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [garantias, setGarantias] = useState<(Garantia & { scooter?: { modelo: string; chassi: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormData>();

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [clienteRes, scootersRes, ordensRes, contratosRes, garantiasRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", clienteId).single(),
        supabase
          .from("scooters")
          .select("*")
          .eq("proprietario_id", clienteId)
          .order("created_at", { ascending: false }),
        supabase
          .from("ordens_servico")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false }),
        supabase
          .from("contratos")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false }),
        supabase
          .from("garantias")
          .select("*, scooter:scooters!scooter_id(modelo, chassi)")
          .eq("cliente_id", clienteId)
          .order("created_at", { ascending: false }),
      ]);

    if (clienteRes.data) {
      const c = clienteRes.data as Profile;
      setCliente(c);
      reset({
        nome: c.nome,
        cpf: c.cpf ?? "",
        telefone: c.telefone ?? "",
        email: c.email,
        endereco: c.endereco ?? "",
      });
    }
    setScooters((scootersRes.data ?? []) as Scooter[]);
    setOrdens((ordensRes.data ?? []) as OrdemServico[]);
    setContratos((contratosRes.data ?? []) as Contrato[]);
    setGarantias((garantiasRes.data ?? []) as (Garantia & { scooter?: { modelo: string; chassi: string | null } })[]);
    setLoading(false);
  }, [clienteId, reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onEditSubmit(formData: EditFormData) {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        nome: formData.nome,
        cpf: formData.cpf || null,
        telefone: formData.telefone || null,
        email: formData.email,
        endereco: formData.endereco || null,
      })
      .eq("id", clienteId);

    setSaving(false);
    setEditOpen(false);
    loadData();
  }

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
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Cliente nao encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/gestor/clientes" />}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Pencil className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                      Atualize os dados do cliente.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-nome">Nome</Label>
                      <Input id="edit-nome" {...register("nome", { required: "Nome obrigatorio" })} />
                      {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-cpf">CPF</Label>
                      <Input id="edit-cpf" {...register("cpf")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-telefone">Telefone</Label>
                      <Input id="edit-telefone" {...register("telefone")} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">E-mail</Label>
                      <Input id="edit-email" type="email" {...register("email", { required: "E-mail obrigatorio" })} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-endereco">Endereco</Label>
                      <Input id="edit-endereco" {...register("endereco")} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saving}>
                        {saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-3">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{cliente.nome}</p>
                  <Badge
                    variant={cliente.ativo ? "default" : "destructive"}
                    className={
                      cliente.ativo
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {cliente.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">CPF:</span>
                  <span>{cliente.cpf ?? "---"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Telefone:</span>
                  <span>{cliente.telefone ?? "---"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">E-mail:</span>
                  <span>{cliente.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Endereco:</span>
                  <span>{cliente.endereco ?? "---"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="scooters">
            <TabsList>
              <TabsTrigger value="scooters">
                <Bike className="h-4 w-4 mr-1" />
                Scooters ({scooters.length})
              </TabsTrigger>
              <TabsTrigger value="ordens">
                <Wrench className="h-4 w-4 mr-1" />
                Ordens de Servico ({ordens.length})
              </TabsTrigger>
              <TabsTrigger value="contratos">
                <FileText className="h-4 w-4 mr-1" />
                Contratos ({contratos.length})
              </TabsTrigger>
              <TabsTrigger value="garantias">
                <ShieldCheck className="h-4 w-4 mr-1" />
                Garantias ({garantias.length})
              </TabsTrigger>
              <TabsTrigger value="documentos">
                <FolderOpen className="h-4 w-4 mr-1" />
                Documentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scooters">
              <Card>
                <CardContent className="pt-4">
                  {scooters.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma scooter vinculada a este cliente.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Modelo</TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Cor</TableHead>
                          <TableHead>Chassi</TableHead>
                          <TableHead>KM</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scooters.map((scooter) => (
                          <TableRow key={scooter.id}>
                            <TableCell className="font-medium">
                              <Link
                                href={`/gestor/scooters/${scooter.id}`}
                                className="text-primary hover:underline"
                              >
                                {scooter.modelo}
                              </Link>
                            </TableCell>
                            <TableCell>{scooter.marca}</TableCell>
                            <TableCell>{scooter.cor ?? "---"}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {scooter.chassi ?? "---"}
                            </TableCell>
                            <TableCell>{scooter.km_atual} km</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{scooter.status}</Badge>
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
                          <TableHead>Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordens.map((ordem) => (
                          <TableRow key={ordem.id}>
                            <TableCell className="font-medium">
                              {ordem.numero}
                            </TableCell>
                            <TableCell className="capitalize">
                              {ordem.tipo}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={ORDER_STATUS_COLORS[ordem.status as OrdemServicoStatus] ?? ""}
                              >
                                {ORDER_STATUS_LABELS[ordem.status as OrdemServicoStatus] ?? ordem.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(ordem.created_at)}
                            </TableCell>
                            <TableCell>
                              {ordem.valor_total
                                ? `R$ ${ordem.valor_total.toFixed(2)}`
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

            <TabsContent value="contratos">
              <Card>
                <CardContent className="pt-4">
                  {contratos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhum contrato encontrado.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Numero</TableHead>
                          <TableHead>Titulo</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contratos.map((contrato) => (
                          <TableRow key={contrato.id}>
                            <TableCell className="font-medium">
                              {contrato.numero}
                            </TableCell>
                            <TableCell>{contrato.titulo}</TableCell>
                            <TableCell className="capitalize">
                              {contrato.tipo.replace("_", " ")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {CONTRATO_STATUS[contrato.status as ContratoStatus] ?? contrato.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDate(contrato.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="garantias">
              <Card>
                <CardContent className="pt-4">
                  {garantias.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma garantia encontrada.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Scooter</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Inicio</TableHead>
                          <TableHead>Fim</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {garantias.map((garantia) => (
                          <TableRow key={garantia.id}>
                            <TableCell className="font-medium">
                              {garantia.scooter?.modelo ?? "---"}
                            </TableCell>
                            <TableCell className="capitalize">
                              {garantia.tipo}
                            </TableCell>
                            <TableCell>
                              {formatDate(garantia.data_inicio)}
                            </TableCell>
                            <TableCell>
                              {formatDate(garantia.data_fim)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  garantia.status === "ativa"
                                    ? "bg-green-100 text-green-800"
                                    : garantia.status === "expirada"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {GARANTIA_STATUS[garantia.status as GarantiaStatus] ?? garantia.status}
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

            <TabsContent value="documentos">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum documento encontrado.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
