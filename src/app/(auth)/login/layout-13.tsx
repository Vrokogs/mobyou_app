"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout13() {
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
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* CSS animations injected via style tag */}
      <style jsx global>{`
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          25% {
            background-position: 50% 100%;
          }
          50% {
            background-position: 100% 50%;
          }
          75% {
            background-position: 50% 0%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        @keyframes floatLogo {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        .animated-gradient-bg {
          background: linear-gradient(
            -45deg,
            #060D18,
            #0B1A2D,
            #0A2A3A,
            #091E30,
            #0D2845,
            #061520
          );
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        .floating-logo {
          animation: floatLogo 4s ease-in-out infinite;
        }
      `}</style>

      <div className="animated-gradient-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle ambient glows that complement the gradient */}
        <div className="absolute top-[10%] left-[10%] w-[300px] h-[300px] rounded-full bg-[#0A2A3A]/40 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#0D2845]/30 blur-[130px]" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-sm">
          {/* Floating logo */}
          <div className="flex justify-center mb-10">
            <div className="floating-logo">
              <img
                src="/images/logo-mobyou.jpg"
                alt="MOBYOU"
                className="w-28 h-28 object-contain rounded-2xl shadow-[0_0_50px_rgba(201,107,29,0.2)]"
              />
            </div>
          </div>

          {/* Semi-transparent card */}
          <div className="bg-[#0B1A2D]/60 backdrop-blur-md border border-white/5 rounded-2xl p-7 shadow-[0_20px_80px_rgba(0,0,0,0.4)]">
            <h2 className="text-white text-lg font-medium text-center mb-6 tracking-wide">
              Acesse sua conta
            </h2>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-white/30 text-xs tracking-wider mb-1.5 block uppercase">
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-white/5 border border-white/8 rounded-lg text-white placeholder:text-white/15 px-4 text-sm focus:border-[#C96B1D]/50 focus:ring-0 transition-all"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-white/30 text-xs tracking-wider uppercase">Senha</label>
                  <Link
                    href="/recuperar-senha"
                    className="text-xs text-[#C96B1D]/80 hover:text-[#C96B1D] transition-colors"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-white/5 border border-white/8 rounded-lg text-white placeholder:text-white/15 px-4 pr-12 text-sm focus:border-[#C96B1D]/50 focus:ring-0 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#C96B1D] hover:bg-[#E89030] text-white font-bold tracking-wider rounded-lg shadow-[0_0_40px_rgba(201,107,29,0.35)] hover:shadow-[0_0_50px_rgba(201,107,29,0.5)] transition-all active:scale-[0.97] border-none"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
                </Button>
              </div>
            </form>
          </div>

          <p className="mt-10 text-center text-[10px] text-white/10 tracking-[0.4em] uppercase">
            Mobilidade Elétrica
          </p>
        </div>
      </div>
    </>
  );
}
