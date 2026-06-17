"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout12() {
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
    <div className="min-h-screen bg-[#F0EDE6] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo with thick border box */}
        <div className="border-[3px] border-[#0B1A2D] p-6 mb-8 flex items-center gap-6">
          <img
            src="/images/logo-mobyou.jpg"
            alt="MOBYOU"
            className="w-20 h-20 object-contain rounded-none"
          />
          <div>
            <h1 className="text-[#0B1A2D] text-4xl font-black uppercase tracking-[0.2em]">
              MOBYOU
            </h1>
            <p className="text-[#0B1A2D]/50 text-xs uppercase tracking-[0.4em] mt-1 font-bold">
              Mobilidade Elétrica
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[#0B1A2D] text-sm font-black uppercase tracking-[0.15em] mb-3 block">
              E-MAIL
            </label>
            <input
              type="email"
              placeholder="SEU@EMAIL.COM"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 bg-transparent border-[2px] border-[#0B1A2D] rounded-none text-[#0B1A2D] placeholder:text-[#0B1A2D]/25 px-4 text-base font-mono focus:outline-none focus:border-[#0B1A2D] focus:ring-2 focus:ring-[#0B1A2D]/20 uppercase"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[#0B1A2D] text-sm font-black uppercase tracking-[0.15em]">
                SENHA
              </label>
              <Link
                href="/recuperar-senha"
                className="text-sm text-[#0B1A2D] font-bold uppercase underline underline-offset-4 decoration-2 hover:decoration-[#0B1A2D]/50 transition-all"
              >
                ESQUECEU?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="SUA SENHA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 bg-transparent border-[2px] border-[#0B1A2D] rounded-none text-[#0B1A2D] placeholder:text-[#0B1A2D]/25 px-4 pr-14 text-base font-mono focus:outline-none focus:border-[#0B1A2D] focus:ring-2 focus:ring-[#0B1A2D]/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#0B1A2D]/40 hover:text-[#0B1A2D] transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-[#0B1A2D] hover:bg-[#132D4A] text-white font-black text-base uppercase tracking-[0.2em] rounded-none border-none transition-colors active:bg-black disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ENTRAR"}
            </button>
          </div>
        </form>

        {/* Bottom border line */}
        <div className="mt-10 border-t-[3px] border-[#0B1A2D] pt-4">
          <p className="text-[#0B1A2D]/30 text-xs font-black uppercase tracking-[0.3em] text-center">
            Sistema de Gestao
          </p>
        </div>
      </div>
    </div>
  );
}
