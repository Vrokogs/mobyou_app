"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <Card className="border-0 shadow-xl">
        <CardContent className="pt-8 text-center space-y-4">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <h2 className="text-xl font-bold">E-mail enviado!</h2>
          <p className="text-muted-foreground">
            Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          </p>
          <Link href="/login">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
        <CardDescription>
          Informe seu e-mail para receber o link de recuperação
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</>
            ) : (
              "Enviar link de recuperação"
            )}
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm text-primary hover:underline">
              <ArrowLeft className="inline mr-1 h-3 w-3" />
              Voltar ao login
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
