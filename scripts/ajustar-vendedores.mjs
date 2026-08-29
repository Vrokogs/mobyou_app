// Retira a Pietra do quadro de vendedores (desativa, preservando o histórico)
// e cria o acesso do Kauã. Uso: node scripts/ajustar-vendedores.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const admin = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const NOME_KAUA = "Kauã";
const EMAIL_KAUA = "kaua@mobyou.com";
const SENHA_KAUA = "Mob" + Math.random().toString(36).slice(2, 8) + "@1";

// 1. Pietra: desativa. As vendas dela continuam no histórico e no faturamento,
//    mas ela some do ranking e das listas de vendedor.
const { data: pietra } = await admin
  .from("profiles").select("id, nome, ativo").eq("email", "pietra@mobyou.com").maybeSingle();

if (!pietra) {
  console.log("Pietra: perfil não encontrado.");
} else if (!pietra.ativo) {
  console.log("Pietra: já estava inativa.");
} else {
  const { error } = await admin.from("profiles").update({ ativo: false }).eq("id", pietra.id);
  console.log(error ? "Pietra: erro — " + error.message : "Pietra: desativada (histórico preservado).");
}

// 2. Kauã: cria o acesso, ou reaproveita se o e-mail já existir.
const { data: lista } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
const jaExiste = lista?.users?.find((u) => (u.email || "").toLowerCase() === EMAIL_KAUA);

let kauaId;
let senhaFinal = SENHA_KAUA;

if (jaExiste) {
  kauaId = jaExiste.id;
  await admin.auth.admin.updateUserById(kauaId, { password: SENHA_KAUA, email_confirm: true });
  console.log("Kauã: conta já existia — senha redefinida.");
} else {
  const { data: novo, error } = await admin.auth.admin.createUser({
    email: EMAIL_KAUA,
    password: SENHA_KAUA,
    email_confirm: true,
    user_metadata: { nome: NOME_KAUA, role: "vendedor" },
  });
  if (error) { console.error("Kauã: erro ao criar —", error.message); process.exit(1); }
  kauaId = novo.user.id;
  console.log("Kauã: conta de acesso criada.");
}

// 3. Perfil com papel de vendedor (o gatilho do banco pode já ter criado).
const { data: perfilKaua } = await admin.from("profiles").select("id").eq("id", kauaId).maybeSingle();
if (perfilKaua) {
  await admin.from("profiles").update({ nome: NOME_KAUA, email: EMAIL_KAUA, role: "vendedor", ativo: true }).eq("id", kauaId);
  console.log("Kauã: perfil atualizado como vendedor ativo.");
} else {
  const { error } = await admin.from("profiles").insert({
    id: kauaId, nome: NOME_KAUA, email: EMAIL_KAUA, role: "vendedor", ativo: true,
  });
  console.log(error ? "Kauã: erro no perfil — " + error.message : "Kauã: perfil criado como vendedor.");
}

console.log("\n================ ACESSO DO KAUÃ ================");
console.log("  Login:", EMAIL_KAUA);
console.log("  Senha:", senhaFinal);
console.log("===============================================\n");

const { data: quadro } = await admin
  .from("profiles").select("nome, email, ativo").eq("role", "vendedor").order("nome");
console.table(quadro);
