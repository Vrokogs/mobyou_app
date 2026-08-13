import { NextResponse } from "next/server";
import { createClient as createServer } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { checkRate } from "@/lib/rate-limit";

// Exclui um cliente e TODOS os dados vinculados a ele (scooters, vendas, OS,
// contratos, garantias, manutenções, NF). Usa service-role no servidor.
// Permitido a gestor e vendedor.
export async function POST(req: Request) {
  const rl = checkRate(req, "excluir-cliente", 10);
  if (rl) return NextResponse.json({ error: "Muitas requisições. Aguarde." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  let body: { clienteId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida" }, { status: 400 });
  }
  const clienteId = body.clienteId;
  if (!clienteId) {
    return NextResponse.json({ error: "clienteId é obrigatório" }, { status: 400 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY não configurada." }, { status: 500 });
  }

  // 1) Quem chama precisa ser staff (gestor/vendedor)
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (perfil as { role?: string } | null)?.role;
  if (role !== "gestor" && role !== "vendedor") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2) Confirma que o alvo é um cliente (não permite excluir staff por aqui)
  const { data: alvo } = await admin.from("profiles").select("id, role, nome").eq("id", clienteId).maybeSingle();
  if (!alvo) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  if ((alvo as { role?: string }).role !== "cliente") {
    return NextResponse.json({ error: "Só é possível excluir perfis de cliente." }, { status: 400 });
  }

  try {
    const ids = async (tabela: string, col: string, filtroCol: string, filtroVal: string) => {
      const { data } = await (admin.from(tabela) as any).select(col).eq(filtroCol, filtroVal);
      return ((data ?? []) as Record<string, unknown>[]).map((r) => r[col] as string).filter(Boolean);
    };

    const scooterIds = await ids("scooters", "id", "cliente_id", clienteId);
    const ordensIds = await ids("ordens_servico", "id", "cliente_id", clienteId);
    const contratoIds = await ids("contratos", "id", "cliente_id", clienteId);

    // Filhos das ordens
    if (ordensIds.length) {
      for (const t of ["orcamentos", "diagnosticos", "checkin_items", "fotos_ordem", "timeline_eventos"]) {
        await admin.from(t).delete().in("ordem_id", ordensIds);
      }
    }
    // Assinaturas dos contratos
    if (contratoIds.length) {
      await admin.from("assinaturas").delete().in("contrato_id", contratoIds);
    }
    // Registros ligados diretamente ao cliente / às scooters dele
    await admin.from("contratos").delete().eq("cliente_id", clienteId);
    await admin.from("ordens_servico").delete().eq("cliente_id", clienteId);
    await admin.from("manutencoes_preventivas").delete().eq("cliente_id", clienteId);
    await admin.from("garantias").delete().eq("cliente_id", clienteId);
    await admin.from("vendas").delete().eq("cliente_id", clienteId);
    await admin.from("notas_fiscais").delete().eq("cliente_id", clienteId);
    if (scooterIds.length) {
      await admin.from("km_historico").delete().in("scooter_id", scooterIds);
    }
    await admin.from("scooters").delete().eq("cliente_id", clienteId);

    // 3) Remove o perfil e a conta de autenticação
    await admin.from("profiles").delete().eq("id", clienteId);
    const { error: authErr } = await admin.auth.admin.deleteUser(clienteId);
    // Se o usuário de auth não existir (cliente sem login), ignora
    if (authErr && !/not.*found/i.test(authErr.message || "")) {
      return NextResponse.json(
        { error: "Dados removidos, mas a conta de acesso não pôde ser excluída.", detalhe: authErr.message },
        { status: 207 }
      );
    }

    return NextResponse.json({ ok: true, nome: (alvo as { nome?: string }).nome ?? null });
  } catch (e) {
    return NextResponse.json(
      { error: "Erro ao excluir cliente", detalhe: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
