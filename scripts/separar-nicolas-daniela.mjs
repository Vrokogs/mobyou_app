// Separa dois clientes que foram parar na mesma conta por causa de um e-mail
// digitado errado na importação da nota.
//
//   Conta b202da11 (login dani_nascimento10@icoloud.com) fica com a DANIELA
//   A moto Snake e tudo ligado a ela migram para uma conta NOVA do NICOLAS
//
// Uso:  node scripts/separar-nicolas-daniela.mjs          (simulação)
//       node scripts/separar-nicolas-daniela.mjs --executar
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const EXECUTAR = process.argv.includes("--executar");
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const admin = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CHASSI_NICOLAS = "WY202606200002031"; // Snake carbono
const CONTA = "b202da11-e4f2-4653-b775-559f30102aff";

const DANIELA = {
  nome: "Daniela Nascimento dos Santos",
  cpf: "07499942589",
  email: "dani_nascimento10@icoloud.com",
  telefone: "(12) 99662-8784",
  endereco: "Rua Feliciano Sebastiao Teixeira Marques, 111 - A",
};
const NICOLAS = {
  nome: "Nicolas Stahel",
  cpf: "34937766830",
  email: "nicolasstahel@hotmail.com",
  telefone: "(12) 99662-8784",
  endereco: "Rua Maria Luciana de Oliveira, 41",
};
const SENHA_NICOLAS = "Mob" + Math.random().toString(36).slice(2, 8) + "@1";

const marca = EXECUTAR ? "" : "[simulação] ";
console.log(EXECUTAR ? "=== EXECUTANDO ===\n" : "=== SIMULAÇÃO (nada será alterado) ===\n");

// 1. A moto do Nicolas
const { data: moto } = await admin
  .from("scooters").select("id, modelo, chassi").eq("chassi", CHASSI_NICOLAS).maybeSingle();
if (!moto) { console.error("Moto Snake não encontrada."); process.exit(1); }
console.log("Moto do Nicolas:", moto.modelo, "| chassi", moto.chassi);

// 2. O que está pendurado nela
const [{ data: gar }, { data: ctr }, { data: vnd }, { data: prev }, { data: os }, { data: nf }] =
  await Promise.all([
    admin.from("garantias").select("id").eq("scooter_id", moto.id),
    admin.from("contratos").select("id, tipo, status").eq("scooter_id", moto.id),
    admin.from("vendas").select("id, valor_total, nota_fiscal_id").eq("scooter_id", moto.id),
    admin.from("manutencoes_preventivas").select("id").eq("scooter_id", moto.id),
    admin.from("ordens_servico").select("id").eq("scooter_id", moto.id),
    admin.from("notas_fiscais").select("id").eq("scooter_id", moto.id),
  ]);

console.log("  garantias:", gar?.length ?? 0, "| contratos:", ctr?.length ?? 0,
  "| vendas:", vnd?.length ?? 0, "| revisões:", prev?.length ?? 0,
  "| ordens:", os?.length ?? 0, "| notas:", nf?.length ?? 0);

// A NF do Nicolas é a que a venda dele aponta
const nfNicolas = (vnd || []).map((v) => v.nota_fiscal_id).filter(Boolean);

// 3. Conta do Nicolas
const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const jaTem = lista?.users?.find((u) => (u.email || "").toLowerCase() === NICOLAS.email);
let idNicolas = jaTem?.id ?? null;

if (idNicolas) {
  console.log("\n" + marca + "Conta do Nicolas já existe:", NICOLAS.email);
} else if (EXECUTAR) {
  const { data: novo, error } = await admin.auth.admin.createUser({
    email: NICOLAS.email, password: SENHA_NICOLAS, email_confirm: true,
    user_metadata: { nome: NICOLAS.nome, role: "cliente" },
  });
  if (error) { console.error("Erro ao criar conta do Nicolas:", error.message); process.exit(1); }
  idNicolas = novo.user.id;
  await admin.from("profiles").upsert({ id: idNicolas, role: "cliente", ativo: true, ...NICOLAS });
  console.log("\nConta do Nicolas criada:", NICOLAS.email, "| senha:", SENHA_NICOLAS);
} else {
  console.log("\n" + marca + "criaria a conta " + NICOLAS.email + " com senha nova");
}

// 4. Migra o que é do Nicolas
const mover = [
  ["scooters", { id: moto.id }],
  ["garantias", { scooter_id: moto.id }],
  ["contratos", { scooter_id: moto.id }],
  ["vendas", { scooter_id: moto.id }],
  ["manutencoes_preventivas", { scooter_id: moto.id }],
  ["ordens_servico", { scooter_id: moto.id }],
];
console.log("\n" + marca + "move para a conta do Nicolas:");
for (const [tabela, filtro] of mover) {
  const chave = Object.keys(filtro)[0];
  console.log("   -", tabela, "onde", chave, "=", String(filtro[chave]).slice(0, 8));
  if (EXECUTAR && idNicolas) {
    const { data, error } = await admin
      .from(tabela).update({ cliente_id: idNicolas }).eq(chave, filtro[chave]).select("id");
    console.log("       ", error ? "ERRO -> " + error.message : (data?.length ?? 0) + " registro(s) movido(s)");
  }
}
for (const id of nfNicolas) {
  console.log("   - notas_fiscais", id.slice(0, 8));
  if (EXECUTAR && idNicolas) {
    const { error } = await admin.from("notas_fiscais").update({ cliente_id: idNicolas }).eq("id", id);
    console.log("       ", error ? "ERRO -> " + error.message : "movida");
  }
}

// 5. Devolve a conta original para a Daniela
console.log("\n" + marca + "restaura a conta " + CONTA.slice(0, 8) + " como Daniela:");
console.log("   nome:", DANIELA.nome, "| CPF:", DANIELA.cpf, "| e-mail:", DANIELA.email);
if (EXECUTAR) {
  const { error: eP } = await admin.from("profiles").update(DANIELA).eq("id", CONTA);
  console.log("   ", eP ? "ERRO no perfil -> " + eP.message : "perfil restaurado");
  const { error: eA } = await admin.auth.admin.updateUserById(CONTA, { email: DANIELA.email, email_confirm: true });
  console.log("   ", eA ? "ERRO no login -> " + eA.message : "login confirmado");
}

// 6. Estado final
if (EXECUTAR) {
  console.log("\n=== COMO FICOU ===");
  for (const [rotulo, id] of [["DANIELA", CONTA], ["NICOLAS", idNicolas]]) {
    const { data: p } = await admin.from("profiles").select("nome, cpf, email").eq("id", id).maybeSingle();
    const { data: ms } = await admin.from("scooters").select("modelo, chassi").eq("cliente_id", id);
    const { data: cs } = await admin.from("contratos").select("id").eq("cliente_id", id);
    console.log("\n  " + rotulo + ":", p?.nome, "| CPF", p?.cpf, "|", p?.email);
    for (const m of ms || []) console.log("     moto:", m.modelo, "| chassi", m.chassi);
    console.log("     contratos:", cs?.length ?? 0);
  }
  if (!jaTem) console.log("\n  LOGIN DO NICOLAS:", NICOLAS.email, "| SENHA:", SENHA_NICOLAS);
} else {
  console.log("\nNada foi alterado. Rode com --executar para aplicar.");
}
