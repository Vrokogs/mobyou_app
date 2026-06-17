"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Award, Plus, Eye, CheckCircle2, Wrench } from "lucide-react";

interface Certificado {
  id: string;
  ordem_id: string | null;
  cliente_id: string | null;
  scooter_id: string | null;
  tecnico_id: string | null;
  servico_executado: string;
  data_servico: string;
  pdf_url: string | null;
  qr_code_data: string | null;
  created_at: string;
  cliente?: { nome: string } | null;
  scooter?: { modelo: string; chassi: string | null } | null;
  tecnico?: { nome: string } | null;
}

interface OrdemFinalizada {
  id: string;
  numero: number;
  status: string;
  cliente: { id: string; nome: string } | null;
  scooter: { id: string; modelo: string; chassi: string | null } | null;
  tecnico: { id: string; nome: string } | null;
}

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [ordensFinal, setOrdensFinal] = useState<OrdemFinalizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState("");
  const [servicoExecutado, setServicoExecutado] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewCert, setPreviewCert] = useState<Certificado | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();

    const [certRes, ordensRes] = await Promise.all([
      supabase
        .from("certificados")
        .select("*, cliente:profiles!cliente_id(nome), scooter:scooters!scooter_id(modelo, chassi), tecnico:profiles!tecnico_id(nome)")
        .order("created_at", { ascending: false }),
      supabase
        .from("ordens_servico")
        .select("id, numero, status, cliente:profiles!ordens_servico_cliente_id_fkey(id, nome), scooter:scooters!ordens_servico_scooter_id_fkey(id, modelo, chassi), tecnico:profiles!ordens_servico_tecnico_id_fkey(id, nome)")
        .in("status", ["finalizado", "entregue"]),
    ]);

    setCertificados((certRes.data ?? []) as unknown as Certificado[]);
    setOrdensFinal((ordensRes.data ?? []) as unknown as OrdemFinalizada[]);
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrdem || !servicoExecutado.trim()) {
      toast.error("Selecione a OS e descreva o servico executado");
      return;
    }
    setSaving(true);

    try {
      const supabase = createClient();
      const ordem = ordensFinal.find((o) => o.id === selectedOrdem);
      if (!ordem) return;

      const { error } = await supabase.from("certificados").insert({
        ordem_id: ordem.id,
        cliente_id: ordem.cliente?.id ?? null,
        scooter_id: ordem.scooter?.id ?? null,
        tecnico_id: ordem.tecnico?.id ?? null,
        servico_executado: servicoExecutado,
        data_servico: new Date().toISOString().split("T")[0],
        pdf_url: null,
        qr_code_data: JSON.stringify({
          tipo: "certificado_servico",
          os: ordem.numero,
          data: new Date().toISOString(),
          chassi: ordem.scooter?.chassi,
          cliente: ordem.cliente?.nome,
        }),
      });

      if (error) {
        toast.error("Erro ao gerar certificado", { description: error.message });
        return;
      }

      toast.success("Certificado gerado com sucesso!");
      setDialogOpen(false);
      setSelectedOrdem("");
      setServicoExecutado("");
      loadData();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
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
          <p className="text-muted-foreground">Gerencie certificados de servico.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" />Gerar Certificado</Button>} />
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
                <Select value={selectedOrdem} onValueChange={(v) => setSelectedOrdem(v ?? "")}>
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

              <div className="space-y-2">
                <Label>Descricao do Servico Executado</Label>
                <Textarea
                  placeholder="Descreva o servico realizado..."
                  value={servicoExecutado}
                  onChange={(e) => setServicoExecutado(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="submit" disabled={saving || !selectedOrdem}>
                  {saving ? "Gerando..." : "Gerar Certificado"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Scooter</TableHead>
                  <TableHead>Tecnico</TableHead>
                  <TableHead>Servico</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificados.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">
                      {cert.cliente?.nome ?? "---"}
                    </TableCell>
                    <TableCell>
                      {cert.scooter?.modelo ?? "---"}
                      {cert.scooter?.chassi && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({cert.scooter.chassi})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{cert.tecnico?.nome ?? "---"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {cert.servico_executado}
                    </TableCell>
                    <TableCell>{formatDate(cert.data_servico)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setPreviewCert(cert); setPreviewOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Certificado de Servico
            </DialogTitle>
          </DialogHeader>

          {previewCert && (
            <div className="border rounded-xl p-6 bg-white space-y-4">
              <div className="text-center space-y-2">
                <div className="flex justify-center">
                  <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                    <Wrench className="h-7 w-7 text-amber-600" />
                  </div>
                </div>
                <h1 className="text-xl font-bold">Certificado de Servico</h1>
                <p className="text-xs text-muted-foreground">MOBYOU LITORAL NORTE</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Cliente</p>
                  <p className="font-medium">{previewCert.cliente?.nome ?? "---"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Scooter</p>
                  <p className="font-medium">{previewCert.scooter?.modelo ?? "---"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Chassi</p>
                  <p className="font-mono text-sm">{previewCert.scooter?.chassi ?? "---"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Tecnico</p>
                  <p className="font-medium">{previewCert.tecnico?.nome ?? "---"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">Data do Servico</p>
                  <p className="font-medium">{formatDate(previewCert.data_servico)}</p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Servico Executado</p>
                <p className="text-sm">{previewCert.servico_executado}</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Certificado Valido</span>
              </div>

              <div className="text-center text-xs text-muted-foreground border-t pt-3">
                <p>Emitido em {formatDate(previewCert.created_at)} | MOBYOU</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
