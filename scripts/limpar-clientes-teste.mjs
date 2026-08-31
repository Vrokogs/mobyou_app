// Remove as contas de teste criadas por criar-clientes-teste.mjs.
// Uso: node scripts/limpar-clientes-teste.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const admin = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EMAILS = ["teste.antigo@mobyou.com", "teste.novo@mobyou.com"];

for (const email of EMAILS) {
  const { data: perfil } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!perfil) { console.log(email + ": nao encontrado"); continue; }
  const id = perfil.id;

  const { data: motos } = await admin.from("scooters").select("id").eq("cliente_id", id);
  for (const m of motos ?? []) {
    await admin.from("manutencoes_preventivas").delete().eq("scooter_id", m.id);
    await admin.from("garantias").delete().eq("scooter_id", m.id);
  }
  await admin.from("ordens_servico").delete().eq("cliente_id", id);
  await admin.from("contratos").delete().eq("cliente_id", id);
  await admin.from("vendas").delete().eq("cliente_id", id);
  await admin.from("scooters").delete().eq("cliente_id", id);
  await admin.from("profiles").delete().eq("id", id);
  await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(email + ": removido");
}
