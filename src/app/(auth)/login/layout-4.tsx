"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout4() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").single();
      if (profile) {
        router.push({ gestor: "/gestor", vendedor: "/vendedor", tecnico: "/tecnico", cliente: "/cliente" }[profile.role] || "/cliente");
        router.refresh();
      }
    } catch { toast.error("Erro inesperado"); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ backgroundColor: "#03080F" }}>
      {/* Grid lines background for futuristic feel */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#E8871E 1px, transparent 1px), linear-gradient(90deg, #E8871E 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient glow behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(232,135,30,0.08) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo with animated pulse glow */}
        <div className="relative mb-10">
          <div className="absolute inset-0 rounded-2xl animate-pulse"
            style={{ boxShadow: "0 0 40px rgba(232,135,30,0.3), 0 0 80px rgba(232,135,30,0.15)" }}
          />
          <img
            src="/images/logo-mobyou.jpg"
            alt="MOBYOU"
            className="relative w-28 h-28 object-contain rounded-2xl"
            style={{ boxShadow: "0 0 20px rgba(232,135,30,0.2)" }}
          />
        </div>

        {/* Title */}
        <h1 className="text-lg font-bold tracking-[0.3em] uppercase mb-1" style={{ color: "#E8871E" }}>
          MOBYOU
        </h1>
        <p className="text-xs tracking-[0.2em] mb-10" style={{ color: "#7A99B8" }}>
          SISTEMA DE ACESSO
        </p>

        {/* Card */}
        <div className="w-full rounded-2xl p-8 border" style={{
          backgroundColor: "#091522",
          borderColor: "rgba(232,135,30,0.1)",
          boxShadow: "0 0 1px rgba(232,135,30,0.3), inset 0 1px 0 rgba(232,135,30,0.05)",
        }}>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-mono uppercase tracking-widest mb-2 block" style={{ color: "#7A99B8" }}>
                E-mail
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg text-white placeholder:text-[#2A4A6A] transition-all duration-300 focus:ring-0"
                style={{
                  backgroundColor: "rgba(232,135,30,0.03)",
                  borderColor: "rgba(232,135,30,0.15)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#E8871E";
                  e.target.style.boxShadow = "0 0 10px rgba(232,135,30,0.3), 0 0 20px rgba(232,135,30,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(232,135,30,0.15)";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-widest" style={{ color: "#7A99B8" }}>
                  Senha
                </label>
                <Link href="/recuperar-senha" className="text-xs hover:brightness-125 transition-all" style={{ color: "#E8871E" }}>
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-lg text-white placeholder:text-[#2A4A6A] pr-10 transition-all duration-300 focus:ring-0"
                  style={{
                    backgroundColor: "rgba(232,135,30,0.03)",
                    borderColor: "rgba(232,135,30,0.15)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#E8871E";
                    e.target.style.boxShadow = "0 0 10px rgba(232,135,30,0.3), 0 0 20px rgba(232,135,30,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(232,135,30,0.15)";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#7A99B8" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#E8871E")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#7A99B8")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-transparent font-bold tracking-[0.2em] rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(232,135,30,0.4)]"
                style={{
                  border: "2px solid #E8871E",
                  color: "#E8871E",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#E8871E";
                  e.currentTarget.style.color = "#03080F";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#E8871E";
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "INICIAR"}
              </Button>
            </div>
          </form>
        </div>

        {/* Footer - futuristic */}
        <div className="mt-8 flex items-center gap-3">
          <div className="w-8 h-px" style={{ backgroundColor: "rgba(232,135,30,0.3)" }} />
          <p className="text-[10px] tracking-[0.25em] font-mono" style={{ color: "#7A99B8" }}>
            EV DASHBOARD
          </p>
          <div className="w-8 h-px" style={{ backgroundColor: "rgba(232,135,30,0.3)" }} />
        </div>

        {/* Decorative neon line at bottom */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-px"
          style={{
            background: "linear-gradient(90deg, transparent, #E8871E, transparent)",
            boxShadow: "0 0 8px rgba(232,135,30,0.5)",
          }}
        />
      </div>
    </div>
  );
}
