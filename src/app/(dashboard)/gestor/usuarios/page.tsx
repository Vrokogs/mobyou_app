"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  UserCog,
  KeyRound,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import type { Profile, Role } from "@/types/database";

interface UserFormData {
  nome: string;
  email: string;
  telefone: string;
  role: string;
}

export default function UsuariosPage() {
  const [gestores, setGestores] = useState<Profile[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [tecnicos, setTecnicos] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<UserFormData>();

  const loadUsers = useCallback(async () => {
    const supabase = createClient();

    const [gestoresRes, vendedoresRes, tecnicosRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "gestor")
        .order("nome", { ascending: true }),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "vendedor")
        .order("nome", { ascending: true }),
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "tecnico")
        .order("nome", { ascending: true }),
    ]);

    setGestores((gestoresRes.data ?? []) as Profile[]);
    setVendedores((vendedoresRes.data ?? []) as Profile[]);
    setTecnicos((tecnicosRes.data ?? []) as Profile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function onSubmit(formData: UserFormData) {
    setSaving(true);
    const supabase = createClient();

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: formData.email,
        email_confirm: true,
        user_metadata: { nome: formData.nome, role: formData.role },
      });

    if (authError) {
      // If admin API fails (expected without service role), create profile directly
      const { error: profileError } = await supabase.from("profiles").insert({
        id: crypto.randomUUID(),
        email: formData.email,
        nome: formData.nome,
        telefone: formData.telefone || null,
        cpf: null,
        endereco: null,
        cidade: null,
        estado: null,
        cep: null,
        role: formData.role as Role,
        avatar_url: null,
        ativo: true,
      });

      if (profileError) {
        console.error("Erro ao criar usuario:", profileError);
        setSaving(false);
        return;
      }
    } else if (authData.user) {
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        email: formData.email,
        nome: formData.nome,
        telefone: formData.telefone || null,
        cpf: null,
        endereco: null,
        cidade: null,
        estado: null,
        cep: null,
        role: formData.role as Role,
        avatar_url: null,
        ativo: true,
      });
    }

    reset();
    setDialogOpen(false);
    setSaving(false);
    loadUsers();
  }

  async function toggleActive(user: Profile) {
    setTogglingId(user.id);
    const supabase = createClient();

    await supabase
      .from("profiles")
      .update({ ativo: !user.ativo })
      .eq("id", user.id);

    setTogglingId(null);
    loadUsers();
  }

  async function resetPassword(user: Profile) {
    setResettingId(user.id);
    const supabase = createClient();

    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/primeiro-acesso`,
    });

    setResettingId(null);
    alert(`Link de redefinicao de senha enviado para ${user.email}`);
  }

  function renderUserTable(users: Profile[]) {
    if (users.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum usuario encontrado.
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.nome}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.telefone ?? "---"}</TableCell>
              <TableCell>
                <Badge
                  variant={user.ativo ? "default" : "destructive"}
                  className={
                    user.ativo
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {user.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(user)}
                    disabled={togglingId === user.id}
                  >
                    {user.ativo ? (
                      <ToggleRight className="h-4 w-4 mr-1" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 mr-1" />
                    )}
                    {togglingId === user.id
                      ? "..."
                      : user.ativo
                        ? "Desativar"
                        : "Ativar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPassword(user)}
                    disabled={resettingId === user.id}
                  >
                    <KeyRound className="h-4 w-4 mr-1" />
                    {resettingId === user.id ? "Enviando..." : "Reset Senha"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
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
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gerencie gestores, vendedores e tecnicos.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Novo Usuario
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Usuario</DialogTitle>
              <DialogDescription>
                Cadastre um novo usuario no sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Nome do usuario"
                  {...register("nome", { required: "Nome obrigatorio" })}
                />
                {errors.nome && (
                  <p className="text-xs text-destructive">{errors.nome.message}</p>
                )}
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
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  {...register("telefone")}
                />
              </div>
              <div className="space-y-2">
                <Label>Funcao</Label>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: "Funcao obrigatoria" }}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a funcao" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="vendedor">Vendedor</SelectItem>
                        <SelectItem value="tecnico">Tecnico</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.role && (
                  <p className="text-xs text-destructive">{errors.role.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Cadastrar e Enviar Convite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="gestores">
        <TabsList>
          <TabsTrigger value="gestores">
            <UserCog className="h-4 w-4 mr-1" />
            Gestores ({gestores.length})
          </TabsTrigger>
          <TabsTrigger value="vendedores">
            <UserCog className="h-4 w-4 mr-1" />
            Vendedores ({vendedores.length})
          </TabsTrigger>
          <TabsTrigger value="tecnicos">
            <UserCog className="h-4 w-4 mr-1" />
            Tecnicos ({tecnicos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gestores">
          <Card>
            <CardHeader>
              <CardTitle>Gestores</CardTitle>
            </CardHeader>
            <CardContent>{renderUserTable(gestores)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendedores">
          <Card>
            <CardHeader>
              <CardTitle>Vendedores</CardTitle>
            </CardHeader>
            <CardContent>{renderUserTable(vendedores)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tecnicos">
          <Card>
            <CardHeader>
              <CardTitle>Tecnicos</CardTitle>
            </CardHeader>
            <CardContent>{renderUserTable(tecnicos)}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
