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
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error("Erro ao fazer login", {
          description: error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos"
            : error.message,
        });
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").single();

      if (profile) {
        const routes: Record<string, string> = {
          gestor: "/gestor", vendedor: "/vendedor",
          tecnico: "/tecnico", cliente: "/cliente",
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
    <div className="flex flex-col items-center gap-8 animate-[fadeIn_0.6s_ease-out]">
      {/* Logo */}
      <div className="relative">
        <div className="absolute inset-0 bg-[#C96B1D]/10 rounded-full blur-[40px] scale-110" />
        <img
          src="/images/logo-mobyou.jpg"
          alt="MOBYOU"
          className="relative w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
        />
      </div>

      {/* Card */}
      <div className="w-full animate-[slideUp_0.5s_ease-out_0.15s_both]">
        <div className="rounded-2xl border border-[#1B3352]/60 bg-[#0B1A2D]/90 backdrop-blur-sm p-6 sm:p-8">
          <div className="text-center mb-7">
            <h1 className="text-xl sm:text-2xl font-bold text-white/95 tracking-tight">
              Entrar na sua conta
            </h1>
            <p className="text-sm text-[#6B87A8] mt-1.5">
              Informe suas credenciais para acessar
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[#8DA4BE] text-sm">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3A5A7A]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-[#081320] border-[#1B3352] text-white placeholder:text-[#2A4A6A] rounded-xl focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/25 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[#8DA4BE] text-sm">Senha</Label>
                <Link href="/recuperar-senha" className="text-xs text-[#C96B1D] hover:text-[#E89030] transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3A5A7A]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 bg-[#081320] border-[#1B3352] text-white placeholder:text-[#2A4A6A] rounded-xl focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/25 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3A5A7A] hover:text-[#8DA4BE] transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#A65D1A] via-[#C96B1D] to-[#E89030] hover:from-[#934F14] hover:via-[#B5601A] hover:to-[#D4802A] text-white font-bold text-sm tracking-widest rounded-xl shadow-[0_4px_24px_rgba(201,107,29,0.3)] hover:shadow-[0_6px_32px_rgba(201,107,29,0.45)] transition-all duration-300 active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />ENTRANDO...</>
                ) : (
                  "ENTRAR"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <p className="text-[11px] text-[#2A4A6A] tracking-widest animate-[fadeIn_0.5s_ease-out_0.5s_both]">
        LITORAL NORTE &bull; MOBILIDADE ELÉTRICA
      </p>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
