// SOMENTE LEITURA: confere o efeito do corte de clientes legados.
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp(k + "=(.*)")) || [])[1].trim();
const a = createClient(g("NEXT_PUBLIC_SUPABASE_URL"), g("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});

const CORTE = "2026-08-20";
const { data: motos } = await a.from("scooters").select("id, modelo, chassi, data_compra, legado, created_at, cliente_id");
const eLegado = (m) => m.legado || (m.data_compra && m.data_compra.slice(0, 10) < CORTE);
const legadas = (motos || []).filter(eLegado);
const novas = (motos || []).filter((m) => !eLegado(m) && m.data_compra);
const semData = (motos || []).filter((m) => !eLegado(m) && !m.data_compra);

const conta = (arr, campo) => {
  const c = {};
  for (const x of arr) c[x[campo]] = (c[x[campo]] || 0) + 1;
  return c;
};

console.log("=== MOTOS ===");
console.log("legadas (marcador OU compra < " + CORTE + "):", legadas.length,
  "| clientes:", new Set(legadas.map((m) => m.cliente_id).filter(Boolean)).size);
console.log("novas   (compra >= " + CORTE + "):", novas.length,
  "| clientes:", new Set(novas.map((m) => m.cliente_id).filter(Boolean)).size);
console.log("SEM data de compra:", semData.length,
  "| clientes:", new Set(semData.map((m) => m.cliente_id).filter(Boolean)).size);
if (semData.length) {
  console.log("  ->", semData.map((m) => `${m.modelo || "?"} ${m.chassi || "?"}`).join(" | "));
}

const idsLeg = new Set(legadas.map((m) => m.id));
const idsNov = new Set(novas.map((m) => m.id));

const { data: prev } = await a.from("manutencoes_preventivas").select("id, scooter_id, status");
console.log("\n=== REVISOES (manutencoes_preventivas) ===");
console.log("de motos legadas:", conta((prev || []).filter((p) => idsLeg.has(p.scooter_id)), "status"));
console.log("de motos novas  :", conta((prev || []).filter((p) => idsNov.has(p.scooter_id)), "status"));

const { data: ctr } = await a.from("contratos").select("id, scooter_id, status, assinado_presencial");
console.log("\n=== CONTRATOS ===");
const rot = (c) => (c.assinado_presencial ? c.status + " (presencial)" : c.status);
console.log("de motos legadas:", conta((ctr || []).filter((c) => idsLeg.has(c.scooter_id)).map((c) => ({ s: rot(c) })), "s"));
console.log("de motos novas  :", conta((ctr || []).filter((c) => idsNov.has(c.scooter_id)).map((c) => ({ s: rot(c) })), "s"));
const semMoto = (ctr || []).filter((c) => !c.scooter_id);
console.log("sem moto vinculada:", semMoto.length, semMoto.length ? conta(semMoto, "status") : "");

const maxCriada = (motos || []).map((m) => m.created_at).sort().pop();
console.log("");
console.log("moto mais recente cadastrada em:", maxCriada);
