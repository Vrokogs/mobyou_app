// Remove o cadastro de teste feito pelo botão "Adicionar moto":
// Mobyou Vegas, chassi 251201060000562, venda de R$ 0 no nome da Debora,
// sem nota fiscal. Apaga a moto e tudo que nasceu com ela.
//
// Uso:  node scripts/remover-moto-teste.mjs             (simulação)
//       node scripts/remover-moto-teste.mjs --executar
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const EXECUTAR = process.argv.includes("--executar");
const CHASSI = "251201060000562";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(EXECUTAR ? "=== EXECUTANDO ===\n" : "=== SIMULAÇÃO (nada será apagado) ===\n");

const { data: moto } = await a
  .from("scooters").select("id, modelo, chassi, cliente_id, data_compra").eq("chassi", CHASSI).maybeSingle();
if (!moto) { console.log("Moto não encontrada — provavelmente já foi removida."); process.exit(0); }

const { data: cli } = await a.from("profiles").select("nome").eq("id", moto.cliente_id).maybeSingle();
console.log("Moto:", moto.modelo, "| chassi", moto.chassi, "| cliente:", cli?.nome);

// Trava de segurança: só apaga se for mesmo o cadastro de teste
const { data: vendas } = await a
  .from("vendas").select("id, valor_total, nota_fiscal_id, vendedor_id").eq("scooter_id", moto.id);
const temValor = (vendas || []).some((v) => (v.valor_total || 0) > 0);
const temNota = (vendas || []).some((v) => v.nota_fiscal_id);
if (temValor || temNota) {
  console.error("\nABORTADO: esta moto tem venda com valor ou nota fiscal vinculada.");
  console.error("Não é o cadastro de teste. Nada foi apagado.");
  process.exit(1);
}

const [{ data: gar }, { data: ctr }, { data: prev }, { data: os }, { data: km }] = await Promise.all([
  a.from("garantias").select("id").eq("scooter_id", moto.id),
  a.from("contratos").select("id, tipo, status").eq("scooter_id", moto.id),
  a.from("manutencoes_preventivas").select("id").eq("scooter_id", moto.id),
  a.from("ordens_servico").select("id").eq("scooter_id", moto.id),
  a.from("km_historico").select("id").eq("scooter_id", moto.id),
]);

console.log("\nSerá apagado:");
console.log("  vendas    :", vendas?.length ?? 0, "(todas R$ 0, sem nota)");
console.log("  garantias :", gar?.length ?? 0);
console.log("  contratos :", ctr?.length ?? 0, (ctr || []).map((c) => c.tipo + "/" + c.status).join(", "));
console.log("  revisões  :", prev?.length ?? 0);
console.log("  ordens    :", os?.length ?? 0);
console.log("  histórico KM:", km?.length ?? 0);
console.log("  a moto");

if ((os || []).length > 0) {
  console.error("\nABORTADO: existe ordem de serviço para esta moto. Verifique antes.");
  process.exit(1);
}

if (!EXECUTAR) {
  console.log("\nNada foi alterado. Rode com --executar para apagar.");
  process.exit(0);
}

// Ordem importa: primeiro o que aponta para a moto, depois a moto.
for (const [tabela, campo] of [
  ["manutencoes_preventivas", "scooter_id"],
  ["km_historico", "scooter_id"],
  ["vendas", "scooter_id"],
  ["contratos", "scooter_id"],
  ["garantias", "scooter_id"],
]) {
  const { data, error } = await a.from(tabela).delete().eq(campo, moto.id).select("id");
  console.log("  " + tabela + ":", error ? "ERRO -> " + error.message : (data?.length ?? 0) + " removido(s)");
}
const { data: delMoto, error: errMoto } = await a.from("scooters").delete().eq("id", moto.id).select("id");
console.log("  scooters:", errMoto ? "ERRO -> " + errMoto.message : (delMoto?.length ?? 0) + " removida(s)");

// Como ficou o cliente
const { data: restam } = await a.from("scooters").select("modelo, chassi").eq("cliente_id", moto.cliente_id);
const { data: ctrRest } = await a.from("contratos").select("id").eq("cliente_id", moto.cliente_id);
console.log("\n" + (cli?.nome ?? "cliente") + " ficou com:", (restam || []).length, "moto(s) e", (ctrRest || []).length, "contrato(s)");
for (const m of restam || []) console.log("   -", m.modelo, "| chassi", m.chassi);
