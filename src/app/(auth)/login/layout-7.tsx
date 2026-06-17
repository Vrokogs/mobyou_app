"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout7() {
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
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
        return;
      }
      const userId = authData.user?.id;
      const role = authData.user?.user_metadata?.role || "cliente";
      if (userId) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single();
        const finalRole = profile?.role || role;
        router.push({ gestor: "/gestor", vendedor: "/vendedor", tecnico: "/tecnico", cliente: "/cliente" }[finalRole] || "/cliente");
        router.refresh();
      }
    } catch { toast.error("Erro inesperado"); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: "#000000" }}>
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo with reflection effect */}
        <div className="relative mb-12 flex flex-col items-center">
          <img
            src="/images/logo-mobyou.jpg"
            alt="MOBYOU"
            className="w-32 h-32 object-contain rounded-xl"
            style={{ boxShadow: "0 0 40px rgba(212,148,26,0.1)" }}
          />
          {/* Reflection */}
          <div className="relative w-32 h-16 overflow-hidden mt-1">
            <img
              src="/images/logo-mobyou.jpg"
              alt=""
              className="w-32 h-32 object-contain rounded-xl absolute top-0"
              style={{
                transform: "scaleY(-1)",
                opacity: 0.15,
                maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
                WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)",
              }}
            />
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-xl p-8 sm:p-10"
          style={{
            backgroundColor: "#0A0A0A",
            border: "1px solid #111",
          }}
        >
          <h1 className="text-center text-sm tracking-[0.4em] uppercase mb-1" style={{ color: "#D4941A" }}>
            Acesso
          </h1>
          <p className="text-center text-xs mb-10 tracking-wider" style={{ color: "#555" }}>
            Insira suas credenciais
          </p>

          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="text-[11px] uppercase tracking-[0.2em] mb-3 block" style={{ color: "#999" }}>
                E-mail
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-none border-0 border-b text-white placeholder:text-[#333] focus:ring-0 px-0 text-sm"
                style={{
                  backgroundColor: "transparent",
                  borderBottomColor: "#222",
                }}
                onFocus={(e) => {
                  e.target.style.borderBottomColor = "#D4941A";
                }}
                onBlur={(e) => {
                  e.target.style.borderBottomColor = "#222";
                }}
                required
              />
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "#999" }}>
                  Senha
                </label>
                <Link href="/recuperar-senha" className="text-[11px] tracking-wider transition-colors" style={{ color: "#D4941A" }}>
                  Recuperar
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-none border-0 border-b text-white placeholder:text-[#333] pr-10 focus:ring-0 px-0 text-sm"
                  style={{
                    backgroundColor: "transparent",
                    borderBottomColor: "#222",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderBottomColor = "#D4941A";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderBottomColor = "#222";
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#555" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#D4941A")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-sm font-bold tracking-[0.2em] rounded-sm border-0 transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #B8800D, #D4941A, #C98A15)",
                  color: "#000",
                  boxShadow: "0 4px 20px rgba(212,148,26,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 30px rgba(212,148,26,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,148,26,0.2)";
                }}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
              </Button>
            </div>
          </form>
        </div>

        {/* Luxury footer */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, #D4941A, transparent)" }} />
          <p className="text-[10px] tracking-[0.4em] uppercase" style={{ color: "#333" }}>
            Premium Mobility
          </p>
        </div>
      </div>
    </div>
  );
}
