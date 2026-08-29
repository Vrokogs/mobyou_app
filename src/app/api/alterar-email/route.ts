import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { checkRate } from "@/lib/rate-limit";

// Corrige o e-mail de login de um cliente já cadastrado.
// Precisa de service-role: trocar o e-mail de autenticação não é algo que o
// próprio painel consegue fazer pelo cliente comum do Supabase.
export async function POST(req: Request) {
  const rl = checkRate(req, "alterar-email", 20);
  if (rl) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  let body: { cliente_id?: string; email?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const clienteId = (body.cliente_id || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const senha = (body.senha || "").trim();

  if (!clienteId || !email) {
    return NextResponse.json(
      { error: "Informe o cliente e o novo e-mail." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: `E-mail inválido: "${email}". Use o formato nome@dominio.com` },
      { status: 400 }
    );
  }
  if (senha && senha.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter ao menos 6 caracteres." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor." },
      { status: 500 }
    );
  }

  // Só gestor troca e-mail de acesso — é uma credencial, não um dado de cadastro.
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if ((perfil as { role?: string } | null)?.role !== "gestor") {
    return NextResponse.json(
      { error: "Apenas o gestor pode alterar o e-mail de acesso." },
      { status: 403 }
    );
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // O e-mail não pode já pertencer a outra conta.
  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const conflito = lista?.users?.find(
    (u) => (u.email || "").toLowerCase() === email && u.id !== clienteId
  );
  if (conflito) {
    return NextResponse.json(
      { error: "Este e-mail já está em uso por outra conta." },
      { status: 409 }
    );
  }

  const patch: { email: string; email_confirm: boolean; password?: string } = {
    email,
    email_confirm: true,
  };
  if (senha) patch.password = senha;

  const { error: authErr } = await admin.auth.admin.updateUserById(clienteId, patch);
  if (authErr) {
    return NextResponse.json(
      { error: authErr.message || "Não foi possível alterar o e-mail de acesso." },
      { status: 400 }
    );
  }

  // Mantém o perfil em sincronia com a credencial.
  const { error: perfilErr } = await admin
    .from("profiles")
    .update({ email })
    .eq("id", clienteId);
  if (perfilErr) {
    return NextResponse.json(
      {
        error:
          "O e-mail de acesso mudou, mas o cadastro não foi atualizado: " +
          perfilErr.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, email, senhaAlterada: !!senha });
}
