"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout10() {
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - Orange (hidden on mobile, 40% on desktop) */}
      <div className="hidden lg:flex lg:w-[40%] bg-[#C96B1D] relative flex-col items-center justify-center">
        {/* White overlay for logo */}
        <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-10 flex flex-col items-center">
          <img
            src="/images/logo-mobyou.jpg"
            alt="MOBYOU"
            className="w-32 h-32 object-contain rounded-2xl mb-6"
          />
          <h1 className="text-white text-5xl font-black tracking-widest">MOBYOU</h1>
          <p className="text-white/60 text-sm tracking-[0.3em] mt-3 uppercase">Mobilidade Elétrica</p>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-10 left-10 w-24 h-24 rounded-full border border-white/10" />
        <div className="absolute bottom-20 right-14 w-40 h-40 rounded-full border border-white/10" />
        <div className="absolute top-1/4 right-8 w-16 h-16 rounded-full bg-white/5" />
      </div>

      {/* Right panel - Dark navy (full on mobile, 60% on desktop) */}
      <div className="flex-1 bg-[#0B1A2D] flex flex-col items-center justify-center p-6 min-h-screen lg:min-h-0">
        {/* Mobile logo */}
        <div className="lg:hidden flex flex-col items-center mb-12">
          <img
            src="/images/logo-mobyou.jpg"
            alt="MOBYOU"
            className="w-24 h-24 object-contain rounded-xl mb-4"
          />
          <h2 className="text-white text-2xl font-bold tracking-widest">MOBYOU</h2>
        </div>

        <div className="w-full max-w-md">
          <h2 className="hidden lg:block text-white text-3xl font-bold mb-2">Bem-vindo de volta</h2>
          <p className="hidden lg:block text-[#4A6A8A] text-sm mb-10">Entre com suas credenciais para continuar</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-[#4A6A8A] text-xs uppercase tracking-wider mb-2 block font-semibold">
                E-mail
              </label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-13 bg-[#0F2137] border border-[#1B3352] rounded-lg text-white placeholder:text-[#2A4A6A] px-4 text-base focus:border-[#C96B1D] focus:ring-0"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[#4A6A8A] text-xs uppercase tracking-wider font-semibold">
                  Senha
                </label>
                <Link href="/recuperar-senha" className="text-xs text-[#C96B1D] hover:text-[#E89030] transition-colors">
                  Esqueceu?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-13 bg-[#0F2137] border border-[#1B3352] rounded-lg text-white placeholder:text-[#2A4A6A] px-4 pr-12 text-base focus:border-[#C96B1D] focus:ring-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3A5A7A] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-13 bg-[#0B1A2D] hover:bg-[#132D4A] border-2 border-[#1B3352] text-white font-bold tracking-wider rounded-lg transition-all active:scale-[0.98] lg:bg-[#C96B1D] lg:hover:bg-[#B5601A] lg:border-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "ENTRAR"}
            </Button>
          </form>
        </div>

        <p className="mt-auto lg:mt-16 pb-6 text-[10px] text-[#1B3352] tracking-[0.3em] uppercase">
          MOBYOU &copy; 2024
        </p>
      </div>
    </div>
  );
}
