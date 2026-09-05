// Cria (ou ajusta) a conta do papel "dev" — a que atende a caixa de suporte.
//
// RODE AS MIGRATIONS 035 E 036 ANTES: sem elas o papel 'dev' não existe no enum
// e o perfil não é gravado.
//
// Uso: node scripts/criar-conta-dev.mjs <email> [senha]
//      node scripts/criar-conta-dev.mjs patrick@mobyou.com
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Uso: node scripts/criar-conta-dev.mjs <email> [senha]");
  process.exit(1);
}
const senha = process.argv[3] || "Mobyou@" + Math.random().toString(36).slice(2, 8);

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp("^" + k + "=(.*)", "m")) || [])[1]?.trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

// A conta pode já existir (e-mail reaproveitado): nesse caso só ajusta.
const { data: lista } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
const existente = lista?.users?.find((u) => (u.email || "").toLowerCase() === email);

let id;
if (existente) {
  id = existente.id;
  await a.auth.admin.updateUserById(id, {
    password: senha,
    email_confirm: true,
    user_metadata: { ...existente.user_metadata, role: "dev" },
  });
  console.log("Conta já existia — senha e papel atualizados.");
} else {
  const { data, error } = await a.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: "Suporte MOBYOU", role: "dev" },
  });
  if (error) {
    console.error("Erro ao criar a conta:", error.message);
    process.exit(1);
  }
  id = data.user.id;
  console.log("Conta criada.");
}

const { error: errPerfil } = await a.from("profiles").upsert({
  id,
  email,
  nome: "Suporte MOBYOU",
  role: "dev",
  ativo: true,
});

if (errPerfil) {
  console.error("\nErro ao gravar o perfil:", errPerfil.message);
  if (/invalid input value for enum/i.test(errPerfil.message)) {
    console.error("O papel 'dev' não existe no banco. Rode a migration 035_papel_dev.sql primeiro.");
  }
  process.exit(1);
}

console.log("\n=== ACESSO ===");
console.log("  e-mail:", email);
console.log("  senha :", senha);
console.log("  painel: /dev");
console.log("\nTroque a senha no primeiro acesso.");
