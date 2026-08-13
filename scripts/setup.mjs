import { readFileSync } from "node:fs";
// Lê as credenciais do .env.local (nunca hardcode chaves no código).
const env = readFileSync(".env.local", "utf8");
const getEnv = (k) => (env.match(new RegExp("^" + k + "=(.*)", "m")) || [])[1]?.trim();
const SUPABASE_URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const users = [
  { email: "gestor@mobyou.com", password: "Mobyou@2024", nome: "Admin Gestor", role: "gestor", cpf: "111.111.111-11", telefone: "(12) 99999-0001" },
  { email: "vendedor@mobyou.com", password: "Mobyou@2024", nome: "Carlos Vendedor", role: "vendedor", cpf: "222.222.222-22", telefone: "(12) 99999-0002" },
  { email: "tecnico@mobyou.com", password: "Mobyou@2024", nome: "Ricardo Tecnico", role: "tecnico", cpf: "333.333.333-33", telefone: "(12) 99999-0003" },
  { email: "cliente@mobyou.com", password: "Mobyou@2024", nome: "Maria Cliente", role: "cliente", cpf: "444.444.444-44", telefone: "(12) 99999-0004" },
];

async function createUser(user) {
  // Create auth user
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { nome: user.nome, role: user.role },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data?.msg?.includes("already been registered") || data?.message?.includes("already been registered")) {
      console.log(`  [SKIP] ${user.email} already exists`);
      // Get existing user
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
      });
      const listData = await listRes.json();
      const existing = listData.users?.find(u => u.email === user.email);
      return existing?.id;
    }
    console.error(`  [ERROR] ${user.email}:`, data);
    return null;
  }

  console.log(`  [OK] ${user.email} created (${data.id})`);
  return data.id;
}

async function ensureProfile(userId, user) {
  // Check if profile exists
  const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=id`, {
    headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
  });

  if (checkRes.ok) {
    const existing = await checkRes.json();
    if (existing.length > 0) {
      console.log(`  [SKIP] Profile for ${user.email} already exists`);
      return;
    }
  }

  // Insert profile
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify({
      id: userId,
      nome: user.nome,
      email: user.email,
      role: user.role,
      cpf: user.cpf,
      telefone: user.telefone,
      ativo: true,
    }),
  });

  if (insertRes.ok) {
    console.log(`  [OK] Profile for ${user.email} created`);
  } else {
    const err = await insertRes.text();
    console.log(`  [INFO] Profile insert response: ${insertRes.status} - ${err}`);
  }
}

async function main() {
  console.log("=== MOBYOU Setup - Creating test accounts ===\n");

  // Check if profiles table exists
  const tableCheck = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id&limit=1`, {
    headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
  });

  const tablesExist = tableCheck.ok;
  if (!tablesExist) {
    console.log("[WARNING] Profiles table not found!");
    console.log("Please run the migration first:");
    console.log(`  Open: https://supabase.com/dashboard/project/gshikzdnvrlhqdqlplxg/sql/new`);
    console.log("  Paste the contents of: supabase/migrations/001_initial_schema.sql");
    console.log("  Click Run\n");
    console.log("Creating auth users anyway (profiles will be created by trigger after migration)...\n");
  } else {
    console.log("[OK] Database tables exist\n");
  }

  for (const user of users) {
    console.log(`Creating ${user.role}: ${user.email}`);
    const userId = await createUser(user);

    if (userId && tablesExist) {
      await ensureProfile(userId, user);
    }

    console.log("");
  }

  console.log("=== Setup Complete ===\n");
  console.log("Test accounts:");
  console.log("┌─────────────┬──────────────────────┬───────────────┐");
  console.log("│ Role        │ Email                │ Password      │");
  console.log("├─────────────┼──────────────────────┼───────────────┤");
  for (const u of users) {
    console.log(`│ ${u.role.padEnd(11)} │ ${u.email.padEnd(20)} │ ${u.password.padEnd(13)} │`);
  }
  console.log("└─────────────┴──────────────────────┴───────────────┘");
}

main().catch(console.error);
