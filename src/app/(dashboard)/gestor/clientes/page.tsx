"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Search, Eye, Pencil, Users, Upload, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import type { Profile } from "@/types/database";

const clienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(11, "CPF invalido").max(14, "CPF invalido"),
  telefone: z.string().min(10, "Telefone invalido"),
  email: z.string().email("E-mail invalido"),
  endereco: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

interface ClienteFromNf {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
}

function extractClienteFromXml(xmlText: string): ClienteFromNf {
  const result: ClienteFromNf = { nome: "", cpf: "", telefone: "", email: "", endereco: "" };
  try {
    const doc = new DOMParser().parseFromString(xmlText, "text/xml");
    const dest = doc.querySelector("dest");
    if (!dest) return result;
    result.nome = dest.querySelector("xNome")?.textContent || "";
    result.cpf = dest.querySelector("CPF")?.textContent || dest.querySelector("CNPJ")?.textContent || "";
    result.telefone = dest.querySelector("fone")?.textContent || "";
    result.email = dest.querySelector("email")?.textContent || "";
    const ender = dest.querySelector("enderDest");
    if (ender) {
      const xLgr = ender.querySelector("xLgr")?.textContent || "";
      const nro = ender.querySelector("nro")?.textContent || "";
      const xBairro = ender.querySelector("xBairro")?.textContent || "";
      const xMun = ender.querySelector("xMun")?.textContent || "";
      const UF = ender.querySelector("UF")?.textContent || "";
      result.endereco = `${xLgr}, ${nro} - ${xBairro}, ${xMun}/${UF}`;
    }
  } catch {
    // ignore parse errors
  }
  return result;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scooterCounts, setScooterCounts] = useState<Record<string, number>>({});

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClienteFormData>();

  async function handleNfImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xml") {
      toast.error("Envie o XML da NF-e para extrair automaticamente.");
      e.target.value = "";
      return;
    }
    const text = await file.text();
    const c = extractClienteFromXml(text);
    if (!c.nome && !c.cpf) {
      toast.error("Nao foi possivel extrair dados do cliente deste XML.");
      e.target.value = "";
      return;
    }
    if (c.nome) setValue("nome", c.nome);
    if (c.cpf) setValue("cpf", c.cpf);
    if (c.telefone) setValue("telefone", c.telefone);
    if (c.email) setValue("email", c.email);
    if (c.endereco) setValue("endereco", c.endereco);
    toast.success("Dados do cliente extraidos da NF!");
    e.target.value = "";
  }

  const loadClientes = useCallback(async () => {
    const supabase = createClient();
    let query = supabase
      .from("profiles")
      .select("*")
      .eq("role", "cliente")
      .order("nome", { ascending: true });

    if (search.trim()) {
      query = query.or(
        `nome.ilike.%${search}%,cpf.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%`
      );
    }

    const { data } = await query;
    const clientList = (data ?? []) as Profile[];
    setClientes(clientList);

    if (clientList.length > 0) {
      const ids = clientList.map((c) => c.id);
      const { data: scooters } = await supabase
        .from("scooters")
        .select("id, cliente_id")
        .in("cliente_id", ids);

      const counts: Record<string, number> = {};
      scooters?.forEach((s) => {
        if (s.cliente_id) {
          counts[s.cliente_id] = (counts[s.cliente_id] || 0) + 1;
        }
      });
      setScooterCounts(counts);
    }

    setLoading(false);
  }, [search]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  async function onSubmit(formData: ClienteFormData) {
    setSaving(true);
    try {
      const res = await fetch("/api/criar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error("Erro ao cadastrar cliente", {
          description: json.error || "Tente novamente.",
        });
        setSaving(false);
        return;
      }

      toast.success("Cliente cadastrado com conta de acesso criada!", {
        description: `Login: ${json.email} • Senha provisória: ${json.senha}`,
        duration: 15000,
      });
      reset();
      setDialogOpen(false);
      loadClientes();
    } catch {
      toast.error("Erro inesperado ao cadastrar cliente");
    } finally {
      setSaving(false);
    }
  }

  function formatCpf(cpf: string | null) {
    if (!cpf) return "---";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return cpf;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="pt-4">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie os clientes cadastrados no sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" render={<Link href="/gestor/importar-nf" />}>
          <Upload className="h-4 w-4 mr-1" />
          Cadastrar com NF
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Novo Cliente
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>
                Preencha os dados para cadastrar um novo cliente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="rounded-lg border border-dashed p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>Preencher a partir de uma NF-e (XML)</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("nf-file-input")?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Importar NF
                  </Button>
                </div>
                <input
                  id="nf-file-input"
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={handleNfImport}
                />
                <p className="text-xs text-muted-foreground">
                  Para importar tambem a scooter e gerar contrato/garantia, use{" "}
                  <Link href="/gestor/importar-nf" className="underline text-primary">
                    Importar NF
                  </Link>
                  .
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Nome do cliente"
                  {...register("nome", { required: "Nome obrigatorio" })}
                />
                {errors.nome && (
                  <p className="text-xs text-destructive">{errors.nome.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    {...register("cpf", { required: "CPF obrigatorio" })}
                  />
                  {errors.cpf && (
                    <p className="text-xs text-destructive">{errors.cpf.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(00) 00000-0000"
                    {...register("telefone", { required: "Telefone obrigatorio" })}
                  />
                  {errors.telefone && (
                    <p className="text-xs text-destructive">
                      {errors.telefone.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  {...register("email", { required: "E-mail obrigatorio" })}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereco</Label>
                <Input
                  id="endereco"
                  placeholder="Rua, numero, bairro, cidade"
                  {...register("endereco")}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CPF, e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum cliente encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Scooters</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{formatCpf(cliente.cpf)}</TableCell>
                    <TableCell>{cliente.telefone ?? "---"}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {scooterCounts[cliente.id] ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" render={<Link href={`/gestor/clientes/${cliente.id}`} />}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" render={<Link href={`/gestor/clientes/${cliente.id}`} />}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
