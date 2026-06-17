"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Layout2() {
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050A12]">
      {/* Lado esquerdo - branding escuro */}
      <div className="lg:w-[45%] flex flex-col items-center justify-center p-8 lg:p-16 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1A2D] to-[#050A12]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#C96B1D]/[0.05] rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left max-w-xs">
          <img src="/images/logo-mobyou.jpg" alt="MOBYOU" className="w-36 h-36 lg:w-44 lg:h-44 object-contain rounded-xl mb-8" />
          <h2 className="text-white text-2xl lg:text-3xl font-bold leading-tight mb-3">
            Gestão completa<br />
            <span className="text-[#C96B1D]">de e-scooters</span>
          </h2>
          <p className="text-[#5A7A9A] text-sm leading-relaxed hidden lg:block">
            Vendas, manutenção, garantias, contratos e documentos em uma única plataforma.
          </p>
          <div className="hidden lg:flex gap-6 mt-8">
            <div className="text-center">
              <p className="text-[#C96B1D] text-2xl font-bold">4</p>
              <p className="text-[#5A7A9A] text-[10px] uppercase tracking-wider">Perfis</p>
            </div>
            <div className="w-px bg-[#1B3352]" />
            <div className="text-center">
              <p className="text-[#C96B1D] text-2xl font-bold">100%</p>
              <p className="text-[#5A7A9A] text-[10px] uppercase tracking-wider">Digital</p>
            </div>
            <div className="w-px bg-[#1B3352]" />
            <div className="text-center">
              <p className="text-[#C96B1D] text-2xl font-bold">24/7</p>
              <p className="text-[#5A7A9A] text-[10px] uppercase tracking-wider">Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lado direito - formulário */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative">
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[#C96B1D]/20 to-transparent hidden lg:block" />

        <div className="w-full max-w-sm">
          <h1 className="text-white text-xl font-bold mb-1">Bem-vindo de volta</h1>
          <p className="text-[#5A7A9A] text-sm mb-8">Entre com suas credenciais</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[#8DA4BE] text-xs font-medium mb-1.5 block">E-mail</label>
              <Input type="email" placeholder="seu@email.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-[#0B1A2D] border-[#1B3352] text-white placeholder:text-[#2A4A6A] rounded-xl focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/20"
                required />
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[#8DA4BE] text-xs font-medium">Senha</label>
                <Link href="/recuperar-senha" className="text-xs text-[#C96B1D]">Esqueceu?</Link>
              </div>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-[#0B1A2D] border-[#1B3352] text-white placeholder:text-[#2A4A6A] rounded-xl pr-10 focus:border-[#C96B1D] focus:ring-1 focus:ring-[#C96B1D]/20"
                  required />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3A5A7A] hover:text-white">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}
              className="w-full h-12 bg-[#C96B1D] hover:bg-[#B5601A] text-white font-semibold tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>ENTRAR</span><ArrowRight className="h-4 w-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
