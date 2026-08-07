// Apaga os DADOS da Maria (CPF 444.444.444-44), mantendo a conta/perfil dela.
// Uso: node scripts/limpar-maria.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Acha a Maria por CPF (com ou sem formatação) ou e-mail
const { data: perfis } = await admin
  .from("profiles")
  .select("id, nome, cpf, email")
  .or("cpf.eq.44444444444,cpf.eq.444.444.444-44,email.eq.cliente@mobyou.com");

const maria = perfis?.[0];
if (!maria) {
  console.log("Maria nao encontrada. Nada a apagar.");
  process.exit(0);
}
console.log(`Maria: ${maria.nome} (${maria.id})`);
const cid = maria.id;

async function del(tabela, coluna, valor) {
  const { error, count } = await admin
    .from(tabela)
    .delete({ count: "exact" })
    .eq(coluna, valor);
  if (error) console.error(`  ${tabela}: ERRO - ${error.message}`);
  else console.log(`  ${tabela}: ${count ?? 0} removido(s)`);
}

// Ordem respeitando as FKs (ON DELETE CASCADE cobre filhos de ordens/contratos)
await del("vendas", "cliente_id", cid);
await del("ordens_servico", "cliente_id", cid); // cascata: orcamentos, timeline, checkin, fotos, diagnosticos
await del("contratos", "cliente_id", cid);      // cascata: assinaturas
await del("garantias", "cliente_id", cid);
await del("notas_fiscais", "cliente_id", cid);
await del("scooters", "cliente_id", cid);

console.log("\nDados da Maria removidos. Conta/perfil mantidos.");
