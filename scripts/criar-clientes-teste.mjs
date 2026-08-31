// Cria duas contas de cliente para conferir a regra da revisão nos dois lados
// do corte de 20/08/2026. Uso: node scripts/criar-clientes-teste.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const admin = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENHA = "Teste@2026";
const CORTE = "2026-08-20";

const CASOS = [
  {
    email: "teste.antigo@mobyou.com",
    nome: "TESTE - Cliente antigo (compra antes de 20/08)",
    dataCompra: "2026-05-12",
    legado: true,
    modelo: "Mobyou X13",
    chassi: "TESTE-ANTIGO-0001",
    gerarRevisoes: false,
  },
  {
    email: "teste.novo@mobyou.com",
    nome: "TESTE - Cliente novo (compra depois de 20/08)",
    dataCompra: "2026-08-25",
    legado: false,
    modelo: "Mobyou Lola",
    chassi: "TESTE-NOVO-0001",
    gerarRevisoes: true,
  },
];

for (const c of CASOS) {
  console.log("\n--- " + c.nome + " ---");

  // 1. Conta de acesso (reaproveita se já existir)
  const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existente = lista?.users?.find((u) => (u.email || "").toLowerCase() === c.email);
  let uid;
  if (existente) {
    uid = existente.id;
    await admin.auth.admin.updateUserById(uid, { password: SENHA, email_confirm: true });
    console.log("  conta ja existia — senha redefinida");
  } else {
    const { data: novo, error } = await admin.auth.admin.createUser({
      email: c.email, password: SENHA, email_confirm: true,
      user_metadata: { nome: c.nome, role: "cliente" },
    });
    if (error) { console.error("  erro:", error.message); continue; }
    uid = novo.user.id;
    console.log("  conta criada");
  }

  await admin.from("profiles").upsert({
    id: uid, nome: c.nome, email: c.email, role: "cliente", ativo: true,
  });

  // 2. Moto (uma por conta de teste)
  const { data: jaTem } = await admin.from("scooters").select("id").eq("chassi", c.chassi).maybeSingle();
  let scooterId = jaTem?.id;
  if (scooterId) {
    await admin.from("scooters").update({ data_compra: c.dataCompra, legado: c.legado, cliente_id: uid }).eq("id", scooterId);
    console.log("  moto ja existia — atualizada");
  } else {
    const { data: nova, error } = await admin.from("scooters").insert({
      modelo: c.modelo, marca: "Mobyou", cor: "Preto", ano: 2026,
      numero_serie: c.chassi, chassi: c.chassi,
      cliente_id: uid, data_compra: c.dataCompra, legado: c.legado,
    }).select("id").single();
    if (error) { console.error("  erro na moto:", error.message); continue; }
    scooterId = nova.id;
    console.log("  moto criada");
  }

  // 3. Garantia de 1 ano
  const fim = new Date(c.dataCompra + "T12:00:00");
  fim.setMonth(fim.getMonth() + 12);
  const { data: garJa } = await admin.from("garantias").select("id").eq("scooter_id", scooterId).maybeSingle();
  let garantiaId = garJa?.id;
  if (!garantiaId) {
    const { data: gar } = await admin.from("garantias").insert({
      scooter_id: scooterId, cliente_id: uid, modalidade: "1_ano",
      data_compra: c.dataCompra, data_inicio: c.dataCompra,
      data_fim: fim.toISOString().slice(0, 10), status: "ativa",
    }).select("id").single();
    garantiaId = gar?.id;
    console.log("  garantia de 1 ano criada");
  }

  // 4. Agenda de revisões: só para quem está depois do corte
  await admin.from("manutencoes_preventivas").delete().eq("scooter_id", scooterId);
  if (c.gerarRevisoes && c.dataCompra >= CORTE) {
    const base = new Date(c.dataCompra + "T12:00:00");
    const linhas = [];
    for (let i = 1; i <= 4; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + 90 * i);
      const gratuita = i === 1;
      linhas.push({
        scooter_id: scooterId, cliente_id: uid, garantia_id: garantiaId,
        numero: i, data_prevista: d.toISOString().slice(0, 10),
        gratuita, obrigatoria: true, valor: gratuita ? 0 : 300, status: "pendente",
      });
    }
    await admin.from("manutencoes_preventivas").insert(linhas);
    console.log("  4 revisoes agendadas (1a gratuita)");
  } else {
    console.log("  sem agenda de revisoes (cliente antigo)");
  }

  console.log("  LOGIN: " + c.email + "   SENHA: " + SENHA);
}

console.log("\nPara remover depois: node scripts/limpar-clientes-teste.mjs");
