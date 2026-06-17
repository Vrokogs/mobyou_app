"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
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
      if (!userId) {
        toast.error("Erro ao obter usuário");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        const role = authData.user?.user_metadata?.role || "cliente";
        const routes: Record<string, string> = { gestor: "/gestor", vendedor: "/vendedor", tecnico: "/tecnico", cliente: "/cliente" };
        router.push(routes[role] || "/cliente");
        router.refresh();
        return;
      }

      const routes: Record<string, string> = { gestor: "/gestor", vendedor: "/vendedor", tecnico: "/tecnico", cliente: "/cliente" };
      router.push(routes[profile.role] || "/cliente");
      router.refresh();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          25% { background-position: 50% 100%; }
          50% { background-position: 100% 50%; }
          75% { background-position: 50% 0%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animated-bg {
          background: #0B1A2D;
        }
        .float-logo {
          animation: floatLogo 4s ease-in-out infinite;
        }
        .fade-up {
          animation: fadeUp 0.6s ease-out both;
        }
        .fade-up-delay {
          animation: fadeUp 0.6s ease-out 0.15s both;
        }
      `}</style>

      <div className="animated-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

        <div className="relative z-10 w-full max-w-[440px]">
          {/* Floating logo */}
          <div className="flex justify-center mb-8 fade-up">
            <div className="float-logo">
              <img
                src="/images/logo-mobyou.jpg"
                alt="MOBYOU"
                className="w-28 h-28 object-contain rounded-2xl shadow-[0_0_50px_rgba(201,107,29,0.2)]"
              />
            </div>
          </div>

          {/* Corporate card with left orange border */}
          <div className="fade-up-delay rounded-xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            style={{ borderLeft: "4px solid #C96B1D" }}>
            <div className="bg-white p-8 sm:p-10">
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[#0B1A2D]">Bem-vindo de volta</h2>
                <p className="text-sm mt-0.5 text-[#9CA3AF]">Entre com suas credenciais para continuar</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-medium mb-1.5 block text-[#6B7280]">E-mail</label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-lg text-sm bg-white border-[#E5E7EB] text-[#1F2937] focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/15 transition-all"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-xs font-medium text-[#6B7280]">Senha</label>
                    <Link href="/recuperar-senha" className="text-xs font-medium text-[#C96B1D] hover:text-[#E8871E] transition-colors">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-lg text-sm pr-10 bg-white border-[#E5E7EB] text-[#1F2937] focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/15 transition-all"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#0B1A2D] transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" disabled={loading}
                    className="w-full h-11 bg-[#0B1A2D] hover:bg-[#0F2340] text-white font-semibold text-sm rounded-lg transition-all active:scale-[0.99]">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-5 border-t border-[#F3F4F6]">
                <p className="text-center text-[11px] text-[#D1D5DB]">
                  MOBYOU Mobilidade Elétrica — Todos os direitos reservados
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
