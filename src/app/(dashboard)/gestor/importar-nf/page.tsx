"use client";

import { useEffect, useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Upload, FileText, CheckCircle2, AlertCircle, Loader2, X,
} from "lucide-react";
import { toast } from "sonner";
import type { NotaFiscal } from "@/types/database";

interface ExtractedData {
  cliente: {
    nome: string;
    cpf: string;
    telefone: string;
    email: string;
    endereco: string;
  };
  scooter: {
    modelo: string;
    marca: string;
    cor: string;
    numero_serie: string;
    chassi: string;
    ano: string;
  };
  venda: {
    valor: string;
    parcelas: string;
    data_compra: string;
    numero_nf: string;
  };
}

const EMPTY_DATA: ExtractedData = {
  cliente: { nome: "", cpf: "", telefone: "", email: "", endereco: "" },
  scooter: { modelo: "", marca: "", cor: "", numero_serie: "", chassi: "", ano: "" },
  venda: { valor: "", parcelas: "1", data_compra: new Date().toISOString().slice(0, 10), numero_nf: "" },
};

function parseNFeXml(xmlText: string): ExtractedData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const data: ExtractedData = JSON.parse(JSON.stringify(EMPTY_DATA));

  try {
    // Destinatario (cliente)
    const dest = doc.querySelector("dest");
    if (dest) {
      data.cliente.nome = dest.querySelector("xNome")?.textContent || "";
      data.cliente.cpf = dest.querySelector("CPF")?.textContent || dest.querySelector("CNPJ")?.textContent || "";
      const fone = dest.querySelector("fone")?.textContent;
      if (fone) data.cliente.telefone = fone;
      data.cliente.email = dest.querySelector("email")?.textContent || "";

      const enderDest = dest.querySelector("enderDest");
      if (enderDest) {
        const xLgr = enderDest.querySelector("xLgr")?.textContent || "";
        const nro = enderDest.querySelector("nro")?.textContent || "";
        const xBairro = enderDest.querySelector("xBairro")?.textContent || "";
        const xMun = enderDest.querySelector("xMun")?.textContent || "";
        const UF = enderDest.querySelector("UF")?.textContent || "";
        data.cliente.endereco = `${xLgr}, ${nro} - ${xBairro}, ${xMun}/${UF}`;
      }
    }

    // Produto (scooter)
    const det = doc.querySelector("det");
    if (det) {
      const prod = det.querySelector("prod");
      if (prod) {
        const xProd = prod.querySelector("xProd")?.textContent || "";
        data.scooter.modelo = xProd;
        data.venda.valor = prod.querySelector("vProd")?.textContent || "";
      }
    }

    // NF number
    const ide = doc.querySelector("ide");
    if (ide) {
      data.venda.numero_nf = ide.querySelector("nNF")?.textContent || "";
      const dhEmi = ide.querySelector("dhEmi")?.textContent;
      if (dhEmi) {
        data.venda.data_compra = dhEmi.slice(0, 10);
      }
    }

    // Total
    const ICMSTot = doc.querySelector("ICMSTot");
    if (ICMSTot) {
      const vNF = ICMSTot.querySelector("vNF")?.textContent;
      if (vNF) data.venda.valor = vNF;
    }
  } catch {
    // Parsing failed, return what we have
  }

  return data;
}

export default function ImportarNFPage() {
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [historico, setHistorico] = useState<(NotaFiscal & { cliente?: { nome: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistorico = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notas_fiscais")
      .select("*, cliente:profiles!cliente_id(nome)")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistorico((data ?? []) as (NotaFiscal & { cliente?: { nome: string } | null })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setImported(false);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xml") {
      setFileType("xml");
      const text = await file.text();
      const data = parseNFeXml(text);
      setExtractedData(data);
      toast.success("Dados extraidos do XML!");
    } else if (ext === "pdf") {
      setFileType("pdf");
      setExtractedData(JSON.parse(JSON.stringify(EMPTY_DATA)));
      toast.info("PDF carregado. Preencha os dados manualmente.");
    } else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      setFileType("image");
      setExtractedData(JSON.parse(JSON.stringify(EMPTY_DATA)));
      toast.info("Imagem carregada. Preencha os dados manualmente.");
    } else {
      toast.error("Formato nao suportado. Use XML, PDF ou imagem.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/xml": [".xml"],
      "application/xml": [".xml"],
      "application/pdf": [".pdf"],
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
    },
    maxFiles: 1,
  });

  function updateData(section: keyof ExtractedData, field: string, value: string) {
    if (!extractedData) return;
    setExtractedData({
      ...extractedData,
      [section]: { ...extractedData[section], [field]: value },
    });
  }

  async function handleImportar() {
    if (!extractedData) return;
    const { cliente, scooter, venda } = extractedData;

    if (!cliente.nome || !cliente.cpf) {
      toast.error("Nome e CPF do cliente sao obrigatorios");
      return;
    }

    setImporting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Create or find cliente profile
      const { data: existingCliente } = await (supabase
        .from("profiles") as any)
        .select("id")
        .eq("cpf", cliente.cpf.replace(/\D/g, ""))
        .single();

      let clienteId: string;

      if (existingCliente) {
        clienteId = (existingCliente as any).id;
        // Update existing
        await (supabase.from("profiles") as any).update({
          nome: cliente.nome,
          telefone: cliente.telefone || null,
          email: cliente.email || null,
          endereco: cliente.endereco || null,
        }).eq("id", clienteId);
      } else {
        clienteId = crypto.randomUUID();
        const { error: profileError } = await (supabase.from("profiles") as any).insert({
          id: clienteId,
          email: cliente.email || `${cliente.cpf.replace(/\D/g, "")}@placeholder.com`,
          nome: cliente.nome,
          cpf: cliente.cpf.replace(/\D/g, ""),
          telefone: cliente.telefone || null,
          endereco: cliente.endereco || null,
          role: "cliente" as const,
          ativo: true,
          avatar_url: null,
          cidade: null,
          estado: null,
          cep: null,
        });

        if (profileError) {
          toast.error("Erro ao criar cliente", { description: profileError.message });
          setImporting(false);
          return;
        }
      }

      // 2. Create scooter
      let scooterId: string | null = null;
      if (scooter.modelo || scooter.chassi) {
        const { data: scooterData, error: scooterError } = await (supabase.from("scooters") as any).insert({
          modelo: scooter.modelo || "Nao informado",
          marca: scooter.marca || "Nao informado",
          cor: scooter.cor || null,
          numero_serie: scooter.numero_serie || null,
          chassi: scooter.chassi || null,
          ano: scooter.ano ? parseInt(scooter.ano) : null,
          proprietario_id: clienteId,
          km_atual: 0,
          status: "ativo",
          placa: null,
          motor_numero: null,
          bateria_numero: null,
          foto_url: null,
          observacoes: null,
        }).select("id").single();

        if (scooterError) {
          toast.error("Erro ao criar scooter", { description: scooterError.message });
          setImporting(false);
          return;
        }
        scooterId = (scooterData as any).id;

        // 3. Create garantia (1 year)
        const dataInicio = venda.data_compra || new Date().toISOString().slice(0, 10);
        const dataFim = new Date(dataInicio);
        dataFim.setFullYear(dataFim.getFullYear() + 1);

        await (supabase.from("garantias") as any).insert({
          scooter_id: scooterId,
          cliente_id: clienteId,
          tipo: "fabrica",
          descricao: "Garantia de fabrica - 1 ano",
          data_inicio: dataInicio,
          data_fim: dataFim.toISOString().slice(0, 10),
          km_limite: null,
          status: "ativa",
          termos: null,
        });
      }

      // 4. Create contrato de compra e venda
      const contratoNumero = `CTR-${Date.now().toString(36).toUpperCase()}`;
      await (supabase.from("contratos") as any).insert({
        numero: contratoNumero,
        tipo: "compra_venda" as const,
        titulo: `Compra e Venda - ${cliente.nome}`,
        conteudo: `<h2>Contrato de Compra e Venda</h2>
<p>Contrato gerado automaticamente a partir da importacao da NF ${venda.numero_nf || ""}.</p>
<p><strong>Cliente:</strong> ${cliente.nome}</p>
<p><strong>CPF:</strong> ${cliente.cpf}</p>
<p><strong>Scooter:</strong> ${scooter.modelo} ${scooter.marca}</p>
<p><strong>Chassi:</strong> ${scooter.chassi || "N/A"}</p>
<p><strong>Valor:</strong> R$ ${venda.valor || "0,00"}</p>
<p><strong>Data da Compra:</strong> ${venda.data_compra ? new Date(venda.data_compra).toLocaleDateString("pt-BR") : "N/A"}</p>`,
        cliente_id: clienteId,
        scooter_id: scooterId,
        ordem_id: null,
        venda_id: null,
        status: "rascunho" as const,
        valor: venda.valor ? parseFloat(venda.valor) : null,
        data_envio: null,
        data_visualizacao: null,
        data_assinatura: null,
        criado_por: user.id,
        modelo_id: null,
      });

      // 5. Create nota fiscal record
      await (supabase.from("notas_fiscais") as any).insert({
        numero: venda.numero_nf || `NF-${Date.now()}`,
        ordem_id: null,
        venda_id: null,
        cliente_id: clienteId,
        tipo: "entrada",
        valor: venda.valor ? parseFloat(venda.valor) : 0,
        impostos: null,
        pdf_url: null,
        xml_url: null,
        status: "importada",
        emitida_em: venda.data_compra || null,
      });

      toast.success("Importacao concluida com sucesso!", {
        description: "Cliente, scooter, garantia e contrato foram criados.",
      });
      setImported(true);
      loadHistorico();
    } catch {
      toast.error("Erro inesperado durante a importacao");
    } finally {
      setImporting(false);
    }
  }

  function clearUpload() {
    setExtractedData(null);
    setFileName("");
    setFileType("");
    setImported(false);
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Nota Fiscal</h1>
        <p className="text-muted-foreground">
          Importe dados de notas fiscais para cadastro automatico.
        </p>
      </div>

      {/* Upload Area */}
      {!extractedData ? (
        <Card>
          <CardContent className="pt-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/30 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {isDragActive ? "Solte o arquivo aqui..." : "Arraste um arquivo ou clique para selecionar"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Formatos aceitos: XML (NF-e), PDF, Imagens (JPG, PNG)
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* File Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{fileName}</p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {fileType === "xml" ? "XML - Dados extraidos automaticamente" : `${fileType.toUpperCase()} - Preenchimento manual`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={clearUpload}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {imported && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  <p className="font-medium">Dados importados com sucesso!</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extracted Data Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={extractedData.cliente.nome}
                    onChange={(e) => updateData("cliente", "nome", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPF/CNPJ</Label>
                  <Input
                    value={extractedData.cliente.cpf}
                    onChange={(e) => updateData("cliente", "cpf", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Telefone</Label>
                  <Input
                    value={extractedData.cliente.telefone}
                    onChange={(e) => updateData("cliente", "telefone", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    value={extractedData.cliente.email}
                    onChange={(e) => updateData("cliente", "email", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Endereco</Label>
                  <Input
                    value={extractedData.cliente.endereco}
                    onChange={(e) => updateData("cliente", "endereco", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scooter */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Scooter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Modelo</Label>
                  <Input
                    value={extractedData.scooter.modelo}
                    onChange={(e) => updateData("scooter", "modelo", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input
                    value={extractedData.scooter.marca}
                    onChange={(e) => updateData("scooter", "marca", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cor</Label>
                  <Input
                    value={extractedData.scooter.cor}
                    onChange={(e) => updateData("scooter", "cor", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Numero de Serie</Label>
                  <Input
                    value={extractedData.scooter.numero_serie}
                    onChange={(e) => updateData("scooter", "numero_serie", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Chassi</Label>
                  <Input
                    value={extractedData.scooter.chassi}
                    onChange={(e) => updateData("scooter", "chassi", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ano</Label>
                  <Input
                    type="number"
                    value={extractedData.scooter.ano}
                    onChange={(e) => updateData("scooter", "ano", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Numero NF</Label>
                  <Input
                    value={extractedData.venda.numero_nf}
                    onChange={(e) => updateData("venda", "numero_nf", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={extractedData.venda.valor}
                    onChange={(e) => updateData("venda", "valor", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={extractedData.venda.parcelas}
                    onChange={(e) => updateData("venda", "parcelas", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Data da Compra</Label>
                  <Input
                    type="date"
                    value={extractedData.venda.data_compra}
                    onChange={(e) => updateData("venda", "data_compra", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Import Button */}
          {!imported && (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleImportar} disabled={importing} className="px-12">
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historico de Importacoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma importacao realizada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Emissao</TableHead>
                  <TableHead>Importado Em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((nf) => (
                  <TableRow key={nf.id}>
                    <TableCell className="font-mono text-sm">{nf.numero}</TableCell>
                    <TableCell>{nf.cliente?.nome ?? "---"}</TableCell>
                    <TableCell>
                      R$ {nf.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {nf.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(nf.emitida_em)}</TableCell>
                    <TableCell>{formatDate(nf.created_at)}</TableCell>
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
