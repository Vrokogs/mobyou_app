// Remove perfis órfãos (sem usuário de auth), criados por tentativas antigas.
// Uso: node scripts/limpar-orfaos.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const { data: lu } = await a.auth.admin.listUsers({ page: 1, perPage: 1000 });
const authIds = new Set((lu?.users || []).map((u) => u.id));
console.log("usuarios de auth:", authIds.size);

const { data: perfis } = await a.from("profiles").select("id, nome, cpf, email");
const orfaos = (perfis || []).filter((p) => !authIds.has(p.id));
console.log("perfis orfaos (sem auth):", orfaos.length);

for (const o of orfaos) {
  // limpa dados vinculados antes (evita FK), depois o perfil
  await a.from("vendas").delete().eq("cliente_id", o.id);
  await a.from("ordens_servico").delete().eq("cliente_id", o.id);
  await a.from("contratos").delete().eq("cliente_id", o.id);
  await a.from("garantias").delete().eq("cliente_id", o.id);
  await a.from("notas_fiscais").delete().eq("cliente_id", o.id);
  await a.from("scooters").delete().eq("cliente_id", o.id);
  const { error } = await a.from("profiles").delete().eq("id", o.id);
  console.log(`  ${error ? "ERRO" : "removido"}: ${o.nome} / ${o.cpf} / ${o.email}`);
}
console.log("Concluido.");
