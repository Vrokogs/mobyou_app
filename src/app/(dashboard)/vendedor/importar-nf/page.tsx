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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, FileText, CheckCircle2, Loader2, X, Plus, Trash2, Bike,
} from "lucide-react";
import { toast } from "sonner";
import type { NotaFiscal } from "@/types/database";
import { UNIDADES_VENDA } from "@/lib/constants";

interface ClienteData {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  senha: string;
}

interface ScooterData {
  modelo: string;
  marca: string;
  cor: string;
  numero_serie: string;
  chassi: string;
  ano: string;
  valor: string;
}

interface VendaData {
  valor: string;
  parcelas: string;
  data_compra: string;
  numero_nf: string;
  forma_pagamento: string;
  unidade: string;
}

interface ExtractedData {
  cliente: ClienteData;
  scooters: ScooterData[];
  venda: VendaData;
}

const EMPTY_SCOOTER: ScooterData = {
  modelo: "", marca: "", cor: "", numero_serie: "", chassi: "", ano: "", valor: "",
};

const EMPTY_DATA: ExtractedData = {
  cliente: { nome: "", cpf: "", telefone: "", email: "", endereco: "", senha: "" },
  scooters: [{ ...EMPTY_SCOOTER }],
  venda: { valor: "", parcelas: "1", data_compra: new Date().toISOString().slice(0, 10), numero_nf: "", forma_pagamento: "pix", unidade: "" },
};

function cloneEmpty(): ExtractedData {
  return JSON.parse(JSON.stringify(EMPTY_DATA));
}

function parseNFeXml(xmlText: string): ExtractedData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");
  const data: ExtractedData = cloneEmpty();

  try {
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

    // Produtos (scooters) - one per <det>
    const dets = Array.from(doc.querySelectorAll("det"));
    const scooters: ScooterData[] = [];
    for (const det of dets) {
      const prod = det.querySelector("prod");
      if (!prod) continue;
      const scooter: ScooterData = { ...EMPTY_SCOOTER };
      scooter.modelo = prod.querySelector("xProd")?.textContent || "";
      scooter.valor = prod.querySelector("vProd")?.textContent || "";
      const infAd = det.querySelector("infAdProd")?.textContent || "";
      const chassiMatch = infAd.match(/chassi[:\s]*([A-Z0-9]+)/i);
      if (chassiMatch) scooter.chassi = chassiMatch[1];
      const serieMatch = infAd.match(/s[eé]rie[:\s]*([A-Z0-9]+)/i);
      if (serieMatch) scooter.numero_serie = serieMatch[1];
      scooters.push(scooter);
    }
    if (scooters.length > 0) data.scooters = scooters;

    const ide = doc.querySelector("ide");
    if (ide) {
      data.venda.numero_nf = ide.querySelector("nNF")?.textContent || "";
      const dhEmi = ide.querySelector("dhEmi")?.textContent;
      if (dhEmi) data.venda.data_compra = dhEmi.slice(0, 10);
    }

    const ICMSTot = doc.querySelector("ICMSTot");
    if (ICMSTot) {
      const vNF = ICMSTot.querySelector("vNF")?.textContent;
      if (vNF) data.venda.valor = vNF;
    }
  } catch {
    // continue
  }

  return data;
}

export default function VendedorImportarNFPage() {
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [historico, setHistorico] = useState<(NotaFiscal & { cliente?: { nome: string } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistorico = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("notas_fiscais")
      .select("*, cliente:profiles!cliente_id(nome)")
      .order("created_at", { ascending: false })
      .limit(50);
    setHistorico((data ?? []) as unknown as (NotaFiscal & { cliente?: { nome: string } | null })[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setFileName(file.name);
    setFile(file);
    setImported(false);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xml") {
      setFileType("xml");
      const text = await file.text();
      const data = parseNFeXml(text);
      setExtractedData(data);
      toast.success(
        data.scooters.length > 1
          ? `Dados extraidos! ${data.scooters.length} scooters encontradas.`
          : "Dados extraidos do XML!"
      );
    } else if (ext === "pdf") {
      setFileType("pdf");
      setExtractedData(cloneEmpty());
      toast.info("Lendo o PDF...");
      try {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/extrair-nf", { method: "POST", body: fd });
        const j = await r.json();
        if (r.ok && j.encontrouAlgo) {
          const base = cloneEmpty();
          const d = j.data;
          const onlyFilled = (obj: Record<string, unknown>) =>
            Object.fromEntries(Object.entries(obj).filter(([, v]) => v));
          setExtractedData({
            cliente: { ...base.cliente, ...onlyFilled(d.cliente) },
            scooters: d.scooters?.[0]?.modelo
              ? d.scooters.map((s: Record<string, unknown>) => ({ ...base.scooters[0], ...onlyFilled(s) }))
              : base.scooters,
            venda: { ...base.venda, ...onlyFilled(d.venda) },
          });
          toast.success("Dados extraidos do PDF! Confira e complete o que faltar.");
        } else {
          toast.info("PDF carregado, mas nao consegui extrair. Preencha manualmente ou use o XML.");
        }
      } catch {
        toast.info("PDF carregado. Preencha os dados manualmente.");
      }
    } else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) {
      setFileType("image");
      setExtractedData(cloneEmpty());
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

  function updateCliente(field: keyof ClienteData, value: string) {
    setExtractedData((prev) =>
      prev ? { ...prev, cliente: { ...prev.cliente, [field]: value } } : prev
    );
  }

  function updateVenda(field: keyof VendaData, value: string) {
    setExtractedData((prev) =>
      prev ? { ...prev, venda: { ...prev.venda, [field]: value } } : prev
    );
  }

  function updateScooter(index: number, field: keyof ScooterData, value: string) {
    setExtractedData((prev) => {
      if (!prev) return prev;
      const scooters = prev.scooters.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      );
      return { ...prev, scooters };
    });
  }

  function addScooter() {
    setExtractedData((prev) =>
      prev ? { ...prev, scooters: [...prev.scooters, { ...EMPTY_SCOOTER }] } : prev
    );
  }

  function removeScooter(index: number) {
    setExtractedData((prev) => {
      if (!prev) return prev;
      if (prev.scooters.length <= 1) return prev;
      return { ...prev, scooters: prev.scooters.filter((_, i) => i !== index) };
    });
  }

  async function handleImportar() {
    if (!extractedData) return;
    const { cliente, scooters, venda } = extractedData;

    if (!cliente.nome || !cliente.cpf) {
      toast.error("Nome e CPF do cliente sao obrigatorios");
      return;
    }
    if (!cliente.email) {
      toast.error("Informe o e-mail do cliente para criar a conta de acesso.");
      return;
    }

    const validScooters = scooters.filter((s) => s.modelo || s.chassi || s.numero_serie);
    if (validScooters.length === 0) {
      toast.error("Informe ao menos uma scooter (modelo ou chassi)");
      return;
    }

    setImporting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Conta de acesso + perfil do cliente (sem duplicar contratos)
      const resCli = await fetch("/api/criar-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: cliente.nome,
          cpf: cliente.cpf,
          telefone: cliente.telefone,
          email: cliente.email,
          endereco: cliente.endereco,
          senha: cliente.senha,
          gerarContratos: false,
        }),
      });
      const cJson = await resCli.json();
      if (!resCli.ok) {
        toast.error("Erro ao criar cliente", {
          description: cJson.error || "Verifique o e-mail e os dados do cliente.",
        });
        setImporting(false);
        return;
      }
      const clienteId: string = cJson.clienteId;
      if (cJson.senha) {
        toast.success("Conta do cliente criada!", {
          description: `Login: ${cJson.email} • Senha: ${cJson.senha}`,
          duration: 15000,
        });
      }

      const dataInicio = venda.data_compra || new Date().toISOString().slice(0, 10);
      const dataFim = new Date(dataInicio);
      dataFim.setFullYear(dataFim.getFullYear() + 1);
      const dataFimStr = dataFim.toISOString().slice(0, 10);
      const parcelas = parseInt(venda.parcelas) || 1;

      // Upload do arquivo da NF (uma vez)
      let arquivoUrl: string | null = null;
      let storagePath: string | null = null;
      if (file) {
        const fext = file.name.split(".").pop() || "bin";
        const path = `notas/${clienteId}/${Date.now()}.${fext}`;
        const { error: upErr } = await supabase.storage
          .from("documentos")
          .upload(path, file, { upsert: true });
        if (!upErr) {
          storagePath = path;
          arquivoUrl = supabase.storage.from("documentos").getPublicUrl(path).data.publicUrl;
        }
      }

      // Registro da NF (uma vez, valor total)
      const nfTotal = venda.valor
        ? parseFloat(venda.valor)
        : validScooters.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);
      const { data: nfData } = await (supabase.from("notas_fiscais") as any).insert({
        tipo_arquivo: fileType === "xml" ? "xml" : fileType === "image" ? "imagem" : "pdf",
        arquivo_url: arquivoUrl || "",
        storage_path: storagePath || "",
        dados_extraidos: extractedData as unknown as Record<string, unknown>,
        importado_por: user.id,
        cliente_id: clienteId,
        valor: nfTotal,
        parcelas,
        data_compra: venda.data_compra || null,
      }).select("id").single();
      const notaFiscalId = (nfData as any)?.id ?? null;

      // 2. Para cada scooter: scooter + garantia + contrato + venda
      for (const scooter of validScooters) {
        const { data: scooterData, error: scooterError } = await (supabase.from("scooters") as any).insert({
          modelo: scooter.modelo || "Nao informado",
          marca: scooter.marca || "Nao informado",
          cor: scooter.cor || null,
          numero_serie: scooter.numero_serie || `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          chassi: scooter.chassi || `CH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          ano: scooter.ano ? parseInt(scooter.ano) : null,
          cliente_id: clienteId,
          data_compra: dataInicio,
        }).select("id").single();

        if (scooterError) {
          toast.error("Erro ao criar scooter", { description: scooterError.message });
          setImporting(false);
          return;
        }
        const scooterId = (scooterData as any).id;

        await (supabase.from("garantias") as any).insert({
          scooter_id: scooterId,
          cliente_id: clienteId,
          data_compra: dataInicio,
          data_inicio: dataInicio,
          data_fim: dataFimStr,
          status: "ativa",
        });

        const { data: contratoData } = await (supabase.from("contratos") as any).insert({
          tipo: "compra_venda" as const,
          titulo: `Compra e Venda - ${cliente.nome}`,
          conteudo: `<h2>Contrato de Compra e Venda</h2>
<p>Contrato gerado pela importacao da NF ${venda.numero_nf || ""}.</p>
<p><strong>Cliente:</strong> ${cliente.nome}</p>
<p><strong>CPF:</strong> ${cliente.cpf}</p>
<p><strong>Scooter:</strong> ${scooter.modelo} ${scooter.marca}</p>
<p><strong>Chassi:</strong> ${scooter.chassi || "N/A"}</p>
<p><strong>Valor:</strong> R$ ${scooter.valor || "0,00"}</p>`,
          cliente_id: clienteId,
          scooter_id: scooterId,
          status: "rascunho" as const,
        }).select("id").single();
        const contratoId = (contratoData as any)?.id ?? null;

        const itemValor = scooter.valor ? parseFloat(scooter.valor) : 0;
        const { data: vendaRow } = await (supabase.from("vendas") as any).insert({
          vendedor_id: user.id,
          cliente_id: clienteId,
          scooter_id: scooterId,
          nota_fiscal_id: notaFiscalId,
          valor_total: itemValor,
          entrada: 0,
          parcelas,
          forma_pagamento: venda.forma_pagamento || "pix",
          unidade: venda.unidade || null,
          modelo: scooter.modelo || null,
          chassi: scooter.chassi || null,
          contrato_id: contratoId,
        }).select("id").single();

        // Conferência por chassi: casa a moto no estoque e vira Disponível -> Vendido
        if (scooter.chassi) {
          await (supabase.from("estoque_motos") as any)
            .update({ estado: "Vendido", vendedor_id: user.id, venda_id: vendaRow?.id ?? null })
            .eq("chassi", scooter.chassi)
            .neq("estado", "Vendido");
        }
      }

      toast.success("Importacao concluida!", {
        description: `Cliente, ${validScooters.length} scooter(s), garantia(s), venda(s) e contrato(s) criados.`,
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
    setFile(null);
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

  const scootersTotal = extractedData
    ? extractedData.scooters.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar Nota Fiscal</h1>
        <p className="text-muted-foreground">
          Importe NF para cadastrar cliente, scooter(s) e venda(s) automaticamente. Suporta multiplas scooters.
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

          {/* Cliente + Venda */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input value={extractedData.cliente.nome} onChange={(e) => updateCliente("nome", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">CPF/CNPJ</Label>
                    <Input value={extractedData.cliente.cpf} onChange={(e) => updateCliente("cpf", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input value={extractedData.cliente.telefone} onChange={(e) => updateCliente("telefone", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail (login)</Label>
                    <Input type="email" value={extractedData.cliente.email} onChange={(e) => updateCliente("email", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Senha (acesso do cliente)</Label>
                    <Input type="text" placeholder="min. 6 caracteres" value={extractedData.cliente.senha} onChange={(e) => updateCliente("senha", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Endereco</Label>
                  <Input value={extractedData.cliente.endereco} onChange={(e) => updateCliente("endereco", e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Venda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Numero NF</Label>
                    <Input value={extractedData.venda.numero_nf} onChange={(e) => updateVenda("numero_nf", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data da Compra</Label>
                    <Input type="date" value={extractedData.venda.data_compra} onChange={(e) => updateVenda("data_compra", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Total (R$)</Label>
                    <Input type="number" step="0.01" value={extractedData.venda.valor} onChange={(e) => updateVenda("valor", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Parcelas</Label>
                    <Input type="number" min="1" value={extractedData.venda.parcelas} onChange={(e) => updateVenda("parcelas", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Forma de Pagamento</Label>
                    <Select
                      value={extractedData.venda.forma_pagamento}
                      onValueChange={(v) => updateVenda("forma_pagamento", (v as string) ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="cartao">Cartao</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="financiamento">Financiamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unidade (loja da venda)</Label>
                    <Select
                      value={extractedData.venda.unidade}
                      onValueChange={(v) => updateVenda("unidade", (v as string) ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione a loja" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES_VENDA.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm flex items-center justify-between">
                  <span className="text-muted-foreground">Soma dos itens</span>
                  <span className="font-medium">
                    R$ {scootersTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scooters (multiplas) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bike className="h-5 w-5" />
                  Scooters
                  <Badge variant="secondary">{extractedData.scooters.length}</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" onClick={addScooter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar scooter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {extractedData.scooters.map((scooter, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground">
                      Scooter #{index + 1}
                    </p>
                    {extractedData.scooters.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeScooter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Modelo</Label>
                      <Input value={scooter.modelo} onChange={(e) => updateScooter(index, "modelo", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Marca</Label>
                      <Input value={scooter.marca} onChange={(e) => updateScooter(index, "marca", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cor</Label>
                      <Input value={scooter.cor} onChange={(e) => updateScooter(index, "cor", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Numero de Serie</Label>
                      <Input value={scooter.numero_serie} onChange={(e) => updateScooter(index, "numero_serie", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Chassi</Label>
                      <Input value={scooter.chassi} onChange={(e) => updateScooter(index, "chassi", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ano</Label>
                      <Input type="number" value={scooter.ano} onChange={(e) => updateScooter(index, "ano", e.target.value)} />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <Label className="text-xs">Valor do item (R$)</Label>
                      <Input type="number" step="0.01" value={scooter.valor} onChange={(e) => updateScooter(index, "valor", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

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
                    Importar {extractedData.scooters.length > 1 ? `(${extractedData.scooters.length} scooters)` : ""}
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Importado Em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((nf) => {
                  const n = nf as unknown as {
                    id: string;
                    cliente?: { nome: string } | null;
                    tipo_arquivo?: string | null;
                    valor?: number | null;
                    arquivo_url?: string | null;
                    created_at: string;
                  };
                  return (
                    <TableRow key={n.id}>
                      <TableCell>{n.cliente?.nome ?? "---"}</TableCell>
                      <TableCell className="uppercase text-xs">{n.tipo_arquivo ?? "---"}</TableCell>
                      <TableCell>
                        R$ {(n.valor ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {n.arquivo_url ? (
                          <a href={n.arquivo_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                            Abrir
                          </a>
                        ) : (
                          "---"
                        )}
                      </TableCell>
                      <TableCell>{formatDate(n.created_at)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
