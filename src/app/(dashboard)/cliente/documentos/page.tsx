"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { FileText, Award, ShieldCheck, Download, ExternalLink } from "lucide-react";

interface Contrato {
  id: string;
  tipo: string;
  titulo: string;
  status: string;
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
  entrega: "Entrega",
  desbloqueio: "Desbloqueio",
  personalizado: "Personalizado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  enviado: "bg-blue-100 text-blue-800",
  visualizado: "bg-amber-100 text-amber-800",
  assinado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function ClienteDocumentosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [contratosRes, certificadosRes, garantiasRes] = await Promise.all([
        supabase.from("contratos").select("id, tipo, titulo, status, pdf_url, created_at")
          .eq("cliente_id", user.id).order("created_at", { ascending: false }),
        supabase.from("certificados").select("id, servico_executado, data_servico, pdf_url, qr_code_data")
          .eq("cliente_id", user.id).order("created_at", { ascending: false }),
        supabase.from("garantias")
          .select("id, status, data_inicio, data_fim, scooter:scooters!garantias_scooter_id_fkey(modelo, chassi)")
          .eq("cliente_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (contratosRes.data) setContratos(contratosRes.data);
      if (certificadosRes.data) setCertificados(certificadosRes.data);
      if (garantiasRes.data) setGarantias(garantiasRes.data as unknown as Garantia[]);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Meus Documentos</h1>
        <p className="text-muted-foreground">Contratos, certificados e garantias</p>
      </div>

      <Tabs defaultValue="contratos">
        <TabsList>
          <TabsTrigger value="contratos" className="gap-1"><FileText className="h-4 w-4" />Contratos</TabsTrigger>
          <TabsTrigger value="certificados" className="gap-1"><Award className="h-4 w-4" />Certificados</TabsTrigger>
          <TabsTrigger value="garantias" className="gap-1"><ShieldCheck className="h-4 w-4" />Garantias</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-3 mt-4">
          {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />) :
            contratos.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum contrato encontrado</CardContent></Card>
            ) : contratos.map(c => (
              <Card key={c.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-medium">{c.titulo}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{CONTRATO_TIPO_LABELS[c.tipo] || c.tipo}</span>
                        <Badge className={STATUS_COLORS[c.status]}>{c.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                    {c.pdf_url && (
                      <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>

        <TabsContent value="certificados" className="space-y-3 mt-4">
          {loading ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />) :
            certificados.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum certificado encontrado</CardContent></Card>
            ) : certificados.map(c => (
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
                      <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" />PDF</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>

        <TabsContent value="garantias" className="space-y-3 mt-4">
          {loading ? [...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />) :
            garantias.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma garantia encontrada</CardContent></Card>
            ) : garantias.map(g => (
              <Card key={g.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className={`h-8 w-8 ${g.status === "ativa" ? "text-emerald-500" : "text-muted-foreground"}`} />
                      <div>
                        <h3 className="font-medium">{g.scooter?.modelo}</h3>
                        <p className="text-sm text-muted-foreground">Chassi: {g.scooter?.chassi}</p>
                      </div>
                    </div>
                    <Badge variant={g.status === "ativa" ? "default" : "secondary"}>
                      {g.status === "ativa" ? "Ativa" : g.status === "expirada" ? "Expirada" : "Cancelada"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                    <span>Início: {new Date(g.data_inicio).toLocaleDateString("pt-BR")}</span>
                    <span>Fim: {new Date(g.data_fim).toLocaleDateString("pt-BR")}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>
      </Tabs>
    </div>
  );
}
