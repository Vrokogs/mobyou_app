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
import { Plus, Search, Eye, Upload, FileText, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";

interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  ativo: boolean;
}

function extractClienteFromXml(xmlText: string) {
  const result = { nome: "", cpf: "", telefone: "", email: "", endereco: "" };
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

export default function VendedorClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nome: "", cpf: "", telefone: "", email: "", endereco: "" });
  const [deletingId, setDeletingId] = useState<string>("");

  async function excluirCliente(cliente: Cliente) {
    if (!confirm(`Excluir o cliente "${cliente.nome}" e TODOS os dados vinculados (scooters, vendas, OS, contratos, garantias)? Esta ação é irreversível.`)) return;
    setDeletingId(cliente.id);
    try {
      const res = await fetch("/api/excluir-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: cliente.id }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error("Erro ao excluir cliente", { description: json.error || json.detalhe }); return; }
      toast.success(`Cliente "${cliente.nome}" excluído.`);
      loadClientes();
    } catch {
      toast.error("Erro inesperado ao excluir cliente");
    } finally {
      setDeletingId("");
    }
  }

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
    if (data) setClientes(data as unknown as Cliente[]);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/criar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error("Erro ao cadastrar cliente", {
          description: json.error || "Tente novamente.",
        });
        return;
      }

      toast.success("Cliente cadastrado com conta de acesso criada!", {
        description: `Login: ${json.email} • Senha provisória: ${json.senha}`,
        duration: 15000,
      });
      setDialogOpen(false);
      setForm({ nome: "", cpf: "", telefone: "", email: "", endereco: "" });
      loadClientes();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

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
    setForm((prev) => ({
      nome: c.nome || prev.nome,
      cpf: c.cpf || prev.cpf,
      telefone: c.telefone || prev.telefone,
      email: c.email || prev.email,
      endereco: c.endereco || prev.endereco,
    }));
    toast.success("Dados do cliente extraidos da NF!");
    e.target.value = "";
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
        <div className="flex items-center gap-2">
        <Button variant="outline" render={<Link href="/vendedor/importar-nf" />}>
          <Upload className="h-4 w-4 mr-1" />
          Cadastrar com NF
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button><Plus className="mr-2 h-4 w-4" />Novo Cliente</Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
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
                  <Link href="/vendedor/importar-nf" className="underline text-primary">
                    Importar NF
                  </Link>
                  .
                </p>
              </div>
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
                      <div className="flex items-center gap-1">
                        <Link href={`/vendedor/clientes/${cliente.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                          disabled={deletingId === cliente.id} onClick={() => excluirCliente(cliente)} title="Excluir cliente">
                          {deletingId === cliente.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
