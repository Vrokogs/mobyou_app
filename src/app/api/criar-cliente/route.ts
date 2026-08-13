import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { checkRate } from "@/lib/rate-limit";

// Cria a conta de acesso (auth) + perfil do cliente. Usa service-role no servidor.
export async function POST(req: Request) {
  const rl = checkRate(req, "criar-cliente", 20);
  if (rl) return NextResponse.json({ error: "Muitas requisições. Aguarde." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    senha?: string;
    gerarContratos?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const { nome, cpf, telefone, email, endereco } = body;
  const gerarContratos = body.gerarContratos !== false;
  if (!nome || !email) {
    return NextResponse.json(
      { error: "Nome e e-mail são obrigatórios" },
      { status: 400 }
    );
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  if (!emailOk) {
    return NextResponse.json(
      { error: `E-mail inválido: "${email}". Use o formato nome@dominio.com` },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor (.env.local).",
      },
      { status: 500 }
    );
  }

  // 1) Verifica que quem chama é staff (gestor/vendedor)
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
  const role = (perfil as { role?: string } | null)?.role;
  if (role !== "gestor" && role !== "vendedor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // 2) Cria o usuário de autenticação com a service-role
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const senhaInformada = (body.senha || "").trim();
  if (senhaInformada && senhaInformada.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter ao menos 6 caracteres." },
      { status: 400 }
    );
  }
  const senha = senhaInformada || "Mob" + Math.random().toString(36).slice(2, 8) + "@1";

  const cpfDigits = (cpf || "").replace(/\D/g, "");

  let clienteId: string;
  let senhaRetorno: string | null = senha;
  let jaExistia = false;

  // Reuso por CPF (1 cliente por CPF): se já existe, atualiza e reaproveita.
  const { data: porCpf } = cpfDigits
    ? await admin.from("profiles").select("id").eq("cpf", cpfDigits).maybeSingle()
    : { data: null };

  if ((porCpf as { id?: string } | null)?.id) {
    clienteId = (porCpf as { id: string }).id;
    jaExistia = true;
    const upd: { email?: string; password?: string } = { email };
    if (senhaInformada) upd.password = senhaInformada;
    await admin.auth.admin.updateUserById(clienteId, upd).catch(() => {});
    senhaRetorno = senhaInformada || null;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome, role: "cliente" },
    });

    if (createErr || !created?.user) {
      // Já existe um usuário com esse e-mail: reaproveita (não duplica).
      const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existente = lista?.users?.find(
        (u) => (u.email || "").toLowerCase() === email.toLowerCase()
      );
      if (!existente) {
        const msg =
          createErr?.message ||
          (createErr as { code?: string } | null)?.code ||
          "Não foi possível criar a conta. Verifique o e-mail e tente novamente.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      clienteId = existente.id;
      jaExistia = true;
      if (senhaInformada) {
        await admin.auth.admin.updateUserById(clienteId, { password: senhaInformada });
        senhaRetorno = senhaInformada;
      } else {
        senhaRetorno = null;
      }
    } else {
      clienteId = created.user.id;
    }
  }

  // 3) Cria/atualiza o perfil (pode já existir via trigger handle_new_user)
  const { error: profErr } = await admin.from("profiles").upsert({
    id: clienteId,
    email,
    nome,
    cpf: cpfDigits || null,
    telefone: telefone || null,
    endereco: endereco || null,
    role: "cliente",
    ativo: true,
  });

  if (profErr) {
    return NextResponse.json(
      {
        error: /duplicate|unique|cpf/i.test(profErr.message)
          ? "Já existe um cliente com este CPF cadastrado em outro e-mail."
          : profErr.message,
      },
      { status: 400 }
    );
  }

  // 4) Gera automaticamente os documentos para o cliente já ter a aba de
  //    contratos vinculada (dados da scooter ficam em branco até a venda).
  //    Pulado quando o cliente já existia ou quando quem chama gera os próprios
  //    contratos (ex.: Importar NF, que inclui a scooter).
  if (gerarContratos && !jaExistia) try {
    const { data: modelos } = await admin
      .from("modelos_contrato")
      .select("tipo, titulo, conteudo_template")
      .in("tipo", ["compra_venda", "entrega", "desbloqueio"])
      .eq("ativo", true);

    if (modelos && modelos.length > 0) {
      const dataExt = new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const aplicar = (t: string) =>
        t
          .replace(/\{\{cliente_nome\}\}/g, nome)
          .replace(/\{\{cliente_cpf\}\}/g, cpfDigits || "")
          .replace(/\{\{cliente_telefone\}\}/g, telefone || "")
          .replace(/\{\{cliente_email\}\}/g, email)
          .replace(/\{\{cliente_endereco\}\}/g, endereco || "")
          .replace(/\{\{scooter_[a-z_]+\}\}/g, "_____")
          .replace(/\{\{data_extenso\}\}/g, dataExt)
          .replace(/\{\{data_atual\}\}/g, dataExt);

      const novos = (
        modelos as { tipo: string; titulo: string; conteudo_template: string }[]
      ).map((m) => ({
        tipo: m.tipo,
        titulo: m.titulo,
        cliente_id: clienteId,
        conteudo: aplicar(m.conteudo_template),
        status: "enviado",
      }));

      await admin.from("contratos").insert(novos);
    }
  } catch {
    // Não bloqueia o cadastro se a geração de documentos falhar.
  }

  return NextResponse.json({ ok: true, clienteId, email, senha: senhaRetorno, jaExistia });
}
