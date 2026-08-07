// Cria uma scooter Mobyou X13 vinculada à Maria. Uso: node scripts/cadastrar-maria-scooter.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: perfis } = await admin
  .from("profiles")
  .select("id, nome")
  .or("cpf.eq.44444444444,cpf.eq.444.444.444-44,email.eq.cliente@mobyou.com");
const maria = perfis?.[0];
if (!maria) { console.log("Maria nao encontrada."); process.exit(0); }

const hoje = new Date().toISOString().slice(0, 10);
const fim = new Date(); fim.setFullYear(fim.getFullYear() + 1);
const sufixo = Date.now().toString().slice(-6);

const { data: scooter, error: e1 } = await admin.from("scooters").insert({
  cliente_id: maria.id,
  modelo: "Mobyou X13",
  marca: "Mobyou",
  cor: "Preto",
  ano: 2025,
  numero_serie: `SN-X13-${sufixo}`,
  chassi: `9BWX13${sufixo}MOBYOU`,
  data_compra: hoje,
}).select("id").single();

if (e1) { console.error("Erro scooter:", e1.message); process.exit(1); }
console.log(`Scooter Mobyou X13 criada (id=${scooter.id}) para ${maria.nome}`);

const { error: e2 } = await admin.from("garantias").insert({
  scooter_id: scooter.id,
  cliente_id: maria.id,
  data_compra: hoje,
  data_inicio: hoje,
  data_fim: fim.toISOString().slice(0, 10),
  status: "ativa",
});
if (e2) console.error("Erro garantia:", e2.message);
else console.log("Garantia de 1 ano criada.");
console.log("Concluido.");
