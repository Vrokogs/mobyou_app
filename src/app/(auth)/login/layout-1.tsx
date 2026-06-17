"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout1() {
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
    <div className="min-h-screen flex items-center justify-center bg-[#050A12] p-4 relative overflow-hidden">
      {/* Sutil glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#C96B1D]/[0.06] rounded-full blur-[150px]" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo grande */}
        <img src="/images/logo-mobyou.jpg" alt="MOBYOU" className="w-40 h-40 object-contain mb-10 rounded-xl" />

        {/* Form sem card - minimalista */}
        <form onSubmit={handleLogin} className="w-full space-y-5">
          <div>
            <label className="text-xs text-[#6B87A8] uppercase tracking-widest mb-2 block">E-mail</label>
            <Input
              type="email" placeholder="seu@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-13 bg-transparent border-b-2 border-t-0 border-x-0 border-[#1B3352] rounded-none text-white placeholder:text-[#2A4A6A] focus:border-[#C96B1D] focus:ring-0 px-0 text-base"
              required
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-xs text-[#6B87A8] uppercase tracking-widest">Senha</label>
              <Link href="/recuperar-senha" className="text-xs text-[#C96B1D] hover:text-[#E89030]">Esqueceu?</Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-13 bg-transparent border-b-2 border-t-0 border-x-0 border-[#1B3352] rounded-none text-white placeholder:text-[#2A4A6A] focus:border-[#C96B1D] focus:ring-0 px-0 pr-10 text-base"
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-[#3A5A7A] hover:text-white transition-colors">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" disabled={loading}
              className="w-full h-12 bg-[#C96B1D] hover:bg-[#B5601A] text-white font-bold tracking-widest rounded-full shadow-[0_0_30px_rgba(201,107,29,0.3)] transition-all active:scale-[0.97]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
            </Button>
          </div>
        </form>

        <p className="mt-12 text-[10px] text-[#2A4A6A] tracking-[0.3em]">MOBILIDADE ELÉTRICA</p>
      </div>
    </div>
  );
}
