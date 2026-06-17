"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function PrimeiroAcessoPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error("Erro ao definir senha", { description: error.message });
        return;
      }

      toast.success("Senha definida com sucesso!");
      router.push("/login");
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  const requirements = [
    { met: password.length >= 6, text: "Pelo menos 6 caracteres" },
    { met: /[A-Z]/.test(password), text: "Uma letra maiúscula" },
    { met: /[0-9]/.test(password), text: "Um número" },
    { met: password === confirmPassword && password.length > 0, text: "Senhas coincidem" },
  ];

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-2">
          <Lock className="h-7 w-7 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold">Definir Senha</CardTitle>
        <CardDescription>
          Crie uma senha segura para acessar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Sua nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                placeholder="Confirme a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <div className="space-y-2 p-3 rounded-lg bg-muted">
            {requirements.map((req) => (
              <div key={req.text} className="flex items-center gap-2 text-sm">
                <CheckCircle className={`h-4 w-4 ${req.met ? "text-emerald-500" : "text-muted-foreground"}`} />
                <span className={req.met ? "text-emerald-700" : "text-muted-foreground"}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
            ) : (
              "Definir Senha"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
