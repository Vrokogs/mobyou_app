"use client";

import { useRef, useState, useEffect } from "react";
import SignaturePad from "signature_pad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Eraser, Check, Loader2 } from "lucide-react";

interface SignaturePadProps {
  contratoId: string;
  onComplete?: () => void;
}

interface DeviceInfo {
  ip_address: string | null;
  user_agent: string;
  browser: string;
  os: string;
  device: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
}

function getBrowserInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  return "Desconhecido";
}

function getOSInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Windows NT 10")) return "Windows 10/11";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS X")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  return "Desconhecido";
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
}

export function SignaturePadComponent({ contratoId, onComplete }: SignaturePadProps) {
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const rubricaCanvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const rubricaPadRef = useRef<SignaturePad | null>(null);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [saving, setSaving] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    ip_address: null,
    user_agent: "",
    browser: "",
    os: "",
    device: "",
    timestamp: "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    // Initialize signature pads
    if (signatureCanvasRef.current) {
      signaturePadRef.current = new SignaturePad(signatureCanvasRef.current, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });
      resizeCanvas(signatureCanvasRef.current, signaturePadRef.current);
    }

    if (rubricaCanvasRef.current) {
      rubricaPadRef.current = new SignaturePad(rubricaCanvasRef.current, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
        minWidth: 0.5,
        maxWidth: 2,
      });
      resizeCanvas(rubricaCanvasRef.current, rubricaPadRef.current);
    }

    // Gather device info
    setDeviceInfo({
      ip_address: null,
      user_agent: navigator.userAgent,
      browser: getBrowserInfo(),
      os: getOSInfo(),
      device: getDeviceType(),
      timestamp: new Date().toISOString(),
      latitude: null,
      longitude: null,
    });

    // Fetch IP address
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => {
        setDeviceInfo((prev) => ({ ...prev, ip_address: data.ip }));
      })
      .catch(() => {
        // IP fetch failed, continue without it
      });

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDeviceInfo((prev) => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
        },
        () => {
          // Geolocation denied or unavailable
        }
      );
    }

    function handleResize() {
      if (signatureCanvasRef.current && signaturePadRef.current) {
        resizeCanvas(signatureCanvasRef.current, signaturePadRef.current);
      }
      if (rubricaCanvasRef.current && rubricaPadRef.current) {
        resizeCanvas(rubricaCanvasRef.current, rubricaPadRef.current);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      signaturePadRef.current?.off();
      rubricaPadRef.current?.off();
    };
  }, []);

  function resizeCanvas(canvas: HTMLCanvasElement, pad: SignaturePad) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    canvas.getContext("2d")?.scale(ratio, ratio);
    pad.clear();
  }

  function clearSignature() {
    signaturePadRef.current?.clear();
  }

  function clearRubrica() {
    rubricaPadRef.current?.clear();
  }

  async function handleSubmit() {
    if (!nome.trim()) {
      toast.error("Informe o nome do signatario");
      return;
    }

    if (signaturePadRef.current?.isEmpty()) {
      toast.error("Assinatura obrigatoria");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario nao autenticado");
        return;
      }

      // Get signature as data URL
      const signatureData = signaturePadRef.current!.toDataURL("image/png");
      const rubricaData = rubricaPadRef.current?.isEmpty()
        ? null
        : rubricaPadRef.current!.toDataURL("image/png");

      // Upload signature image to storage
      const signatureBlob = await fetch(signatureData).then((r) => r.blob());
      const signatureFileName = `assinaturas/${contratoId}/${user.id}_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(signatureFileName, signatureBlob, { contentType: "image/png" });

      let assinaturaUrl = signatureData; // fallback to data URL
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("documentos")
          .getPublicUrl(signatureFileName);
        assinaturaUrl = urlData.publicUrl;
      }

      // Save signature record
      const { error } = await supabase.from("assinaturas").insert({
        contrato_id: contratoId,
        signatario_id: user.id,
        tipo: "cliente" as const,
        nome: nome.trim(),
        cpf: cpf.trim() || null,
        assinatura_url: assinaturaUrl,
        ip_address: deviceInfo.ip_address,
        user_agent: deviceInfo.user_agent,
        assinado_em: new Date().toISOString(),
      });

      if (error) {
        toast.error("Erro ao salvar assinatura", { description: error.message });
        return;
      }

      // Update contract status to assinado
      await supabase
        .from("contratos")
        .update({
          status: "assinado" as const,
          data_assinatura: new Date().toISOString(),
        })
        .eq("id", contratoId);

      toast.success("Assinatura registrada com sucesso!");
      onComplete?.();
    } catch {
      toast.error("Erro inesperado ao salvar assinatura");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Signer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Signatario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sig-nome">Nome Completo</Label>
              <Input
                id="sig-nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sig-cpf">CPF (opcional)</Label>
              <Input
                id="sig-cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Assinatura</CardTitle>
          <Button variant="outline" size="sm" onClick={clearSignature}>
            <Eraser className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={signatureCanvasRef}
              className="w-full touch-none"
              style={{ height: 200 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Assine com o mouse ou toque na area acima
          </p>
        </CardContent>
      </Card>

      {/* Rubrica */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Rubrica (opcional)</CardTitle>
          <Button variant="outline" size="sm" onClick={clearRubrica}>
            <Eraser className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={rubricaCanvasRef}
              className="w-full touch-none"
              style={{ height: 120 }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Informacoes de Verificacao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">IP:</span>{" "}
              {deviceInfo.ip_address || "Obtendo..."}
            </div>
            <div>
              <span className="font-medium text-foreground">Navegador:</span>{" "}
              {deviceInfo.browser}
            </div>
            <div>
              <span className="font-medium text-foreground">SO:</span>{" "}
              {deviceInfo.os}
            </div>
            <div>
              <span className="font-medium text-foreground">Dispositivo:</span>{" "}
              {deviceInfo.device}
            </div>
            <div>
              <span className="font-medium text-foreground">Localizacao:</span>{" "}
              {deviceInfo.latitude
                ? `${deviceInfo.latitude.toFixed(4)}, ${deviceInfo.longitude?.toFixed(4)}`
                : "Nao disponivel"}
            </div>
            <div>
              <span className="font-medium text-foreground">Data/Hora:</span>{" "}
              {deviceInfo.timestamp
                ? new Date(deviceInfo.timestamp).toLocaleString("pt-BR")
                : "---"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Salvando assinatura...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Assinar Contrato
          </>
        )}
      </Button>
    </div>
  );
}
