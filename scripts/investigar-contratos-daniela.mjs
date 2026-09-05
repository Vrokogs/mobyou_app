// SOMENTE LEITURA: de onde vieram os contratos da Daniela.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const { data: perfis } = await a.from("profiles").select("id, nome, email, created_at").ilike("nome", "%Daniela%");
console.log("=== PERFIS 'Daniela' ===");
for (const p of perfis || []) console.log(`${p.id}  ${p.nome}  ${p.email}  criado ${p.created_at}`);

const ids = (perfis || []).map((p) => p.id);
if (ids.length === 0) { console.log("nenhum perfil encontrado"); process.exit(0); }

const { data: nomes } = await a.from("profiles").select("id, nome");
const nomeDe = Object.fromEntries((nomes || []).map((p) => [p.id, p.nome]));

const { data: contratos } = await a
  .from("contratos")
  .select("*")
  .in("cliente_id", ids)
  .order("created_at", { ascending: true });

console.log("\n=== CONTRATOS ===");
for (const c of contratos || []) {
  console.log(`\nid: ${c.id}`);
  console.log(`  numero:     ${c.numero}`);
  console.log(`  tipo:       ${c.tipo}`);
  console.log(`  titulo:     ${c.titulo}`);
  console.log(`  status:     ${c.status}`);
  console.log(`  scooter_id: ${c.scooter_id ?? "(nenhuma)"}`);
  console.log(`  criado_por: ${c.criado_por ? (nomeDe[c.criado_por] ?? c.criado_por) : "(null - gerado pelo servidor)"}`);
  console.log(`  created_at: ${c.created_at}`);
  console.log(`  assinado_em:${c.assinado_em ?? "---"}`);
  const trecho = (c.conteudo || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 110);
  console.log(`  conteudo:   ${trecho || "(vazio)"}`);
}

// Assinaturas presas a esses contratos
const cids = (contratos || []).map((c) => c.id);
const { data: assinaturas } = await a.from("assinaturas").select("*").in("contrato_id", cids);
console.log("\n=== ASSINATURAS LIGADAS ===");
console.log((assinaturas || []).length === 0 ? "nenhuma" : JSON.stringify(assinaturas, null, 2));

// Vendas apontando para algum desses contratos
const { data: vendas } = await a.from("vendas").select("id, contrato_id, modelo, valor_total").in("contrato_id", cids);
console.log("\n=== VENDAS LIGADAS A ESSES CONTRATOS ===");
console.log((vendas || []).length === 0 ? "nenhuma" : JSON.stringify(vendas, null, 2));

// Motos e garantias da cliente
const { data: motos } = await a.from("scooters").select("id, modelo, chassi, data_compra, legado").in("cliente_id", ids);
console.log("\n=== MOTOS ===");
console.log(JSON.stringify(motos, null, 2));
const { data: gars } = await a.from("garantias").select("id, scooter_id, modalidade, status").in("cliente_id", ids);
console.log("\n=== GARANTIAS ===");
console.log(JSON.stringify(gars, null, 2));
