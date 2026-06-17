"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Search, Eye } from "lucide-react";
import Link from "next/link";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

export default function VendedorClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", email: "", endereco: "" });

  useEffect(() => {
    loadClientes();
  }, []);

  async function loadClientes() {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, cpf, telefone, email, ativo")
      .eq("role", "cliente")
      .order("nome");
    if (data) setClientes(data);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error: authError, data: authData } = await supabase.auth.admin.createUser({
        email: form.email,
        email_confirm: true,
        user_metadata: { nome: form.nome, role: "cliente" },
      });

      if (authError) {
        const { error: profileError } = await supabase.from("profiles").insert({
          nome: form.nome,
          cpf: form.cpf,
          telefone: form.telefone,
          email: form.email,
          endereco: form.endereco,
          role: "cliente",
          created_by: user?.id,
        });

        if (profileError) {
          toast.error("Erro ao cadastrar cliente", { description: profileError.message });
          return;
        }
      }

      toast.success("Cliente cadastrado com sucesso!");
      setDialogOpen(false);
      setForm({ nome: "", cpf: "", telefone: "", email: "", endereco: "" });
      loadClientes();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  const filtered = clientes.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes cadastrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={e => setForm({...form, endereco: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou e-mail..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : filtered.map(cliente => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.cpf}</TableCell>
                    <TableCell>{cliente.telefone}</TableCell>
                    <TableCell>{cliente.email}</TableCell>
                    <TableCell>
                      <Badge variant={cliente.ativo ? "default" : "secondary"}>
                        {cliente.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/vendedor/clientes/${cliente.id}`}>
                        <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      </Link>
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
