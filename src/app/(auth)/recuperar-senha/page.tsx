"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/primeiro-acesso`,
      });

      if (error) {
        toast.error("Erro ao enviar e-mail", { description: error.message });
        return;
      }

      setSent(true);
      toast.success("E-mail enviado com sucesso!");
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-10 animate-[fadeIn_0.6s_ease-out]">
        <img src="/images/logo-mobyou.jpg" alt="MOBYOU" className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(212,115,26,0.3)]"
          onError={(e) => { (e.target as HTMLImageElement).src = "/images/logo-mobyou.jpg"; }} />

        <div className="w-full relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#D4731A]/20 via-white/[0.05] to-transparent p-px">
            <div className="w-full h-full rounded-2xl bg-[#0c1525]" />
          </div>
          <div className="relative p-8 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#D4731A]/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-[#D4731A]" />
            </div>
            <h2 className="text-xl font-bold text-white">E-mail enviado!</h2>
            <p className="text-sm text-[#5a7090]">
              Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
            </p>
            <Link href="/login">
              <Button variant="outline" className="mt-4 border-[#1a2e48] text-[#8aa0be] hover:bg-[#0a1220] hover:text-white rounded-xl">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao login
              </Button>
            </Link>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-10 animate-[fadeIn_0.6s_ease-out]">
      <img src="/images/logo-mobyou.jpg" alt="MOBYOU" className="w-28 h-28 object-contain drop-shadow-[0_0_30px_rgba(212,115,26,0.3)]"
        onError={(e) => { (e.target as HTMLImageElement).src = "/images/logo-mobyou.jpg"; }} />

      <div className="w-full relative rounded-2xl overflow-hidden animate-[slideUp_0.5s_ease-out_0.2s_both]">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#D4731A]/20 via-white/[0.05] to-transparent p-px">
          <div className="w-full h-full rounded-2xl bg-[#0c1525]" />
        </div>
        <div className="relative p-6 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
            <p className="text-sm text-[#5a7090]">Informe seu e-mail para receber o link de recuperação</p>
          </div>
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#8aa0be] text-sm font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#3d5575]" />
                <Input id="email" type="email" placeholder="seu@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-[#0a1220] border-[#1a2e48] text-white placeholder:text-[#2d4560] rounded-xl focus:border-[#D4731A] focus:ring-1 focus:ring-[#D4731A]/30 transition-all"
                  required />
              </div>
            </div>
            <Button type="submit"
              className="w-full h-12 bg-gradient-to-r from-[#D4731A] to-[#E8871E] hover:from-[#c06816] hover:to-[#d47a18] text-white font-bold text-sm tracking-widest rounded-xl shadow-[0_4px_20px_rgba(212,115,26,0.35)] transition-all active:scale-[0.98]"
              disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : "ENVIAR LINK"}
            </Button>
            <div className="text-center pt-2">
              <Link href="/login" className="text-sm text-[#D4731A] hover:text-[#E8871E] transition-colors">
                <ArrowLeft className="inline mr-1 h-3 w-3" />Voltar ao login
              </Link>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
