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
import { Plus, Search, Eye, Pencil, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Profile } from "@/types/database";

const clienteSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cpf: z.string().min(11, "CPF invalido").max(14, "CPF invalido"),
  telefone: z.string().min(10, "Telefone invalido"),
  email: z.string().email("E-mail invalido"),
  endereco: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

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
    formState: { errors },
  } = useForm<ClienteFormData>();

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
    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: formData.email,
        email_confirm: true,
        user_metadata: { nome: formData.nome },
      });

    if (authError) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        email: formData.email,
        nome: formData.nome,
        cpf: formData.cpf,
        telefone: formData.telefone,
        endereco: formData.endereco || null,
        role: "cliente" as const,
        ativo: true,
        avatar_url: null,
        cidade: null,
        estado: null,
        cep: null,
      });

      if (profileError) {
        console.error("Erro ao criar cliente:", profileError);
        setSaving(false);
        return;
      }
    } else if (authData.user) {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: formData.email,
        nome: formData.nome,
        cpf: formData.cpf,
        telefone: formData.telefone,
        endereco: formData.endereco || null,
        role: "cliente" as const,
        ativo: true,
        avatar_url: null,
        cidade: null,
        estado: null,
        cep: null,
      });
    }

    reset();
    setDialogOpen(false);
    setSaving(false);
    loadClientes();
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
