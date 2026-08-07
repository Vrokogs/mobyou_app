// Cria/garante contas de teste (gestor, vendedor, cliente) com senhas conhecidas.
// Uso: node scripts/seed-usuarios.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = get("SUPABASE_SERVICE_ROLE_KEY");

if (!url || !serviceKey) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const contas = [
  { email: "gestor@mobyou.com", senha: "gestor123", nome: "Gestor Teste", role: "gestor" },
  { email: "vendedor@mobyou.com", senha: "vendedor123", nome: "Vendedor Teste", role: "vendedor" },
  { email: "cliente@mobyou.com", senha: "cliente123", nome: "Maria Cliente", role: "cliente" },
];

async function acharPorEmail(email) {
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data?.users?.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
}

for (const c of contas) {
  let userId;
  const existente = await acharPorEmail(c.email);

  if (existente) {
    userId = existente.id;
    await admin.auth.admin.updateUserById(userId, {
      password: c.senha,
      email_confirm: true,
      user_metadata: { ...(existente.user_metadata || {}), nome: c.nome, role: c.role },
    });
    console.log(`Atualizado: ${c.email} (senha redefinida)`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: c.email,
      password: c.senha,
      email_confirm: true,
      user_metadata: { nome: c.nome, role: c.role },
    });
    if (error) {
      console.error(`ERРO ao criar ${c.email}:`, error.message);
      continue;
    }
    userId = data.user.id;
    console.log(`Criado: ${c.email}`);
  }

  // Garante o perfil (sem sobrescrever cpf existente)
  const { data: perfil } = await admin.from("profiles").select("cpf").eq("id", userId).maybeSingle();
  const payload = {
    id: userId,
    email: c.email,
    nome: c.nome,
    role: c.role,
    ativo: true,
  };
  if (perfil?.cpf) payload.cpf = perfil.cpf;
  const { error: pErr } = await admin.from("profiles").upsert(payload);
  if (pErr) console.error(`  perfil ${c.email}:`, pErr.message);
  else console.log(`  perfil ok (${c.role})`);
}

console.log("\nConcluido.");
