// SOMENTE LEITURA: lista os documentos que foram gerados automaticamente fora da
// regra — só o contrato de compra e venda da garantia escolhida deve ir para o
// cliente. Termo de vistoria (entrega) e termo de desbloqueio saíam junto.
//
// Uso: node scripts/conferir-contratos-automaticos.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const { data: contratos } = await a
  .from("contratos")
  .select("id, tipo, titulo, status, cliente_id, scooter_id, created_at")
  .order("created_at", { ascending: false });

const { data: perfis } = await a.from("profiles").select("id, nome");
const nome = Object.fromEntries((perfis || []).map((p) => [p.id, p.nome]));

const todos = contratos || [];
const foraDaRegra = todos.filter((c) => c.tipo === "entrega" || c.tipo === "desbloqueio");
const compraVenda = todos.filter((c) => c.tipo === "compra_venda");

console.log("=== CONTRATOS NO BANCO ===");
console.log("total:", todos.length);
console.log("compra e venda:", compraVenda.length);
console.log("termo de vistoria/entrega:", todos.filter((c) => c.tipo === "entrega").length);
console.log("termo de desbloqueio:", todos.filter((c) => c.tipo === "desbloqueio").length);

const porStatus = {};
for (const c of foraDaRegra) porStatus[c.status] = (porStatus[c.status] || 0) + 1;
console.log("\n=== VISTORIA + DESBLOQUEIO POR STATUS ===");
for (const [s, n] of Object.entries(porStatus)) console.log(`${s}: ${n}`);

const assinados = foraDaRegra.filter((c) => c.status === "assinado");
console.log(
  `\nJá assinados (NÃO devem ser apagados): ${assinados.length}` +
    `\nPendentes na lista do cliente: ${foraDaRegra.length - assinados.length}`,
);

console.log("\n=== PENDENTES, POR CLIENTE ===");
const pendentes = foraDaRegra.filter((c) => c.status !== "assinado");
const porCliente = {};
for (const c of pendentes) {
  const n = nome[c.cliente_id] || c.cliente_id || "sem cliente";
  (porCliente[n] = porCliente[n] || []).push(`${c.tipo} (${c.status})`);
}
for (const [n, itens] of Object.entries(porCliente).sort()) {
  console.log(`- ${n}: ${itens.join(", ")}`);
}

// Clientes com mais de um contrato de compra e venda: sinal de documento gerado
// duas vezes (o botão "Gerar documentos" podia ser clicado de novo).
const cvPorCliente = {};
for (const c of compraVenda) {
  const n = nome[c.cliente_id] || c.cliente_id || "sem cliente";
  (cvPorCliente[n] = cvPorCliente[n] || []).push(c);
}
const duplicados = Object.entries(cvPorCliente).filter(([, l]) => l.length > 1);
if (duplicados.length > 0) {
  console.log("\n=== CLIENTES COM MAIS DE UM CONTRATO DE COMPRA E VENDA ===");
  for (const [n, l] of duplicados) {
    console.log(`- ${n}: ${l.length} contratos (${l.map((c) => c.status).join(", ")})`);
  }
}
