"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Award, Plus, Download, QrCode, Eye, FileText, CheckCircle2, Printer } from "lucide-react";
import QRCode from "qrcode";

interface CertificadoRow {
  id: string;
  contrato_id: string;
  hash: string;
  qr_code_url: string | null;
  pdf_url: string | null;
  dados: Record<string, unknown>;
  created_at: string;
  contrato?: {
    titulo: string;
    tipo: string;
    numero: string;
    cliente?: { nome: string } | null;
    scooter?: { modelo: string; chassi: string | null } | null;
  } | null;
}

interface OrdemFinalizada {
  id: string;
  numero: string;
  status: string;
  descricao_problema: string | null;
  data_conclusao: string | null;
  cliente: { id: string; nome: string } | null;
  scooter: { id: string; modelo: string; marca: string; chassi: string | null } | null;
  tecnico: { id: string; nome: string } | null;
}

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<CertificadoRow[]>([]);
  const [ordensFinal, setOrdensFinal] = useState<OrdemFinalizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewCert, setPreviewCert] = useState<CertificadoRow | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();

    const [certRes, ordensRes] = await Promise.all([
      supabase
        .from("certificados")
        .select("*, contrato:contratos!contrato_id(titulo, tipo, numero, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi))")
        .order("created_at", { ascending: false }),
      supabase
        .from("ordens_servico")
        .select("id, numero, status, descricao_problema, data_conclusao, cliente:profiles!cliente_id(id, nome), scooter:scooters!scooter_id(id, modelo, marca, chassi), tecnico:profiles!tecnico_id(id, nome)")
        .in("status", ["finalizado", "entregue"]),
    ]);

    setCertificados((certRes.data ?? []) as unknown as CertificadoRow[]);
    setOrdensFinal((ordensRes.data ?? []) as unknown as OrdemFinalizada[]);
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrdem) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ordem = ordensFinal.find((o) => o.id === selectedOrdem);
      if (!ordem) return;

      // Create a contrato for the certificate if needed
      const contratoNumero = `CERT-${Date.now().toString(36).toUpperCase()}`;

      const { data: contratoData, error: contratoError } = await supabase
        .from("contratos")
        .insert({
          numero: contratoNumero,
          tipo: "garantia" as const,
          titulo: `Certificado de Servico - OS ${ordem.numero}`,
          conteudo: `<h1>Certificado de Servico</h1>
<p>Certificamos que o servico referente a Ordem de Servico <strong>#${ordem.numero}</strong> foi realizado com sucesso.</p>
<p><strong>Cliente:</strong> ${ordem.cliente?.nome || "N/A"}</p>
<p><strong>Scooter:</strong> ${ordem.scooter?.modelo || "N/A"} ${ordem.scooter?.marca || ""}</p>
<p><strong>Chassi:</strong> ${ordem.scooter?.chassi || "N/A"}</p>
<p><strong>Tecnico:</strong> ${ordem.tecnico?.nome || "N/A"}</p>
<p><strong>Data de Conclusao:</strong> ${ordem.data_conclusao ? new Date(ordem.data_conclusao).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}</p>
<p><strong>Descricao:</strong> ${ordem.descricao_problema || "Servico concluido"}</p>`,
          cliente_id: ordem.cliente?.id || user.id,
          scooter_id: ordem.scooter?.id || null,
          ordem_id: ordem.id,
          venda_id: null,
          status: "assinado" as const,
          valor: null,
          data_envio: null,
          data_visualizacao: null,
          data_assinatura: new Date().toISOString(),
          criado_por: user.id,
          modelo_id: null,
        })
        .select("id")
        .single();

      if (contratoError || !contratoData) {
        toast.error("Erro ao criar contrato do certificado", { description: contratoError?.message });
        setSaving(false);
        return;
      }

      // Generate hash
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(`${contratoData.id}-${Date.now()}-${ordem.numero}`)
          )
        )
      ).map((b) => b.toString(16).padStart(2, "0")).join("");

      // Generate QR code
      const qrData = JSON.stringify({
        tipo: "certificado_servico",
        hash: hash.slice(0, 16),
        os: ordem.numero,
        data: new Date().toISOString(),
        scooter: ordem.scooter?.chassi,
        cliente: ordem.cliente?.nome,
      });

      let qrCodeUrl: string | null = null;
      try {
        qrCodeUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 2 });
      } catch {
        // QR generation failed
      }

      const dados: Record<string, unknown> = {
        ordem_numero: ordem.numero,
        cliente_nome: ordem.cliente?.nome,
        scooter_modelo: ordem.scooter?.modelo,
        scooter_chassi: ordem.scooter?.chassi,
        tecnico_nome: ordem.tecnico?.nome,
        data_conclusao: ordem.data_conclusao,
        descricao: ordem.descricao_problema,
        gerado_por: user.id,
        gerado_em: new Date().toISOString(),
      };

      const { error } = await supabase.from("certificados").insert({
        contrato_id: contratoData.id,
        hash,
        qr_code_url: qrCodeUrl,
        pdf_url: null,
        dados,
      });

      if (error) {
        toast.error("Erro ao gerar certificado", { description: error.message });
        return;
      }

      toast.success("Certificado gerado com sucesso!");
      setDialogOpen(false);
      setSelectedOrdem("");
      loadData();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function openPreview(cert: CertificadoRow) {
    setPreviewCert(cert);

    // Generate QR code for preview
    if (cert.qr_code_url) {
      setQrCodeDataUrl(cert.qr_code_url);
    } else {
      try {
        const qrUrl = await QRCode.toDataURL(
          JSON.stringify({ hash: cert.hash.slice(0, 16), id: cert.id }),
          { width: 200, margin: 2 }
        );
        setQrCodeDataUrl(qrUrl);
      } catch {
        setQrCodeDataUrl("");
      }
    }

    setPreviewOpen(true);
  }

  function handlePrint() {
    if (!previewRef.current || !previewCert) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Certificado - ${previewCert.hash.slice(0, 8).toUpperCase()}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; }
              .header h1 { font-size: 24px; margin-bottom: 5px; }
              .field { margin: 10px 0; }
              .field label { font-weight: bold; }
              .qr { text-align: center; margin-top: 30px; }
              .hash { text-align: center; font-family: monospace; font-size: 12px; color: #666; margin-top: 10px; }
              .footer { text-align: center; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #999; }
            </style>
          </head>
          <body>
            ${previewRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Certificados</h1>
          <p className="text-muted-foreground">
            Gerencie certificados de servico e garantia.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Gerar Certificado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gerar Certificado de Servico</DialogTitle>
              <DialogDescription>
                Selecione uma OS finalizada para gerar o certificado.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Ordem de Servico Finalizada</Label>
                <Select value={selectedOrdem} onValueChange={setSelectedOrdem}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a OS" />
                  </SelectTrigger>
                  <SelectContent>
                    {ordensFinal.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma OS finalizada</SelectItem>
                    ) : (
                      ordensFinal.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          OS #{o.numero} - {o.cliente?.nome ?? "---"} - {o.scooter?.modelo ?? "---"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrdem && (() => {
                const ordem = ordensFinal.find((o) => o.id === selectedOrdem);
                if (!ordem) return null;
                return (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">{ordem.cliente?.nome ?? "---"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Scooter:</span>
                        <span className="font-medium">{ordem.scooter?.modelo ?? "---"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tecnico:</span>
                        <span className="font-medium">{ordem.tecnico?.nome ?? "---"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {ordem.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <DialogFooter>
                <Button type="submit" disabled={saving || !selectedOrdem}>
                  {saving ? "Gerando..." : "Gerar Certificado"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Certificates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certificados Emitidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : certificados.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum certificado emitido</p>
              <p className="text-sm text-muted-foreground mt-1">
                Gere certificados a partir de ordens de servico finalizadas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hash</TableHead>
                  <TableHead>Titulo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Scooter</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>QR Code</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificados.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-xs">
                      {cert.hash.slice(0, 12).toUpperCase()}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {cert.contrato?.titulo ?? (cert.dados.ordem_numero ? `OS #${cert.dados.ordem_numero}` : "Certificado")}
                    </TableCell>
                    <TableCell>
                      {cert.contrato?.cliente?.nome ?? (cert.dados.cliente_nome as string) ?? "---"}
                    </TableCell>
                    <TableCell>
                      {cert.contrato?.scooter?.modelo ?? (cert.dados.scooter_modelo as string) ?? "---"}
                    </TableCell>
                    <TableCell>{formatDate(cert.created_at)}</TableCell>
                    <TableCell>
                      {cert.qr_code_url ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <QrCode className="h-3 w-3 mr-1" />
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">Nao</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openPreview(cert)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {cert.pdf_url && (
                          <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon-sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Certificado de Servico
            </DialogTitle>
          </DialogHeader>

          {previewCert && (
            <div ref={previewRef}>
              <div className="border rounded-xl p-8 bg-white space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                      <Award className="h-8 w-8 text-amber-600" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold">Certificado de Servico</h1>
                  <p className="text-sm text-muted-foreground">MOBYOU E-Scooter Management</p>
                </div>

                <Separator />

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Cliente</p>
                    <p className="font-medium">
                      {previewCert.contrato?.cliente?.nome ?? (previewCert.dados.cliente_nome as string) ?? "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Scooter</p>
                    <p className="font-medium">
                      {previewCert.contrato?.scooter?.modelo ?? (previewCert.dados.scooter_modelo as string) ?? "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Chassi</p>
                    <p className="font-mono text-sm">
                      {previewCert.contrato?.scooter?.chassi ?? (previewCert.dados.scooter_chassi as string) ?? "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Tecnico</p>
                    <p className="font-medium">
                      {(previewCert.dados.tecnico_nome as string) ?? "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">OS</p>
                    <p className="font-medium">
                      #{(previewCert.dados.ordem_numero as string) ?? previewCert.contrato?.numero ?? "---"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">Data</p>
                    <p className="font-medium">{formatDate(previewCert.created_at)}</p>
                  </div>
                </div>

                {previewCert.dados.descricao && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Descricao do Servico</p>
                      <p className="text-sm">{previewCert.dados.descricao as string}</p>
                    </div>
                  </>
                )}

                <Separator />

                {/* QR Code & Verification */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Codigo de Verificacao</p>
                    <p className="font-mono text-sm font-bold">{previewCert.hash.slice(0, 16).toUpperCase()}</p>
                    <div className="flex items-center gap-1 mt-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Certificado Valido</span>
                    </div>
                  </div>
                  {qrCodeDataUrl && (
                    <div className="text-center">
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="w-32 h-32 border rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Escaneie para verificar</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-muted-foreground border-t pt-4">
                  <p>Emitido em {formatDate(previewCert.created_at)} | MOBYOU</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir / PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
