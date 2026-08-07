import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function parseUA(ua: string) {
  let so = "Desconhecido";
  if (/windows/i.test(ua)) so = "Windows";
  else if (/android/i.test(ua)) so = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) so = "iOS";
  else if (/mac os/i.test(ua)) so = "macOS";
  else if (/linux/i.test(ua)) so = "Linux";

  let nav = "Desconhecido";
  if (/edg/i.test(ua)) nav = "Edge";
  else if (/chrome/i.test(ua)) nav = "Chrome";
  else if (/firefox/i.test(ua)) nav = "Firefox";
  else if (/safari/i.test(ua)) nav = "Safari";

  const dispositivo = /mobile|android|iphone|ipad/i.test(ua) ? "Celular/Tablet" : "Computador";
  return { so, nav, dispositivo };
}

export async function POST(req: Request) {
  let body: {
    contrato_id?: string;
    assinatura_imagem?: string;
    rubrica_imagem?: string;
    nome?: string;
    cpf?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { contrato_id, assinatura_imagem, rubrica_imagem, nome, cpf } = body;
  if (!contrato_id || !assinatura_imagem || !nome) {
    return NextResponse.json(
      { error: "Assinatura, nome e contrato são obrigatórios" },
      { status: 400 }
    );
  }

  // 1) Usuário autenticado
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2) Confirma que o contrato é do cliente e pega o conteúdo (para o hash)
  const { data: contrato } = await supabase
    .from("contratos")
    .select("id, cliente_id, conteudo, status")
    .eq("id", contrato_id)
    .maybeSingle();

  const c = contrato as
    | { id: string; cliente_id: string; conteudo: string | null; status: string }
    | null;

  if (!c || c.cliente_id !== user.id) {
    return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
  }
  if (c.status === "assinado") {
    return NextResponse.json({ error: "Documento já assinado" }, { status: 409 });
  }

  // 3) Evidências (servidor)
  const ua = req.headers.get("user-agent") || "";
  const { so, nav, dispositivo } = parseUA(ua);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const documento_hash = createHash("sha256")
    .update(c.conteudo || "")
    .digest("hex");
  const consentimento =
    "Declaro que li, compreendi e concordo com o conteúdo deste documento, " +
    "assinando-o eletronicamente de forma livre. Assinatura registrada com data, " +
    "hora, IP e hash de integridade (MP 2.200-2/2001).";

  // 4) Grava a assinatura com a service-role (captura confiável + ignora RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor." },
      { status: 500 }
    );
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from("assinaturas").insert({
    contrato_id,
    assinante_id: user.id,
    nome_assinante: nome,
    cpf: cpf || null,
    assinatura_imagem,
    rubrica_imagem: rubrica_imagem || null,
    ip_address: ip,
    navegador: nav,
    sistema_operacional: so,
    dispositivo,
    documento_hash,
    consentimento,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // O trigger marca o contrato como 'assinado' automaticamente.
  return NextResponse.json({ ok: true, documento_hash });
}
