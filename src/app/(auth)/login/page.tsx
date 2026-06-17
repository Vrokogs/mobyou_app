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
    <div className="flex flex-col items-center gap-8">
      {/* Logo acima do card */}
      <div className="flex flex-col items-center gap-3">
        <img
          src="/images/logo-mobyou.svg"
          alt="MOBYOU"
          className="w-28 h-28 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Card de login */}
      <Card className="w-full border-0 shadow-2xl shadow-black/20 bg-white/95 backdrop-blur">
        <CardHeader className="text-center space-y-1 pb-2">
          <CardTitle className="text-xl font-bold text-[#0A1628]">
            Entrar na sua conta
          </CardTitle>
          <CardDescription className="text-sm text-[#5a6577]">
            Informe suas credenciais para acessar
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
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-xs text-white/30">
        MOBYOU Litoral Norte &bull; Mobilidade Elétrica
      </p>
    </div>
  );
}
