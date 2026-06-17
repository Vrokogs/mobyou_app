"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout11() {
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
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0B1A2D]">
      {/* Background gradient circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#132D4A] opacity-80 blur-[80px]" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#1A3D5C] opacity-70 blur-[100px]" />
      <div className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full bg-[#0F2840] opacity-60 blur-[90px]" />
      <div className="absolute bottom-[20%] left-[15%] w-[350px] h-[350px] rounded-full bg-[#163050] opacity-50 blur-[70px]" />
      <div className="absolute top-[10%] left-[40%] w-[250px] h-[250px] rounded-full bg-[#1A4060] opacity-40 blur-[60px]" />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-[0_8px_60px_rgba(0,0,0,0.3)]">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="/images/logo-mobyou.jpg"
            alt="MOBYOU"
            className="w-16 h-16 object-contain rounded-xl opacity-90"
          />
        </div>

        <h2 className="text-center text-white/90 text-xl font-light mb-1 tracking-wide">
          Bem-vindo ao
        </h2>
        <h1 className="text-center text-white text-2xl font-semibold mb-8 tracking-widest">
          MOBYOU
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-white/40 text-xs tracking-wider mb-2 block">E-MAIL</label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 px-4 text-sm focus:border-white/30 focus:ring-0 focus:bg-white/10 transition-all"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-white/40 text-xs tracking-wider">SENHA</label>
              <Link
                href="/recuperar-senha"
                className="text-xs text-[#C96B1D] hover:text-[#E89030] transition-colors"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 px-4 pr-12 text-sm focus:border-white/30 focus:ring-0 focus:bg-white/10 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#C96B1D] hover:bg-[#E89030] text-white font-semibold tracking-wider rounded-xl shadow-[0_4px_30px_rgba(201,107,29,0.3)] transition-all active:scale-[0.98] border-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
            </Button>
          </div>
        </form>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-white/10" />
          <span className="text-[10px] text-white/20 tracking-[0.3em] uppercase">Mobilidade Elétrica</span>
          <div className="h-px w-12 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
