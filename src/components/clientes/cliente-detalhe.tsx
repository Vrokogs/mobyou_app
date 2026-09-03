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
  FilePlus2,
  Loader2,

  KeyRound,
  Receipt,} from "lucide-react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, GARANTIA_STATUS, CONTRATO_STATUS,
  MOBYOU_MODELOS, MOBYOU_MARCA, GARANTIA_MODALIDADES, UNIDADES_VENDA,
  gerarPreventivas, isClienteLegado, DATA_CORTE_PREVENTIVA_GRATIS,
} from "@/lib/constants";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Profile, Scooter, OrdemServico, Contrato, Garantia } from "@/types/database";
import type { OrdemServicoStatus, GarantiaStatus, ContratoStatus } from "@/types/database";

// Nota fiscal como ela aparece na ficha do cliente. O número da nota e as motos
// ficam dentro do JSON extraído no momento da importação.
interface NotaFiscalCliente {
  id: string;
  tipo_arquivo: string | null;
  arquivo_url: string | null;
  storage_path: string | null;
  valor: number | null;
  parcelas: number | null;
  data_compra: string | null;
  created_at: string;
  importado_por: string | null;
  dados_extraidos: {
    venda?: { numero_nf?: string };
    scooters?: { modelo?: string; chassi?: string }[];
  } | null;
}

interface EditFormData {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
}

interface ClienteDetalheProps {
  // "/gestor" ou "/vendedor": prefixo das rotas do painel que abriu a tela.
  basePath: string;
}

// Detalhe do cliente compartilhado entre o painel do gestor e o do vendedor.
// O vendedor não tem rota de scooters, então lá o modelo aparece como texto.
export function ClienteDetalhe({ basePath }: ClienteDetalheProps) {
  const params = useParams();
  const router = useRouter();
  const clienteId = params.id as string;
  const linkarScooter = basePath === "/gestor";
  // Gestor e vendedor editam o cadastro do cliente (policy
  // profiles_update_cliente_staff). Trocar e-mail de login e senha continua
  // sendo só do gestor — é credencial, não dado de cadastro.
  const podeEditar = basePath === "/gestor" || basePath === "/vendedor";
  const podeTrocarAcesso = basePath === "/gestor";

  const [cliente, setCliente] = useState<Profile | null>(null);
  const [scooters, setScooters] = useState<Scooter[]>([]);
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscalCliente[]>([]);
  // id da conta -> nome, para mostrar quem cadastrou cada moto
  const [autores, setAutores] = useState<Record<string, string>>({});
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [garantias, setGarantias] = useState<(Garantia & { scooter?: { modelo: string; chassi: string | null } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingDocs, setGeneratingDocs] = useState(false);
  // Acesso do cliente: corrigir e-mail de login (e, se quiser, a senha)
  const [acessoOpen, setAcessoOpen] = useState(false);
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvandoAcesso, setSalvandoAcesso] = useState(false);

  // Segunda moto do mesmo cliente: cria scooter + garantia + revisões + venda,
  // com as mesmas regras da importação de nota.
  const [motoOpen, setMotoOpen] = useState(false);
  const [salvandoMoto, setSalvandoMoto] = useState(false);
  const [vendedores, setVendedores] = useState<{ id: string; nome: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const hojeISO = new Date().toISOString().slice(0, 10);
  const MOTO_VAZIA = {
    modelo: "", cor: "", ano: String(new Date().getFullYear()),
    chassi: "", numero_serie: "", data_compra: hojeISO,
    modalidade: "1_ano", primeira_gratuita: true,
    valor: "", forma_pagamento: "pix", parcelas: "1",
    unidade: "", vendedor_id: "", gerar_contratos: true,
  };
  const [moto, setMoto] = useState({ ...MOTO_VAZIA });
  const setMotoField = (k: keyof typeof MOTO_VAZIA, v: string | boolean) =>
    setMoto((m) => ({ ...m, [k]: v }));

  // Antes de 20/08/2026 não há 1ª revisão gratuita.
  const motoSemGratuita = moto.data_compra < DATA_CORTE_PREVENTIVA_GRATIS;
  // Venda anterior à entrada do sistema: sem contrato para assinar e sem agenda.
  const motoLegada = isClienteLegado(moto.data_compra, false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditFormData>();

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [clienteRes, scootersRes, ordensRes, contratosRes, garantiasRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", clienteId).single(),
        supabase
          .from("scooters")
          .select("*")
          .eq("cliente_id", clienteId)
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

    const { data: nfs } = await supabase
      .from("notas_fiscais")
      .select("id, tipo_arquivo, arquivo_url, storage_path, valor, parcelas, data_compra, created_at, importado_por, dados_extraidos")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false });
    setNotasFiscais((nfs ?? []) as unknown as NotaFiscalCliente[]);

    // Nomes de quem cadastrou as motos e importou as notas
    const idsAutores = Array.from(
      new Set([
        ...((scootersRes.data ?? []) as Scooter[]).map((m) => m.criado_por),
        ...((nfs ?? []) as { importado_por: string | null }[]).map((n) => n.importado_por),
      ].filter(Boolean) as string[]),
    );
    if (idsAutores.length > 0) {
      const { data: pessoas } = await supabase
        .from("profiles").select("id, nome").in("id", idsAutores);
      const mapa: Record<string, string> = {};
      for (const pes of (pessoas ?? []) as { id: string; nome: string }[]) mapa[pes.id] = pes.nome;
      setAutores(mapa);
    }

    // Para o campo "vendedor" da nova moto.
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const { data: vend } = await supabase
      .from("profiles").select("id, nome")
      .eq("role", "vendedor").eq("ativo", true).order("nome");
    setVendedores((vend ?? []) as { id: string; nome: string }[]);
    setOrdens((ordensRes.data ?? []) as OrdemServico[]);
    setContratos((contratosRes.data ?? []) as Contrato[]);
    setGarantias((garantiasRes.data ?? []) as unknown as (Garantia & { scooter?: { modelo: string; chassi: string | null } })[]);
    setLoading(false);
  }, [clienteId, reset]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onEditSubmit(formData: EditFormData) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
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
    if (error) {
      toast.error("Erro ao salvar os dados do cliente", {
        description: error.message || "Sem permissão para alterar este cadastro.",
      });
      return;
    }
    toast.success("Dados do cliente atualizados.");
    setEditOpen(false);
    loadData();
  }

  async function salvarAcesso() {
    const email = novoEmail.trim();
    if (!email) { toast.error("Informe o novo e-mail."); return; }
    setSalvandoAcesso(true);
    try {
      const res = await fetch("/api/alterar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente_id: clienteId, email, senha: novaSenha.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error("Erro ao alterar acesso", { description: json.error }); return; }
      toast.success("E-mail de acesso atualizado.", {
        description: json.senhaAlterada ? "A senha também foi redefinida." : `O cliente agora entra com ${email}.`,
      });
      setAcessoOpen(false);
      setNovaSenha("");
      loadData();
    } catch {
      toast.error("Erro inesperado ao alterar o acesso.");
    } finally {
      setSalvandoAcesso(false);
    }
  }

  // O bucket "documentos" é privado — nota fiscal tem CPF e endereço. O link
  // público gravado na importação não abre; geramos um link assinado na hora,
  // válido por 5 minutos.
  const [abrindoNota, setAbrindoNota] = useState<string | null>(null);

  async function abrirNota(nf: NotaFiscalCliente) {
    if (!nf.storage_path) {
      toast.error("Esta nota não tem arquivo anexado.");
      return;
    }
    setAbrindoNota(nf.id);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("documentos")
        .createSignedUrl(nf.storage_path, 300);
      if (error || !data?.signedUrl) {
        toast.error("Não foi possível abrir a nota", { description: error?.message });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setAbrindoNota(null);
    }
  }

  async function criarMoto() {
    if (!moto.modelo.trim()) { toast.error("Escolha o modelo da moto."); return; }
    if (!moto.chassi.trim()) { toast.error("Informe o chassi."); return; }

    setSalvandoMoto(true);
    const supabase = createClient();
    try {
      const dataCompra = moto.data_compra || hojeISO;
      const legado = isClienteLegado(dataCompra, false);

      // 1. Moto
      const { data: nova, error: errScooter } = await (supabase.from("scooters") as any).insert({
        modelo: moto.modelo,
        marca: MOBYOU_MARCA,
        cor: moto.cor || null,
        ano: moto.ano ? parseInt(moto.ano) : null,
        chassi: moto.chassi.trim(),
        numero_serie: moto.numero_serie.trim() || moto.chassi.trim(),
        cliente_id: clienteId,
        data_compra: dataCompra,
        legado,
        criado_por: userId,
      }).select("id").single();

      if (errScooter) {
        const dup = /duplicate|unique/i.test(errScooter.message || "");
        toast.error(dup ? "Já existe uma moto com esse chassi." : "Erro ao cadastrar a moto", {
          description: dup ? undefined : errScooter.message,
        });
        return;
      }
      const scooterId = (nova as { id: string }).id;

      // 2. Garantia conforme a modalidade
      const meses = GARANTIA_MODALIDADES.find((m) => m.value === moto.modalidade)?.meses ?? 12;
      const fim = new Date(dataCompra + "T12:00:00");
      fim.setMonth(fim.getMonth() + meses);
      const { data: garRow } = await (supabase.from("garantias") as any).insert({
        scooter_id: scooterId,
        cliente_id: clienteId,
        modalidade: moto.modalidade,
        data_compra: dataCompra,
        data_inicio: dataCompra,
        data_fim: fim.toISOString().slice(0, 10),
        status: "ativa",
        criado_por: userId,
      }).select("id").single();

      // 3. Agenda de revisões — cliente legado não tem
      if (!legado) {
        const preventivas = gerarPreventivas(
          dataCompra, moto.modalidade, moto.primeira_gratuita, moto.modelo,
        ).map((p) => ({
          scooter_id: scooterId,
          cliente_id: clienteId,
          garantia_id: (garRow as { id?: string } | null)?.id ?? null,
          numero: p.numero,
          data_prevista: p.data_prevista,
          gratuita: p.gratuita,
          obrigatoria: p.obrigatoria,
          valor: p.valor,
          status: "pendente",
        }));
        if (preventivas.length > 0) {
          await (supabase.from("manutencoes_preventivas") as any).insert(preventivas);
        }
      }

      // 4. Venda, com a competência na data da compra
      await (supabase.from("vendas") as any).insert({
        vendedor_id: moto.vendedor_id || userId,
        cliente_id: clienteId,
        scooter_id: scooterId,
        valor_total: moto.valor ? parseFloat(moto.valor) : 0,
        entrada: 0,
        parcelas: moto.parcelas ? parseInt(moto.parcelas) : 1,
        forma_pagamento: moto.forma_pagamento || "pix",
        unidade: moto.unidade || null,
        modelo: moto.modelo,
        chassi: moto.chassi.trim(),
        data_venda: dataCompra,
        criado_por: userId,
      });

      // 5. Contratos do modelo — legado não recebe documento para assinar
      let contratosGerados = 0;
      if (!legado && moto.gerar_contratos) {
        const { data: modelos } = await supabase
          .from("modelos_contrato")
          .select("tipo, titulo, conteudo_template, modalidade")
          .in("tipo", ["compra_venda", "entrega", "desbloqueio"])
          .eq("ativo", true);

        const lista = (modelos ?? []) as {
          tipo: string; titulo: string; conteudo_template: string; modalidade: string | null;
        }[];
        const selecionados = lista.filter(
          (m) => m.tipo !== "compra_venda" || m.modalidade === moto.modalidade || m.modalidade == null,
        );
        const temEspecifico = selecionados.some(
          (m) => m.tipo === "compra_venda" && m.modalidade === moto.modalidade,
        );
        const docs = selecionados
          .filter((m) => !(temEspecifico && m.tipo === "compra_venda" && m.modalidade == null))
          .map((mod) => ({
            tipo: mod.tipo,
            titulo: mod.titulo,
            cliente_id: clienteId,
            scooter_id: scooterId,
            conteudo: aplicarVariaveis(mod.conteudo_template, {
              modelo: moto.modelo, marca: MOBYOU_MARCA, cor: moto.cor,
              ano: moto.ano, chassi: moto.chassi, numero_serie: moto.numero_serie,
            } as unknown as Scooter),
            status: "enviado" as const,
            criado_por: userId,
          }));
        if (docs.length > 0) {
          await (supabase.from("contratos") as any).insert(docs);
          contratosGerados = docs.length;
        }
      }

      toast.success("Moto adicionada ao cliente!", {
        description: legado
          ? "Venda anterior ao sistema: sem contrato para assinar e sem agenda de revisões."
          : `Garantia aberta${contratosGerados ? `, ${contratosGerados} contrato(s) gerado(s)` : ""} e revisões agendadas.`,
      });
      setMotoOpen(false);
      setMoto({ ...MOTO_VAZIA });
      loadData();
    } catch (err) {
      console.error("Erro ao adicionar moto:", err);
      toast.error("Erro inesperado ao adicionar a moto.");
    } finally {
      setSalvandoMoto(false);
    }
  }

  function aplicarVariaveis(template: string, scooter: Scooter | null) {
    let r = template;
    const c = cliente;
    if (c) {
      r = r.replace(/\{\{cliente_nome\}\}/g, c.nome || "");
      r = r.replace(/\{\{cliente_cpf\}\}/g, c.cpf || "");
      r = r.replace(/\{\{cliente_telefone\}\}/g, c.telefone || "");
      r = r.replace(/\{\{cliente_email\}\}/g, c.email || "");
      r = r.replace(/\{\{cliente_endereco\}\}/g, c.endereco || "");
    }
    if (scooter) {
      r = r.replace(/\{\{scooter_modelo\}\}/g, scooter.modelo || "");
      r = r.replace(/\{\{scooter_marca\}\}/g, scooter.marca || "");
      r = r.replace(/\{\{scooter_chassi\}\}/g, scooter.chassi || "");
      r = r.replace(/\{\{scooter_numero_serie\}\}/g, scooter.numero_serie || "");
      r = r.replace(/\{\{scooter_cor\}\}/g, scooter.cor || "");
      r = r.replace(/\{\{scooter_ano\}\}/g, String(scooter.ano ?? ""));
    }
    r = r.replace(/\{\{data_atual\}\}/g, new Date().toLocaleDateString("pt-BR"));
    r = r.replace(
      /\{\{data_extenso\}\}/g,
      new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );
    return r;
  }

  async function handleGerarDocumentos() {
    setGeneratingDocs(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { data: modelos } = await supabase
        .from("modelos_contrato")
        .select("*")
        .in("tipo", ["compra_venda", "entrega", "desbloqueio"])
        .eq("ativo", true);

      if (!modelos || modelos.length === 0) {
        toast.error("Nenhum modelo de documento encontrado. Rode o seed 005.");
        setGeneratingDocs(false);
        return;
      }

      const scooter = scooters[0] ?? null;
      const novos = (modelos as { tipo: string; titulo: string; conteudo_template: string }[]).map(
        (m) => ({
          tipo: m.tipo,
          titulo: m.titulo,
          cliente_id: clienteId,
          scooter_id: scooter?.id ?? null,
          conteudo: aplicarVariaveis(m.conteudo_template, scooter),
          status: "enviado" as const,
          criado_por: user?.id ?? null,
        })
      );

      const { error } = await (supabase.from("contratos") as any).insert(novos);
      if (error) throw error;

      toast.success(
        `${novos.length} documento(s) gerado(s) e enviado(s) para assinatura.`
      );
      loadData();
    } catch (err) {
      console.error("Erro ao gerar documentos:", err);
      toast.error("Erro ao gerar documentos");
    } finally {
      setGeneratingDocs(false);
    }
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
        <Button variant="ghost" size="sm" render={<Link href={`${basePath}/clientes`} />}>
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
              <div className="flex items-center gap-2">
              {podeTrocarAcesso && (
                <Dialog open={acessoOpen} onOpenChange={(v) => { setAcessoOpen(v); if (v) setNovoEmail(cliente.email ?? ""); }}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <KeyRound className="h-3 w-3 mr-1" />
                        Acesso
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Acesso do cliente</DialogTitle>
                      <DialogDescription>
                        Corrija o e-mail de login se ele foi cadastrado errado. O cliente passa a
                        entrar com o novo endereço imediatamente.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>E-mail de acesso</Label>
                        <Input
                          type="email"
                          value={novoEmail}
                          onChange={(e) => setNovoEmail(e.target.value)}
                          placeholder="nome@dominio.com"
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Atual: {cliente.email || "—"}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Nova senha (opcional)</Label>
                        <Input
                          type="text"
                          value={novaSenha}
                          onChange={(e) => setNovaSenha(e.target.value)}
                          placeholder="deixe em branco para manter a atual"
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAcessoOpen(false)} disabled={salvandoAcesso}>
                          Cancelar
                        </Button>
                        <Button onClick={salvarAcesso} disabled={salvandoAcesso}>
                          {salvandoAcesso && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                          Salvar acesso
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                {podeEditar && (
                  <DialogTrigger
                    render={
                      <Button variant="outline" size="sm">
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    }
                  />
                )}
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Editar Cliente</DialogTitle>
                    <DialogDescription>
                      Atualize os dados do cliente.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                    <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md p-2">
                      Alterar o e-mail aqui muda o cadastro, não o login do cliente.
                      Para trocar o acesso, use o botão <strong>Acesso</strong> (gestor).
                    </p>
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
              <TabsTrigger value="notas">
                <Receipt className="h-4 w-4 mr-1.5" />
                Notas Fiscais ({notasFiscais.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scooters">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <p className="text-sm text-muted-foreground">
                      {scooters.length === 0
                        ? "Nenhuma moto vinculada."
                        : scooters.length + " moto(s) deste cliente."}
                    </p>
                    <Dialog
                      open={motoOpen}
                      onOpenChange={(v) => {
                        setMotoOpen(v);
                        if (v) setMoto({ ...MOTO_VAZIA, vendedor_id: userId ?? "" });
                      }}
                    >
                      <DialogTrigger
                        render={
                          <Button size="sm">
                            <Bike className="h-4 w-4 mr-1.5" />
                            Adicionar moto
                          </Button>
                        }
                      />
                      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Nova moto para {cliente.nome}</DialogTitle>
                          <DialogDescription>
                            Cadastra a moto, abre a garantia e registra a venda. Sendo venda nova,
                            agenda as revisões e gera os contratos para assinatura.
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>Modelo</Label>
                              <Select
                                items={Object.fromEntries(MOBYOU_MODELOS.map((m) => [m, m]))}
                                value={moto.modelo}
                                onValueChange={(v) => setMotoField("modelo", v ?? "")}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione o modelo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MOBYOU_MODELOS.map((m) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label>Cor</Label>
                                <Input value={moto.cor} onChange={(e) => setMotoField("cor", e.target.value)} />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Ano</Label>
                                <Input type="number" value={moto.ano} onChange={(e) => setMotoField("ano", e.target.value)} />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>Chassi</Label>
                              <Input
                                value={moto.chassi}
                                onChange={(e) => setMotoField("chassi", e.target.value)}
                                placeholder="Número do chassi"
                                className="font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Nº de série (opcional)</Label>
                              <Input
                                value={moto.numero_serie}
                                onChange={(e) => setMotoField("numero_serie", e.target.value)}
                                placeholder="Repete o chassi se ficar vazio"
                                className="font-mono"
                              />
                            </div>
                          </div>

                          <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label>Data da compra</Label>
                                <Input
                                  type="date"
                                  value={moto.data_compra}
                                  onChange={(e) => setMotoField("data_compra", e.target.value)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label>Garantia</Label>
                                <Select
                                  items={Object.fromEntries(GARANTIA_MODALIDADES.map((m) => [m.value, m.label]))}
                                  value={moto.modalidade}
                                  onValueChange={(v) => setMotoField("modalidade", v ?? "1_ano")}
                                >
                                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {GARANTIA_MODALIDADES.map((m) => (
                                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {motoLegada ? (
                              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                                <strong>Venda anterior ao sistema.</strong> Não serão gerados contrato
                                para assinatura nem agenda de revisões, e não há preventiva gratuita.
                              </p>
                            ) : motoSemGratuita ? (
                              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                                <strong>Sem 1ª revisão gratuita.</strong> Para esta data de compra,
                                todas as revisões são pagas.
                              </p>
                            ) : (
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={moto.primeira_gratuita}
                                  onCheckedChange={(c) => setMotoField("primeira_gratuita", c === true)}
                                />
                                1ª manutenção preventiva gratuita
                              </label>
                            )}

                            {!motoLegada && (
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <Checkbox
                                  checked={moto.gerar_contratos}
                                  onCheckedChange={(c) => setMotoField("gerar_contratos", c === true)}
                                />
                                Gerar contratos para assinatura
                              </label>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <Label>Valor da venda (R$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={moto.valor}
                                onChange={(e) => setMotoField("valor", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Parcelas</Label>
                              <Input
                                type="number"
                                min="1"
                                value={moto.parcelas}
                                onChange={(e) => setMotoField("parcelas", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Forma de pagamento</Label>
                              <Select
                                value={moto.forma_pagamento}
                                onValueChange={(v) => setMotoField("forma_pagamento", v ?? "pix")}
                              >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pix">PIX</SelectItem>
                                  <SelectItem value="cartao">Cartão</SelectItem>
                                  <SelectItem value="boleto">Boleto</SelectItem>
                                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                                  <SelectItem value="financiamento">Financiamento</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label>Unidade (loja)</Label>
                              <Select
                                value={moto.unidade}
                                onValueChange={(v) => setMotoField("unidade", v ?? "")}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione a loja" />
                                </SelectTrigger>
                                <SelectContent>
                                  {UNIDADES_VENDA.map((u) => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label>Vendedor</Label>
                              <Select
                                items={Object.fromEntries(vendedores.map((v) => [v.id, v.nome]))}
                                value={moto.vendedor_id}
                                onValueChange={(v) => setMotoField("vendedor_id", v ?? "")}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Quem vendeu?" />
                                </SelectTrigger>
                                <SelectContent>
                                  {vendedores.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setMotoOpen(false)} disabled={salvandoMoto}>
                              Cancelar
                            </Button>
                            <Button onClick={criarMoto} disabled={salvandoMoto}>
                              {salvandoMoto && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                              Adicionar moto
                            </Button>
                          </DialogFooter>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

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
                          <TableHead>Cadastrada por</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scooters.map((scooter) => (
                          <TableRow key={scooter.id}>
                            <TableCell className="font-medium">
                              {linkarScooter ? (
                                <Link
                                  href={`${basePath}/scooters/${scooter.id}`}
                                  className="text-primary hover:underline"
                                >
                                  {scooter.modelo}
                                </Link>
                              ) : (
                                scooter.modelo
                              )}
                            </TableCell>
                            <TableCell>{scooter.marca}</TableCell>
                            <TableCell>{scooter.cor ?? "---"}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {scooter.chassi ?? "---"}
                            </TableCell>
                            <TableCell>{scooter.km_atual} km</TableCell>
                            <TableCell className="text-sm">
                              {scooter.criado_por ? (
                                <>
                                  {autores[scooter.criado_por] ?? "---"}
                                  <span className="block text-xs text-muted-foreground">
                                    {format(new Date(scooter.created_at), "dd/MM/yyyy HH:mm")}
                                  </span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">
                                  não registrado
                                </span>
                              )}
                            </TableCell>
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
                <CardContent className="pt-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      Gera o Contrato de Compra e Venda + 2 termos com os dados do
                      cliente{scooters.length > 0 ? " e da scooter" : ""} e envia
                      para o cliente assinar no app dele.
                    </p>
                    <Button
                      size="sm"
                      onClick={handleGerarDocumentos}
                      disabled={generatingDocs}
                    >
                      {generatingDocs ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <FilePlus2 className="h-4 w-4 mr-1.5" />
                      )}
                      Gerar documentos para assinatura
                    </Button>
                  </div>
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

            <TabsContent value="notas">
              <Card>
                <CardContent className="pt-4">
                  {notasFiscais.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma nota fiscal importada para este cliente.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº da nota</TableHead>
                          <TableHead>Data da compra</TableHead>
                          <TableHead>Motos</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Importada por</TableHead>
                          <TableHead>Arquivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notasFiscais.map((nf) => {
                          const numero = nf.dados_extraidos?.venda?.numero_nf;
                          const motos = nf.dados_extraidos?.scooters ?? [];
                          return (
                            <TableRow key={nf.id}>
                              <TableCell className="font-medium font-mono">
                                {numero || "---"}
                              </TableCell>
                              <TableCell>
                                {nf.data_compra
                                  ? format(new Date(nf.data_compra + "T12:00:00"), "dd/MM/yyyy")
                                  : "---"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {motos.length === 0 ? (
                                  "---"
                                ) : (
                                  <div className="space-y-0.5">
                                    {motos.map((m, i) => (
                                      <div key={i}>
                                        {m.modelo || "?"}
                                        {m.chassi && (
                                          <span className="text-muted-foreground font-mono text-xs">
                                            {" "}· {m.chassi}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {nf.valor != null
                                  ? "R$ " + nf.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                                  : "---"}
                                {nf.parcelas && nf.parcelas > 1 && (
                                  <span className="text-xs text-muted-foreground"> · {nf.parcelas}x</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {nf.importado_por ? autores[nf.importado_por] ?? "---" : "---"}
                                <span className="block text-xs text-muted-foreground">
                                  {format(new Date(nf.created_at), "dd/MM/yyyy HH:mm")}
                                </span>
                              </TableCell>
                              <TableCell>
                                {nf.storage_path ? (
                                  <Button
                                    variant="outline"
                                    size="xs"
                                    onClick={() => abrirNota(nf)}
                                    disabled={abrindoNota === nf.id}
                                  >
                                    {abrindoNota === nf.id ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <FileText className="h-3 w-3 mr-1" />
                                    )}
                                    Abrir {(nf.tipo_arquivo || "arquivo").toUpperCase()}
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    Sem arquivo
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
