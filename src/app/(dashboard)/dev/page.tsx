"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  LifeBuoy, Inbox, Loader2, Mail, Phone, Search, CheckCircle2, Clock, PlayCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
  SUPORTE_TIPO_LABEL, SUPORTE_STATUS_LABEL, SUPORTE_STATUS_TOM,
} from "@/lib/constants";
import type {
  SolicitacaoSuporte, SolicitacaoSuporteUpdate, SuporteStatus,
} from "@/types/database";

const FILTROS: { value: SuporteStatus | "todos"; label: string }[] = [
  { value: "aberto", label: "Abertos" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "resolvido", label: "Resolvidos" },
  { value: "todos", label: "Todos" },
];

export default function DevPage() {
  const [itens, setItens] = useState<SolicitacaoSuporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<SuporteStatus | "todos">("aberto");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<SolicitacaoSuporte | null>(null);
  const [anotacao, setAnotacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroTabela, setErroTabela] = useState(false);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("solicitacoes_suporte")
      .select("*")
      .order("created_at", { ascending: false });
    if (error && /does not exist|could not find the table/i.test(error.message)) setErroTabela(true);
    setItens((data ?? []) as unknown as SolicitacaoSuporte[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function mudarStatus(item: SolicitacaoSuporte, status: SuporteStatus) {
    setSalvando(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const patch: SolicitacaoSuporteUpdate = { status, anotacao: anotacao.trim() || null };
    if (status === "resolvido") {
      patch.resolvido_por = user?.id ?? null;
      patch.resolvido_em = new Date().toISOString();
    } else {
      patch.resolvido_por = null;
      patch.resolvido_em = null;
    }
    const { error } = await supabase
      .from("solicitacoes_suporte")
      .update(patch)
      .eq("id", item.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success(`Marcado como ${SUPORTE_STATUS_LABEL[status].toLowerCase()}.`);
    setAberto(null);
    carregar();
  }

  const contar = (s: SuporteStatus) => itens.filter((i) => i.status === s).length;

  const filtrados = itens.filter((i) => {
    if (filtro !== "todos" && i.status !== filtro) return false;
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return (
      i.nome.toLowerCase().includes(t) ||
      (i.email ?? "").toLowerCase().includes(t) ||
      (i.telefone ?? "").includes(t) ||
      i.mensagem.toLowerCase().includes(t)
    );
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <LifeBuoy className="h-6 w-6 text-primary" /> Caixa de suporte
        </h1>
        <p className="text-sm text-muted-foreground">
          Pedidos de senha, acesso, erros e sugestões que chegam pela tela de login
          e de dentro do painel.
        </p>
      </div>

      {erroTabela && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            A tabela da caixa de suporte ainda não existe no banco. Rode as migrations
            <strong> 035_papel_dev.sql</strong> e <strong> 036_solicitacoes_suporte.sql</strong>,
            nessa ordem, no editor SQL do Supabase.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Abertos" valor={contar("aberto")} legenda="esperando você" icon={Inbox} destaque={contar("aberto") > 0} />
        <StatCard titulo="Em andamento" valor={contar("em_andamento")} legenda="já iniciados" icon={PlayCircle} />
        <StatCard titulo="Resolvidos" valor={contar("resolvido")} legenda="no total" icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filtro === f.value ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setFiltro(f.value)}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {f.value === "todos" ? itens.length : contar(f.value)}
            </span>
          </Button>
        ))}
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, contato ou texto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {filtrados.length} chamado{filtrados.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {itens.length === 0
                ? "Nenhuma mensagem recebida ainda."
                : "Nada neste filtro."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Quem</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {format(new Date(i.created_at), "dd/MM/yy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{i.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.email ?? i.telefone ?? "---"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {SUPORTE_TIPO_LABEL[i.tipo] ?? i.tipo}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm text-muted-foreground">{i.mensagem}</p>
                    </TableCell>
                    <TableCell>
                      <StatusPill tom={SUPORTE_STATUS_TOM[i.status]}>
                        {SUPORTE_STATUS_LABEL[i.status]}
                      </StatusPill>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => { setAberto(i); setAnotacao(i.anotacao ?? ""); }}
                      >
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detalhe do chamado */}
      <Dialog open={!!aberto} onOpenChange={(v) => !v && setAberto(null)}>
        <DialogContent className="sm:max-w-lg">
          {aberto && (
            <>
              <DialogHeader>
                <DialogTitle>{SUPORTE_TIPO_LABEL[aberto.tipo] ?? aberto.tipo}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="font-medium">{aberto.nome}</p>
                  <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                    {aberto.email && (
                      <a href={`mailto:${aberto.email}`} className="flex items-center gap-1.5 hover:text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {aberto.email}
                      </a>
                    )}
                    {aberto.telefone && (
                      <a
                        href={`https://wa.me/55${aberto.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:text-primary hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" /> {aberto.telefone}
                      </a>
                    )}
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(aberto.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Mensagem</Label>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg border p-3 text-sm">
                    {aberto.mensagem}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="anot">Sua anotação</Label>
                  <Textarea
                    id="anot"
                    rows={3}
                    value={anotacao}
                    onChange={(e) => setAnotacao(e.target.value)}
                    placeholder="O que foi feito. Fica só aqui, não volta para quem escreveu."
                  />
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {aberto.status !== "em_andamento" && (
                  <Button variant="outline" disabled={salvando} onClick={() => mudarStatus(aberto, "em_andamento")}>
                    {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Em andamento
                  </Button>
                )}
                {aberto.status !== "aberto" && (
                  <Button variant="outline" disabled={salvando} onClick={() => mudarStatus(aberto, "aberto")}>
                    Reabrir
                  </Button>
                )}
                {aberto.status !== "resolvido" && (
                  <Button disabled={salvando} onClick={() => mudarStatus(aberto, "resolvido")}>
                    {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Marcar resolvido
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
