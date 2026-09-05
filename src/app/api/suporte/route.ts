import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { checkRate } from "@/lib/rate-limit";

// Recebe os pedidos de ajuda da tela de login e os feedbacks de dentro do
// painel. Grava com a service-role porque o formulário do login é público —
// quem preenche não está logado. Por isso a tabela não tem policy de INSERT:
// nada entra direto do navegador, só por aqui, com limite por IP.

const TIPOS = ["senha", "acesso", "erro", "sugestao", "outro"];

export async function POST(req: Request) {
  const rl = checkRate(req, "suporte", 5);
  if (rl) {
    return NextResponse.json(
      { error: "Muitas mensagens seguidas. Aguarde um pouco." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: {
    tipo?: string;
    nome?: string;
    email?: string;
    telefone?: string;
    mensagem?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const nome = (body.nome || "").trim();
  const mensagem = (body.mensagem || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const telefone = (body.telefone || "").trim();
  const tipo = TIPOS.includes(body.tipo || "") ? body.tipo! : "outro";

  if (!nome || nome.length < 2) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (mensagem.length < 10) {
    return NextResponse.json(
      { error: "Descreva o que aconteceu com um pouco mais de detalhe." },
      { status: 400 },
    );
  }
  if (mensagem.length > 2000) {
    return NextResponse.json({ error: "Mensagem muito longa." }, { status: 400 });
  }
  // Sem um jeito de responder, o chamado nasce sem saída.
  if (!email && !telefone) {
    return NextResponse.json(
      { error: "Deixe um e-mail ou telefone para retorno." },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: `E-mail inválido: "${email}"` }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor." },
      { status: 500 },
    );
  }

  // Se veio de dentro do painel, registra quem enviou — ajuda a responder.
  let autorId: string | null = null;
  try {
    const supabase = await createServer();
    const { data: { user } } = await supabase.auth.getUser();
    autorId = user?.id ?? null;
  } catch {
    // Tela de login: ninguém logado, segue anônimo.
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from("solicitacoes_suporte").insert({
    tipo,
    nome,
    email: email || null,
    telefone: telefone || null,
    mensagem,
    autor_id: autorId,
  });

  if (error) {
    return NextResponse.json(
      {
        // O Postgres diz "relation ... does not exist"; o PostgREST, quando a
        // tabela nem entrou no cache do schema, diz "Could not find the table".
        error: /does not exist|could not find the table/i.test(error.message)
          ? "A caixa de suporte ainda não foi criada no banco (rode as migrations 035 e 036)."
          : error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
