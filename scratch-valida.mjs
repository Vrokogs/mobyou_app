import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";
const env = fs.readFileSync(".env.local", "utf8");
const g = (k) => (env.match(new RegExp("^" + k + "=(.*)", "m")) || [])[1]?.trim();
const url = g("NEXT_PUBLIC_SUPABASE_URL");
const pub = g("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const sec = g("SUPABASE_SERVICE_ROLE_KEY");

// 1) SECRET key: operação admin (listar usuários) — deve funcionar
const admin = createClient(url, sec, { auth: { persistSession: false } });
const { data: u, error: eAdmin } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
console.log("SECRET (admin listUsers):", eAdmin ? "FALHOU - " + eAdmin.message : "OK (" + (u?.users?.length ?? 0) + " user na 1ª página)");

// 2) SECRET: query ignorando RLS
const { error: eQ } = await admin.from("profiles").select("id").limit(1);
console.log("SECRET (query profiles):", eQ ? "FALHOU - " + eQ.message : "OK");

// 3) PUBLISHABLE key: login de um gestor real
const anon = createClient(url, pub, { auth: { persistSession: false } });
const { data: login, error: eL } = await anon.auth.signInWithPassword({ email: "natanna@mobyou.com", password: "mobyou$2026" });
console.log("PUBLISHABLE (login gestor):", eL ? "FALHOU - " + eL.message : "OK (" + login.user.email + ")");
