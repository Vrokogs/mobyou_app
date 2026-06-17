"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout8() {
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Top half - navy */}
      <div className="absolute top-0 left-0 right-0 h-1/2" style={{ backgroundColor: "#0B1A2D" }} />

      {/* Bottom half - orange */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2" style={{ backgroundColor: "#C96B1D" }} />

      {/* Logo in the navy section */}
      <div className="absolute top-[12%] left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <img
          src="/images/logo-mobyou.jpg"
          alt="MOBYOU"
          className="w-20 h-20 object-contain rounded-xl"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
        />
        <h1 className="text-white text-sm font-bold tracking-[0.3em] mt-3">MOBYOU</h1>
      </div>

      {/* Card overlapping both halves */}
      <div
        className="relative z-20 w-full max-w-[420px] bg-white rounded-2xl overflow-hidden"
        style={{
          boxShadow: "0 25px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div className="p-8 sm:p-10">
          <h2 className="text-xl font-bold mb-1" style={{ color: "#0B1A2D" }}>
            Entrar na conta
          </h2>
          <p className="text-sm mb-8" style={{ color: "#9CA3AF" }}>
            Preencha seus dados para continuar
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "#6B7280" }}>
                E-mail
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl text-sm"
                style={{
                  backgroundColor: "#F9FAFB",
                  borderColor: "#E5E7EB",
                  color: "#1F2937",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#0B1A2D";
                  e.target.style.boxShadow = "0 0 0 3px rgba(11,26,45,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E5E7EB";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>
                  Senha
                </label>
                <Link href="/recuperar-senha" className="text-xs font-medium" style={{ color: "#C96B1D" }}>
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl text-sm pr-10"
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderColor: "#E5E7EB",
                    color: "#1F2937",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#0B1A2D";
                    e.target.style.boxShadow = "0 0 0 3px rgba(11,26,45,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7EB";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#0B1A2D")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white font-bold tracking-wider rounded-xl transition-all active:scale-[0.98]"
                style={{
                  backgroundColor: "#0B1A2D",
                  boxShadow: "0 4px 12px rgba(11,26,45,0.3)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0F2340")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0B1A2D")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
              </Button>
            </div>
          </form>
        </div>

        {/* Bottom bar inside card */}
        <div className="px-8 pb-6 pt-2">
          <div className="flex items-center justify-center gap-2 pt-4" style={{ borderTop: "1px solid #F3F4F6" }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#C96B1D" }} />
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "#D1D5DB" }}>
              Mobilidade Elétrica
            </p>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#0B1A2D" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
