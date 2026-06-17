"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Zap } from "lucide-react";

export default function Layout3() {
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
    <div className="min-h-screen flex items-center justify-center bg-[#050A12] p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-[#C96B1D]/[0.03] to-transparent" />
        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-[#0B1A2D]/50 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Card com accent top */}
        <div className="rounded-3xl overflow-hidden bg-[#0B1A2D] shadow-2xl shadow-black/50">
          {/* Barra laranja no topo */}
          <div className="h-1.5 bg-gradient-to-r from-[#A65D1A] via-[#C96B1D] to-[#E89030]" />

          <div className="p-8 sm:p-10">
            {/* Header com logo e texto lado a lado */}
            <div className="flex items-center gap-5 mb-10">
              <img src="/images/logo-mobyou.jpg" alt="MOBYOU" className="w-20 h-20 object-contain rounded-xl flex-shrink-0" />
              <div>
                <h1 className="text-white text-lg font-bold tracking-tight leading-tight">
                  Bem-vindo ao<br />
                  <span className="text-[#C96B1D] text-xl">MOBYOU</span>
                </h1>
                <p className="text-[#5A7A9A] text-xs mt-1">Litoral Norte</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[#8DA4BE] text-xs font-medium mb-1.5 block">E-mail</label>
                <Input type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-[#081320] border-[#152840] text-white placeholder:text-[#2A4A6A] rounded-xl focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/20"
                  required />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[#8DA4BE] text-xs font-medium">Senha</label>
                  <Link href="/recuperar-senha" className="text-xs text-[#C96B1D] hover:text-[#E89030]">
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-[#081320] border-[#152840] text-white placeholder:text-[#2A4A6A] rounded-xl pr-10 focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/20"
                    required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A5A7A] hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <Button type="submit" disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-[#A65D1A] via-[#C96B1D] to-[#E89030] hover:brightness-110 text-white font-bold tracking-widest rounded-xl shadow-[0_8px_30px_rgba(201,107,29,0.25)] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Zap className="h-4 w-4" /><span>ACESSAR</span></>}
                </Button>
              </div>
            </form>

            {/* Footer dentro do card */}
            <div className="mt-8 pt-6 border-t border-[#152840] flex items-center justify-center gap-3">
              <Zap className="h-3 w-3 text-[#C96B1D]" />
              <span className="text-[10px] text-[#3A5A7A] tracking-[0.25em] uppercase">Mobilidade Elétrica</span>
              <Zap className="h-3 w-3 text-[#C96B1D]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
