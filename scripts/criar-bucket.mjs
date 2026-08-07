// Cria o bucket "documentos" (NF, PDFs) público. Uso: node scripts/criar-bucket.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`${k}=(.*)`)) || [])[1]?.trim();
const admin = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const name of ["documentos", "fotos"]) {
  const { error } = await admin.storage.createBucket(name, {
    public: true,
    fileSizeLimit: "20MB",
  });
  if (error) {
    if (/already exists/i.test(error.message)) console.log(`bucket ${name}: já existe`);
    else console.error(`bucket ${name}: ERRO -`, error.message);
  } else {
    console.log(`bucket ${name}: criado (público)`);
  }
}
console.log("Concluido.");
