// Gera os 3 documentos (contrato + 2 termos) para a Maria assinar.
// Uso: node scripts/gerar-docs-maria.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: perfis } = await admin
  .from("profiles")
  .select("id, nome, cpf, telefone, email, endereco")
  .or("cpf.eq.44444444444,cpf.eq.444.444.444-44,email.eq.cliente@mobyou.com");
const m = perfis?.[0];
if (!m) { console.log("Maria nao encontrada."); process.exit(0); }

const { data: scooter } = await admin
  .from("scooters")
  .select("id, modelo, marca, cor, ano, chassi, numero_serie")
  .eq("cliente_id", m.id)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

const dataExt = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const aplicar = (t) =>
  t
    .replace(/\{\{cliente_nome\}\}/g, m.nome || "")
    .replace(/\{\{cliente_cpf\}\}/g, m.cpf || "")
    .replace(/\{\{cliente_telefone\}\}/g, m.telefone || "")
    .replace(/\{\{cliente_email\}\}/g, m.email || "")
    .replace(/\{\{cliente_endereco\}\}/g, m.endereco || "")
    .replace(/\{\{scooter_modelo\}\}/g, scooter?.modelo || "")
    .replace(/\{\{scooter_marca\}\}/g, scooter?.marca || "")
    .replace(/\{\{scooter_cor\}\}/g, scooter?.cor || "")
    .replace(/\{\{scooter_ano\}\}/g, scooter?.ano ? String(scooter.ano) : "")
    .replace(/\{\{scooter_chassi\}\}/g, scooter?.chassi || "")
    .replace(/\{\{scooter_numero_serie\}\}/g, scooter?.numero_serie || "")
    .replace(/\{\{data_extenso\}\}/g, dataExt)
    .replace(/\{\{data_atual\}\}/g, dataExt);

const { data: modelos } = await admin
  .from("modelos_contrato")
  .select("tipo, titulo, conteudo_template")
  .in("tipo", ["compra_venda", "entrega", "desbloqueio"])
  .eq("ativo", true);

if (!modelos?.length) { console.log("Nenhum modelo encontrado (rode o seed 005)."); process.exit(0); }

for (const mod of modelos) {
  const { data: jaTem } = await admin
    .from("contratos").select("id").eq("cliente_id", m.id).eq("tipo", mod.tipo).limit(1);
  if (jaTem?.length) { console.log(`- ${mod.titulo}: já existe, pulando`); continue; }
  const { error } = await admin.from("contratos").insert({
    tipo: mod.tipo,
    titulo: mod.titulo,
    cliente_id: m.id,
    scooter_id: scooter?.id ?? null,
    conteudo: aplicar(mod.conteudo_template),
    status: "enviado",
  });
  if (error) console.error(`- ${mod.titulo}: ERRO - ${error.message}`);
  else console.log(`- ${mod.titulo}: gerado (aguardando assinatura)`);
}
console.log("Concluido.");
