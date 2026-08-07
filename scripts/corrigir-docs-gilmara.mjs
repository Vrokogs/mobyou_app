// Regenera os 3 documentos da Gilmara (CPF 01793883807). Uso: node scripts/corrigir-docs-gilmara.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

const CPF = "01793883807";
const { data: pf } = await a.from("profiles").select("id,nome,cpf,telefone,email,endereco").eq("cpf", CPF).maybeSingle();
if (!pf) { console.log("Cliente nao encontrado."); process.exit(0); }
console.log("Cliente:", pf.nome, pf.email);

// apaga assinaturas + contratos antigos
const { data: cs } = await a.from("contratos").select("id").eq("cliente_id", pf.id);
for (const c of cs || []) await a.from("assinaturas").delete().eq("contrato_id", c.id);
await a.from("contratos").delete().eq("cliente_id", pf.id);
console.log("Contratos antigos removidos:", (cs || []).length);

const { data: sc } = await a.from("scooters").select("id,modelo,marca,cor,ano,chassi,numero_serie").eq("cliente_id", pf.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
const dataExt = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const ap = (t) => t
  .replace(/\{\{cliente_nome\}\}/g, pf.nome || "").replace(/\{\{cliente_cpf\}\}/g, pf.cpf || "")
  .replace(/\{\{cliente_telefone\}\}/g, pf.telefone || "").replace(/\{\{cliente_email\}\}/g, pf.email || "")
  .replace(/\{\{cliente_endereco\}\}/g, pf.endereco || "")
  .replace(/\{\{scooter_modelo\}\}/g, sc?.modelo || "").replace(/\{\{scooter_marca\}\}/g, sc?.marca || "")
  .replace(/\{\{scooter_cor\}\}/g, sc?.cor || "").replace(/\{\{scooter_ano\}\}/g, sc?.ano ? String(sc.ano) : "")
  .replace(/\{\{scooter_chassi\}\}/g, sc?.chassi || "").replace(/\{\{scooter_numero_serie\}\}/g, sc?.numero_serie || "")
  .replace(/\{\{data_extenso\}\}/g, dataExt).replace(/\{\{data_atual\}\}/g, dataExt);

const { data: modelos } = await a.from("modelos_contrato").select("tipo,titulo,conteudo_template").in("tipo", ["compra_venda", "entrega", "desbloqueio"]).eq("ativo", true);
for (const m of modelos || []) {
  const { error } = await a.from("contratos").insert({ tipo: m.tipo, titulo: m.titulo, cliente_id: pf.id, scooter_id: sc?.id ?? null, conteudo: ap(m.conteudo_template), status: "enviado" });
  console.log(error ? `ERRO ${m.titulo}: ${error.message}` : `gerado: ${m.titulo}`);
}
console.log("Concluido.");
