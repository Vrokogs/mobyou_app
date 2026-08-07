"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { SignaturePad } from "@/components/ui/signature-pad";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  Award,
  ShieldCheck,
  Download,
  PenLine,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface Contrato {
  id: string;
  tipo: string;
  titulo: string;
  status: string;
  conteudo: string | null;
  pdf_url: string | null;
  created_at: string;
}

interface Certificado {
  id: string;
  servico_executado: string;
  data_servico: string;
  pdf_url: string | null;
  qr_code_data: string | null;
}

interface Garantia {
  id: string;
  status: string;
  data_inicio: string;
  data_fim: string;
  scooter: { modelo: string; chassi: string } | null;
}

const CONTRATO_TIPO_LABELS: Record<string, string> = {
  compra_venda: "Compra e Venda",
  garantia: "Garantia",
  entrega: "Vistoria e Retirada",
  desbloqueio: "Responsabilidade / Desbloqueio",
  personalizado: "Personalizado",
};

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Aguardando assinatura",
  visualizado: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  enviado: "bg-amber-100 text-amber-800",
  visualizado: "bg-amber-100 text-amber-800",
  assinado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function ClienteDocumentosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userNome, setUserNome] = useState("");

  // signing dialog
  const [activeContrato, setActiveContrato] = useState<Contrato | null>(null);
  const [confirmNome, setConfirmNome] = useState("");
  const [signing, setSigning] = useState(false);
  const [assinaturaImg, setAssinaturaImg] = useState<string | null>(null);
  const [rubricaImg, setRubricaImg] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [perfilRes, contratosRes, certificadosRes, garantiasRes] =
      await Promise.all([
        supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle(),
        supabase
          .from("contratos")
          .select("id, tipo, titulo, status, conteudo, pdf_url, created_at")
          .eq("cliente_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("certificados")
          .select("id, servico_executado, data_servico, pdf_url, qr_code_data")
          .eq("cliente_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("garantias")
          .select(
            "id, status, data_inicio, data_fim, scooter:scooters!garantias_scooter_id_fkey(modelo, chassi)"
          )
          .eq("cliente_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    const nome = (perfilRes.data as { nome?: string } | null)?.nome ?? "";
    setUserNome(nome);
    if (contratosRes.data) setContratos(contratosRes.data as unknown as Contrato[]);
    if (certificadosRes.data) setCertificados(certificadosRes.data as unknown as Certificado[]);
    if (garantiasRes.data) setGarantias(garantiasRes.data as unknown as Garantia[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openSign(c: Contrato) {
    setActiveContrato(c);
    setConfirmNome(userNome);
    setAssinaturaImg(null);
    setRubricaImg(null);
    setConsent(false);
  }

  async function handleSign() {
    if (!activeContrato || !userId) return;
    if (confirmNome.trim().length < 3) {
      toast.error("Digite seu nome completo para assinar.");
      return;
    }
    if (!assinaturaImg) {
      toast.error("Desenhe sua assinatura no campo indicado.");
      return;
    }
    if (!consent) {
      toast.error("Marque o aceite para assinar.");
      return;
    }
    setSigning(true);
    try {
      const res = await fetch("/api/assinar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato_id: activeContrato.id,
          assinatura_imagem: assinaturaImg,
          rubrica_imagem: rubricaImg,
          nome: confirmNome.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error("Erro ao assinar", { description: json.error });
        return;
      }

      toast.success("Documento assinado com sucesso!");
      setActiveContrato(null);
      setConfirmNome("");
      setAssinaturaImg(null);
      setRubricaImg(null);
      setConsent(false);
      await load();
    } catch (err) {
      console.error("Erro ao assinar:", err);
      toast.error("Erro ao assinar o documento");
    } finally {
      setSigning(false);
    }
  }

  const pendentes = contratos.filter(
    (c) => c.status === "enviado" || c.status === "visualizado"
  ).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Meus Documentos</h1>
        <p className="text-muted-foreground">
          Contratos, certificados e garantias
        </p>
      </div>

      {pendentes > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardContent className="flex items-center gap-3 p-4">
            <PenLine className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800">
              Você tem <strong>{pendentes}</strong> documento(s) aguardando sua
              assinatura.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="contratos">
        <TabsList>
          <TabsTrigger value="contratos" className="gap-1">
            <FileText className="h-4 w-4" />
            Contratos
          </TabsTrigger>
          <TabsTrigger value="certificados" className="gap-1">
            <Award className="h-4 w-4" />
            Certificados
          </TabsTrigger>
          <TabsTrigger value="garantias" className="gap-1">
            <ShieldCheck className="h-4 w-4" />
            Garantias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-3 mt-4">
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : contratos.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum contrato encontrado
              </CardContent>
            </Card>
          ) : (
            contratos.map((c) => {
              const assinado = c.status === "assinado";
              const podeAssinar =
                c.status === "enviado" || c.status === "visualizado";
              return (
                <Card key={c.id}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary shrink-0" />
                      <div>
                        <h3 className="font-medium">{c.titulo}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {CONTRATO_TIPO_LABELS[c.tipo] || c.tipo}
                          </span>
                          <Badge className={STATUS_COLORS[c.status]}>
                            {STATUS_LABELS[c.status] || c.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {podeAssinar ? (
                        <Button size="sm" onClick={() => openSign(c)}>
                          <PenLine className="h-4 w-4 mr-1" />
                          Revisar e assinar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveContrato(c)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      )}
                      {assinado && c.pdf_url && (
                        <a
                          href={c.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="certificados" className="space-y-3 mt-4">
          {loading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : certificados.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum certificado encontrado
              </CardContent>
            </Card>
          ) : (
            certificados.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Award className="h-8 w-8 text-amber-500" />
                    <div>
                      <h3 className="font-medium">{c.servico_executado}</h3>
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.data_servico).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="garantias" className="space-y-3 mt-4">
          {loading ? (
            [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
          ) : garantias.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma garantia encontrada
              </CardContent>
            </Card>
          ) : (
            garantias.map((g) => (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck
                        className={`h-8 w-8 ${
                          g.status === "ativa"
                            ? "text-emerald-500"
                            : "text-muted-foreground"
                        }`}
                      />
                      <div>
                        <h3 className="font-medium">{g.scooter?.modelo}</h3>
                        <p className="text-sm text-muted-foreground">
                          Chassi: {g.scooter?.chassi}
                        </p>
                      </div>
                    </div>
                    <Badge variant={g.status === "ativa" ? "default" : "secondary"}>
                      {g.status === "ativa"
                        ? "Ativa"
                        : g.status === "expirada"
                          ? "Expirada"
                          : "Cancelada"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                    <span>
                      Início:{" "}
                      {new Date(g.data_inicio).toLocaleDateString("pt-BR")}
                    </span>
                    <span>
                      Fim: {new Date(g.data_fim).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">Cobertura (1 ano):</span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Bateria</Badge>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Módulo</Badge>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Motor</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog de revisao / assinatura */}
      <Dialog
        open={!!activeContrato}
        onOpenChange={(open) => !open && setActiveContrato(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{activeContrato?.titulo}</DialogTitle>
            <DialogDescription>
              {activeContrato &&
                (CONTRATO_TIPO_LABELS[activeContrato.tipo] ||
                  activeContrato.tipo)}
            </DialogDescription>
          </DialogHeader>

          <div
            className="prose prose-sm max-w-none overflow-y-auto rounded-md border bg-muted/30 p-4 text-sm flex-1"
            dangerouslySetInnerHTML={{
              __html:
                activeContrato?.conteudo ||
                "<p>Conteúdo do documento indisponível.</p>",
            }}
          />

          {activeContrato?.status === "assinado" ? (
            <div className="flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle2 className="h-5 w-5" />
              Documento já assinado.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Confirme seu nome completo
                </Label>
                <Input
                  value={confirmNome}
                  onChange={(e) => setConfirmNome(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <SignaturePad
                    label="Assinatura"
                    onChange={setAssinaturaImg}
                    height={150}
                  />
                </div>
                <div>
                  <SignaturePad
                    label="Rubrica"
                    onChange={setRubricaImg}
                    height={150}
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-[12px] text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <span>
                  Declaro que li, compreendi e concordo com o conteúdo deste
                  documento, assinando-o eletronicamente de forma livre. A
                  assinatura é registrada com <strong>data, hora, IP e hash de
                  integridade</strong> (MP 2.200-2/2001).
                </span>
              </label>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setActiveContrato(null)}
                  disabled={signing}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSign} disabled={signing}>
                  {signing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <PenLine className="h-4 w-4 mr-1.5" />
                  )}
                  Assinar documento
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
