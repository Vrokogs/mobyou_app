"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { FormSuporte } from "@/components/suporte/form-suporte";
import { toast } from "sonner";
import {
  Loader2, Eye, EyeOff, Mail, Lock, BarChart3, Zap, ShieldCheck, Headphones,
} from "lucide-react";

const ROTAS: Record<string, string> = {
  gestor: "/gestor",
  vendedor: "/vendedor",
  tecnico: "/tecnico",
  cliente: "/cliente",
  dev: "/dev",
};

const DESTAQUES = [
  {
    icon: BarChart3,
    titulo: "Gestão completa",
    texto: "Acompanhe clientes, scooters, ordens e muito mais em tempo real.",
  },
  {
    icon: Zap,
    titulo: "Mais eficiência",
    texto: "Automatize processos e otimize o tempo da sua equipe.",
  },
  {
    icon: ShieldCheck,
    titulo: "Segurança garantida",
    texto: "Seus dados protegidos com tecnologia de ponta e acesso seguro.",
  },
  {
    icon: Headphones,
    titulo: "Suporte dedicado",
    texto: "Conte com nossa equipe sempre que precisar.",
  },
];

// Guarda só o e-mail digitado, para não precisar redigitar no próximo acesso.
// A senha nunca é gravada.
const CHAVE_EMAIL = "mobyou:ultimo-email";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lembrar, setLembrar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suporteAberto, setSuporteAberto] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_EMAIL);
      if (salvo) {
        setEmail(salvo);
        setLembrar(true);
      }
    } catch {
      // Navegador com armazenamento bloqueado: segue com o campo vazio.
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos"
            : error.message,
        );
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast.error("Erro ao obter usuário");
        return;
      }

      try {
        if (lembrar) localStorage.setItem(CHAVE_EMAIL, email);
        else localStorage.removeItem(CHAVE_EMAIL);
      } catch {
        // Sem armazenamento: entrar continua funcionando normalmente.
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      const role = profileError || !profile
        ? authData.user?.user_metadata?.role || "cliente"
        : profile.role;

      router.push(ROTAS[role] || "/cliente");
      router.refresh();
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Painel de apresentação. Some no celular para a tela virar só o formulário. */}
      <aside className="login-hero relative hidden w-1/2 flex-col justify-between p-10 text-white lg:flex xl:p-14">
        <img
          src="/images/logo-mobyou.png"
          alt="MOBYOU — Mobilidade Elétrica · Litoral Norte"
          className="relative w-40 rounded-xl"
        />

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Bem-vindo de volta!
            <span className="mt-1 block text-3xl font-semibold text-white/90">
              Acesse sua conta e{" "}
              <span className="text-primary">gerencie tudo</span> em um só lugar.
            </span>
          </h1>

          <div className="my-7 h-1 w-16 rounded-full bg-primary" />

          <ul className="space-y-5">
            {DESTAQUES.map((d) => (
              <li key={d.titulo} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-primary/50 bg-primary/10">
                  <d.icon className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block font-semibold">{d.titulo}</span>
                  <span className="block text-sm leading-snug text-white/60">{d.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} Mobyou. Todos os direitos reservados.
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex w-full items-center justify-center bg-muted/30 p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <img
            src="/images/logo-mobyou.png"
            alt="MOBYOU"
            className="mx-auto mb-8 w-24 rounded-xl lg:hidden"
          />

          <div className="rounded-2xl border border-border bg-white p-7 shadow-sm sm:p-9">
            <h2 className="text-2xl font-bold tracking-tight">Faça seu login</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre com suas credenciais para acessar o sistema.
            </p>

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lembrar"
                    checked={lembrar}
                    onCheckedChange={(c) => setLembrar(c === true)}
                  />
                  <Label htmlFor="lembrar" className="text-sm font-normal">
                    Lembrar meu e-mail
                  </Label>
                </div>
                <Link
                  href="/recuperar-senha"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>

              <Button type="submit" disabled={loading} className="h-12 w-full text-base font-semibold">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          </div>

          {/* Antes ia para o WhatsApp: o pedido saía do sistema e não ficava
              registro. Agora abre o formulário e o chamado cai na caixa do dev. */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem uma conta ou precisa de ajuda?{" "}
            <button
              type="button"
              onClick={() => setSuporteAberto(true)}
              className="font-medium text-primary hover:underline"
            >
              Fale com o administrador
            </button>
          </p>

          <FormSuporte
            open={suporteAberto}
            onOpenChange={setSuporteAberto}
            emailPadrao={email}
          />
        </div>
      </main>
    </div>
  );
}
