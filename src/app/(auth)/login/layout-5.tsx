"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout5() {
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #081828 100%)" }}
    >
      {/* Diagonal warm orange line */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[200%] h-[2px]"
          style={{
            backgroundColor: "#D4731A",
            top: "45%",
            left: "-50%",
            transform: "rotate(-25deg)",
            boxShadow: "0 0 30px rgba(212,115,26,0.3), 0 0 60px rgba(212,115,26,0.1)",
          }}
        />
        {/* Secondary faint line */}
        <div
          className="absolute w-[200%] h-[1px] opacity-20"
          style={{
            backgroundColor: "#D4731A",
            top: "50%",
            left: "-50%",
            transform: "rotate(-25deg)",
          }}
        />
      </div>

      {/* Subtle gradient orbs */}
      <div className="absolute top-[10%] right-[10%] w-[300px] h-[300px] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle, #CF7A2A, transparent 70%)" }}
      />
      <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #081828, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        {/* Logo centered above card */}
        <img
          src="/images/logo-mobyou.jpg"
          alt="MOBYOU"
          className="w-24 h-24 object-contain rounded-2xl mb-8"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
        />

        {/* Frosted glass card */}
        <div
          className="w-full rounded-3xl p-8 sm:p-10 backdrop-blur-xl border"
          style={{
            backgroundColor: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <h1 className="text-white text-xl font-semibold mb-1">Entrar</h1>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.4)" }}>
            Acesse sua conta MOBYOU
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "rgba(255,255,255,0.5)" }}>
                E-mail
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-white placeholder:text-white/20 focus:ring-1 transition-all"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  borderColor: "rgba(255,255,255,0.1)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#CF7A2A";
                  e.target.style.boxShadow = "0 0 0 3px rgba(207,122,42,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.1)";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Senha
                </label>
                <Link href="/recuperar-senha" className="text-xs transition-colors" style={{ color: "#CF7A2A" }}>
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl text-white placeholder:text-white/20 pr-10 focus:ring-1 transition-all"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    borderColor: "rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#CF7A2A";
                    e.target.style.boxShadow = "0 0 0 3px rgba(207,122,42,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#CF7A2A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white font-semibold tracking-wide rounded-xl transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #CF7A2A, #D4731A)",
                  boxShadow: "0 8px 24px rgba(207,122,42,0.3)",
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mt-8">
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
            <span className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>
              Mobilidade Elétrica
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.08)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
