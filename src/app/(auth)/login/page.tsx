"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="border-0 shadow-2xl shadow-black/5">
      <CardHeader className="text-center space-y-3 pb-2">
        {/* Logo visible only on mobile (already shown on desktop left panel) */}
        <div className="lg:hidden mx-auto w-16 h-16 mb-1">
          <img
            src="/images/logo-mobyou.svg"
            alt="MOBYOU"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
        <CardTitle className="text-2xl font-bold text-[#0A1628]">
          Bem-vindo
        </CardTitle>
        <CardDescription className="text-sm">
          Entre com suas credenciais para acessar o sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#0A1628] font-medium">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6577]" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-11 bg-white border-[#d5d9e0] focus:border-[#D4731A] focus:ring-[#D4731A]/20"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-[#0A1628] font-medium">Senha</Label>
              <Link
                href="/recuperar-senha"
                className="text-sm text-[#D4731A] hover:text-[#E8871E] hover:underline font-medium"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6577]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11 bg-white border-[#d5d9e0] focus:border-[#D4731A] focus:ring-[#D4731A]/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6577] hover:text-[#0A1628]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-[#D4731A] hover:bg-[#c06816] text-white font-semibold text-sm tracking-wide shadow-lg shadow-[#D4731A]/25 transition-all active:scale-[0.98]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "ENTRAR"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#e8eaef] text-center">
          <p className="text-xs text-[#5a6577]">
            MOBYOU Litoral Norte &bull; Mobilidade Elétrica
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
