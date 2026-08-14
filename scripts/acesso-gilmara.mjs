// Mostra o email da Gilmara e redefine a senha para um valor conhecido.
// Uso: node scripts/acesso-gilmara.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CPF = "01793883807";
const NOVA_SENHA = process.env.NOVA_SENHA || g("SEED_PASSWORD");
if (!NOVA_SENHA) { console.error("Defina SEED_PASSWORD no .env.local ou NOVA_SENHA no ambiente."); process.exit(1); }

// acha o perfil pelo CPF (nome pode ter typo)
let { data: pf } = await admin
  .from("profiles")
  .select("id, nome, cpf, email, role")
  .eq("cpf", CPF)
  .maybeSingle();

// fallback: procura por nome parecido
if (!pf) {
  const { data: lista } = await admin
    .from("profiles")
    .select("id, nome, cpf, email, role")
    .ilike("nome", "%gilmara%");
  pf = (lista || [])[0];
}

if (!pf) {
  console.log("Nenhum perfil da Gilmara encontrado (por CPF ou nome).");
  process.exit(0);
}

console.log("Perfil encontrado:");
console.log("  Nome :", pf.nome);
console.log("  Email:", pf.email);
console.log("  Role :", pf.role);
console.log("  CPF  :", pf.cpf);

const { error } = await admin.auth.admin.updateUserById(pf.id, {
  password: NOVA_SENHA,
  email_confirm: true,
});

if (error) {
  console.error("\nErro ao redefinir senha:", error.message);
  process.exit(1);
}

console.log("\n=== ACESSO DA CLIENTE ===");
console.log("  Login:", pf.email);
console.log("  Senha:", NOVA_SENHA);
console.log("=========================");
