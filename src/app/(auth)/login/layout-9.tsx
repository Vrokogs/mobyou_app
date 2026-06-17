"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout9() {
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060D18] p-4">
      {/* Logo inside large circle with orange border */}
      <div className="w-[200px] h-[200px] rounded-full border-2 border-[#C96B1D] flex items-center justify-center mb-12 shadow-[0_0_60px_rgba(201,107,29,0.15)]">
        <img
          src="/images/logo-mobyou.jpg"
          alt="MOBYOU"
          className="w-[140px] h-[140px] object-contain rounded-full"
        />
      </div>

      {/* Form - centered, circular shapes */}
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-5 flex flex-col items-center">
        <Input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-14 bg-[#0D1B2E] border-none rounded-full text-white placeholder:text-[#3A5A7A] px-7 text-base focus:ring-2 focus:ring-[#C96B1D]/50"
          required
        />

        <div className="relative w-full">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-14 bg-[#0D1B2E] border-none rounded-full text-white placeholder:text-[#3A5A7A] px-7 pr-14 text-base focus:ring-2 focus:ring-[#C96B1D]/50"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-[#3A5A7A] hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        <Link
          href="/recuperar-senha"
          className="text-xs text-[#3A5A7A] hover:text-[#C96B1D] transition-colors self-center"
        >
          Esqueceu a senha?
        </Link>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-14 rounded-full bg-gradient-to-r from-[#C96B1D] to-[#E89030] hover:from-[#B5601A] hover:to-[#D47E25] text-white font-bold text-base tracking-wider shadow-[0_0_40px_rgba(201,107,29,0.3)] transition-all active:scale-[0.97] border-none"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "ENTRAR"}
        </Button>
      </form>

      <p className="mt-16 text-[10px] text-[#1B3352] tracking-[0.4em] uppercase">
        Mobilidade Elétrica
      </p>
    </div>
  );
}
