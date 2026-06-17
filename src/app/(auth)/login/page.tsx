"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Erro ao fazer login", {
          description: error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos"
            : error.message,
        });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .single();

      if (profile) {
        const routes: Record<string, string> = {
          gestor: "/gestor",
          vendedor: "/vendedor",
          tecnico: "/tecnico",
          cliente: "/cliente",
        };
        router.push(routes[profile.role] || "/cliente");
        router.refresh();
      }
    } catch {
      toast.error("Erro inesperado ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-10 animate-[fadeIn_0.6s_ease-out]">
      {/* Logo */}
      <div className="relative">
        <div className="absolute inset-0 bg-[#D4731A]/15 rounded-full blur-[50px]" />
        <img
          src="/images/logo-mobyou.svg"
          alt="MOBYOU"
          className="relative w-32 h-32 sm:w-36 sm:h-36 object-contain"
        />
      </div>

      {/* Login card with glassmorphism */}
      <div className="w-full animate-[slideUp_0.5s_ease-out_0.2s_both]">
        <div className="relative rounded-2xl overflow-hidden">
          {/* Card border gradient */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#D4731A]/20 via-white/[0.05] to-transparent p-px">
            <div className="w-full h-full rounded-2xl bg-[#0c1525]" />
          </div>

          {/* Card content */}
          <div className="relative p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">
                Entrar na sua conta
              </h1>
              <p className="text-sm text-[#5a7090] font-light tracking-wide">
                Informe suas credenciais para acessar
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#8aa0be] text-sm font-medium">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3d5575]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-11 h-12 bg-[#0a1220] border-[#1a2e48] text-white placeholder:text-[#2d4560] rounded-xl focus:border-[#D4731A] focus:ring-1 focus:ring-[#D4731A]/30 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#8aa0be] text-sm font-medium">
                    Senha
                  </Label>
                  <Link
                    href="/recuperar-senha"
                    className="text-xs text-[#D4731A] hover:text-[#E8871E] transition-colors font-medium"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3d5575]" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 pr-11 h-12 bg-[#0a1220] border-[#1a2e48] text-white placeholder:text-[#2d4560] rounded-xl focus:border-[#D4731A] focus:ring-1 focus:ring-[#D4731A]/30 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3d5575] hover:text-[#8aa0be] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#D4731A] to-[#E8871E] hover:from-[#c06816] hover:to-[#d47a18] text-white font-bold text-sm tracking-widest rounded-xl shadow-[0_4px_20px_rgba(212,115,26,0.35)] hover:shadow-[0_6px_30px_rgba(212,115,26,0.5)] transition-all duration-300 active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ENTRANDO...
                    </>
                  ) : (
                    "ENTRAR"
                  )}
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="mt-8 flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#1a2e48]" />
              <span className="text-[10px] text-[#3d5575] tracking-widest uppercase">Mobyou</span>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#1a2e48]" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[11px] text-[#2d4560] tracking-wider animate-[fadeIn_0.5s_ease-out_0.6s_both]">
        LITORAL NORTE &bull; MOBILIDADE ELÉTRICA
      </p>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
