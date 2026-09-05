// Remove os termos de vistoria e de desbloqueio que o sistema gerava sozinho
// junto com o contrato de compra e venda. Só o compra e venda da garantia
// escolhida deve ir para o cliente — a regra agora está em src/lib/contratos.ts.
//
// Só apaga o que passar em todas as travas: tipo entrega/desbloqueio, status
// diferente de assinado, sem assinatura registrada e sem venda apontando para
// ele. Qualquer documento que já tenha sido assinado fica onde está.
//
// Uso: node scripts/remover-termos-automaticos.mjs          (mostra o que faria)
//      node scripts/remover-termos-automaticos.mjs --apagar (executa)
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const APAGAR = process.argv.includes("--apagar");
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const { data: candidatos } = await a
  .from("contratos")
  .select("id, tipo, titulo, status, cliente_id, created_at")
  .in("tipo", ["entrega", "desbloqueio"]);

if (!candidatos || candidatos.length === 0) {
  console.log("Nenhum termo de vistoria ou desbloqueio no banco. Nada a fazer.");
  process.exit(0);
}

const { data: perfis } = await a.from("profiles").select("id, nome");
const nomeDe = Object.fromEntries((perfis || []).map((p) => [p.id, p.nome]));

const ids = candidatos.map((c) => c.id);
const { data: assinaturas } = await a.from("assinaturas").select("contrato_id").in("contrato_id", ids);
const comAssinatura = new Set((assinaturas || []).map((s) => s.contrato_id));
const { data: vendas } = await a.from("vendas").select("id, contrato_id").in("contrato_id", ids);
const comVenda = new Set((vendas || []).map((v) => v.contrato_id));

const podeApagar = [];
const preservados = [];
for (const c of candidatos) {
  const motivos = [];
  if (c.status === "assinado") motivos.push("já assinado");
  if (comAssinatura.has(c.id)) motivos.push("tem assinatura registrada");
  if (comVenda.has(c.id)) motivos.push("uma venda aponta para ele");
  (motivos.length ? preservados : podeApagar).push({ ...c, motivos });
}

const linha = (c) => `  ${c.titulo} [${c.tipo}] — ${nomeDe[c.cliente_id] ?? c.cliente_id} — ${c.status} — ${c.created_at.slice(0, 10)}`;

console.log(`=== ${candidatos.length} termo(s) encontrado(s) ===\n`);
if (preservados.length > 0) {
  console.log("PRESERVADOS:");
  for (const c of preservados) console.log(linha(c) + `\n     motivo: ${c.motivos.join(", ")}`);
  console.log("");
}
console.log(`A APAGAR (${podeApagar.length}):`);
for (const c of podeApagar) console.log(linha(c));

if (podeApagar.length === 0) process.exit(0);

if (!APAGAR) {
  console.log("\nSimulação. Rode com --apagar para remover de verdade.");
  process.exit(0);
}

const { data: apagados, error } = await a
  .from("contratos")
  .delete()
  .in("id", podeApagar.map((c) => c.id))
  .select("id, tipo, titulo, cliente_id");

if (error) {
  console.error("\nERRO ao apagar:", error.message);
  process.exit(1);
}

console.log(`\n=== ${(apagados || []).length} removido(s) ===`);
for (const c of apagados || []) console.log(`  ${c.titulo} [${c.tipo}] — ${nomeDe[c.cliente_id] ?? c.cliente_id}`);

const { data: sobrou } = await a.from("contratos").select("id").in("tipo", ["entrega", "desbloqueio"]);
console.log(`\nTermos restantes no banco: ${(sobrou || []).length}`);
