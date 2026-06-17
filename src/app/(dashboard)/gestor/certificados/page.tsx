"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Award, Plus, Download, QrCode } from "lucide-react";

interface Certificado {
  id: string;
  servico_executado: string;
  data_servico: string;
  pdf_url: string | null;
  qr_code_data: string | null;
  created_at: string;
  cliente: { nome: string } | null;
  scooter: { modelo: string; chassi: string } | null;
  tecnico: { nome: string } | null;
}

interface OrdemFinalizada {
  id: string;
  numero: number;
  cliente: { nome: string } | null;
  scooter: { modelo: string; chassi: string } | null;
  tecnico: { nome: string } | null;
}

export default function CertificadosPage() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [ordensFinal, setOrdensFinal] = useState<OrdemFinalizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const supabase = createClient();
    const [certRes, ordensRes] = await Promise.all([
      supabase.from("certificados")
        .select("*, cliente:profiles!certificados_cliente_id_fkey(nome), scooter:scooters!certificados_scooter_id_fkey(modelo, chassi), tecnico:profiles!certificados_tecnico_id_fkey(nome)")
        .order("created_at", { ascending: false }),
      supabase.from("ordens_servico")
        .select("id, numero, cliente:profiles!ordens_servico_cliente_id_fkey(nome), scooter:scooters!ordens_servico_scooter_id_fkey(modelo, chassi), tecnico:profiles!ordens_servico_tecnico_id_fkey(nome)")
        .in("status", ["finalizado", "entregue"]),
    ]);

    if (certRes.data) setCertificados(certRes.data as unknown as Certificado[]);
    if (ordensRes.data) setOrdensFinal(ordensRes.data as unknown as OrdemFinalizada[]);
    setLoading(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOrdem) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const ordem = ordensFinal.find(o => o.id === selectedOrdem);
      if (!ordem) return;

      const qrData = JSON.stringify({
        tipo: "certificado_servico",
        os: ordem.numero,
        data: new Date().toISOString(),
        scooter: ordem.scooter?.chassi,
      });

      const { error } = await supabase.from("certificados").insert({
        ordem_id: ordem.id,
        cliente_id: undefined,
        scooter_id: undefined,
        tecnico_id: undefined,
        servico_executado: `Serviço OS #${ordem.numero}`,
        data_servico: new Date().toISOString(),
        qr_code_data: qrData,
      });

      if (error) {
        toast.error("Erro ao gerar certificado", { description: error.message });
        return;
      }

      toast.success("Certificado gerado!");
      setDialogOpen(false);
      setSelectedOrdem("");
      loadData();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Certificados</h1>
          <p className="text-muted-foreground">Certificados de serviço emitidos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Gerar Certificado</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Gerar Certificado de Serviço</DialogTitle></DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label>Ordem de Serviço Finalizada</Label>
                <Select value={selectedOrdem} onValueChange={setSelectedOrdem}>
                  <SelectTrigger><SelectValue placeholder="Selecione a OS" /></SelectTrigger>
                  <SelectContent>
                    {ordensFinal.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        OS #{o.numero} - {o.cliente?.nome} - {o.scooter?.modelo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={saving || !selectedOrdem}>
                {saving ? "Gerando..." : "Gerar Certificado"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Scooter</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificados.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    Nenhum certificado emitido
                  </TableCell></TableRow>
                ) : certificados.map(cert => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">{cert.servico_executado}</TableCell>
                    <TableCell>{cert.cliente?.nome}</TableCell>
                    <TableCell>{cert.scooter?.modelo} ({cert.scooter?.chassi})</TableCell>
                    <TableCell>{cert.tecnico?.nome}</TableCell>
                    <TableCell>{new Date(cert.data_servico).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {cert.pdf_url && (
                          <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
                          </a>
                        )}
                        {cert.qr_code_data && (
                          <Button variant="ghost" size="sm"><QrCode className="h-4 w-4" /></Button>
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
    </div>
  );
}
