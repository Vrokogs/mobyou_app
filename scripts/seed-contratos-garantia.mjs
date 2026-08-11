// Cadastra os 3 contratos de compra e venda por modalidade de garantia.
// Requer a coluna modelos_contrato.modalidade (rode o ALTER antes).
// Uso: node scripts/seed-contratos-garantia.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SC = process.env.SC;
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp("^" + k + "=(.*)", "m")) || [])[1]?.trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const { error: colErr } = await a.from("modelos_contrato").select("modalidade").limit(1);
if (colErr && colErr.code === "42703") {
  console.log("COLUNA modalidade NAO EXISTE -> rode antes: ALTER TABLE modelos_contrato ADD COLUMN IF NOT EXISTS modalidade TEXT;");
  process.exit(0);
}

const { data: gestor } = await a.from("profiles").select("id").eq("role", "gestor").order("created_at").limit(1).maybeSingle();
const criadoPor = gestor?.id ?? null;

const processa = (txt) => txt
  .replace(/COMPRADOR\(A\) – _+,/, "COMPRADOR(A) – {{cliente_nome}},")
  .replace(/portador\(a\) do CPF nº _+,/, "portador(a) do CPF nº {{cliente_cpf}},")
  .replace(/residente e domiciliado\(a\) na Rua _+,/, "residente e domiciliado(a) na {{cliente_endereco}},")
  .replace(/Marca: _+/, "Marca: {{scooter_marca}}")
  .replace(/Modelo: _+/, "Modelo: {{scooter_modelo}}")
  .replace(/Ano de Fabricação\/Modelo: _+/, "Ano de Fabricação/Modelo: {{scooter_ano}}")
  .replace(/Cor: _+/, "Cor: {{scooter_cor}}")
  .replace(/Número de Chassi\/Série: _+/, "Número de Chassi/Série: {{scooter_chassi}}")
  .replace(/São Sebastião – SP, _+ de _+ de 2026\./, "São Sebastião – SP, {{data_extenso}}.");

await a.from("modelos_contrato").update({ ativo: false }).eq("tipo", "compra_venda").is("modalidade", null);
await a.from("modelos_contrato").delete().eq("tipo", "compra_venda").in("modalidade", ["3_meses", "6_meses", "1_ano"]);

for (const key of ["3_meses", "6_meses", "1_ano"]) {
  const raw = fs.readFileSync(`${SC}/contrato_${key}.txt`, "utf8");
  const { error } = await a.from("modelos_contrato").insert({
    tipo: "compra_venda", modalidade: key,
    titulo: "Contrato de Compra e Venda de Moto Elétrica",
    conteudo_template: processa(raw), criado_por: criadoPor, ativo: true,
  });
  console.log(`  ${key}: ${error ? "ERRO " + error.message : "OK"}`);
}

console.log("\n=== modelos ativos ===");
const { data: m } = await a.from("modelos_contrato").select("tipo, modalidade, titulo, ativo").eq("ativo", true).order("tipo");
for (const x of m || []) console.log(`  ${x.tipo} | ${x.modalidade || "-"} | ${x.titulo}`);
