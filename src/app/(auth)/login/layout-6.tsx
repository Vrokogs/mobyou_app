"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

export default function Layout6() {
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
    } catch { toast.error("Erro inesperado"); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F5F6FA" }}>
      <div className="w-full max-w-[440px]">
        {/* Card with left orange border */}
        <div
          className="bg-white rounded-lg overflow-hidden"
          style={{
            borderLeft: "4px solid #C96B1D",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <div className="p-8 sm:p-10">
            {/* Header: logo + text side by side */}
            <div className="flex items-center gap-4 mb-8">
              <img
                src="/images/logo-mobyou.jpg"
                alt="MOBYOU"
                className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
              />
              <div>
                <h1 className="text-lg font-bold" style={{ color: "#0B1A2D" }}>
                  MOBYOU
                </h1>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>
                  Painel de Gestão
                </p>
              </div>
            </div>

            {/* Welcome text */}
            <div className="mb-6">
              <h2 className="text-base font-semibold" style={{ color: "#1F2937" }}>
                Bem-vindo de volta
              </h2>
              <p className="text-sm mt-0.5" style={{ color: "#9CA3AF" }}>
                Entre com suas credenciais para continuar
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "#6B7280" }}>
                  E-mail
                </label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-md text-sm focus:ring-1"
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#E5E7EB",
                    color: "#1F2937",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#C96B1D";
                    e.target.style.boxShadow = "0 0 0 3px rgba(201,107,29,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#E5E7EB";
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium" style={{ color: "#6B7280" }}>
                    Senha
                  </label>
                  <Link href="/recuperar-senha" className="text-xs font-medium" style={{ color: "#C96B1D" }}>
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-md text-sm pr-10 focus:ring-1"
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E5E7EB",
                      color: "#1F2937",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#C96B1D";
                      e.target.style.boxShadow = "0 0 0 3px rgba(201,107,29,0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#E5E7EB";
                      e.target.style.boxShadow = "none";
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#9CA3AF" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#0B1A2D")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 text-white font-semibold text-sm rounded-md transition-all active:scale-[0.99]"
                  style={{
                    backgroundColor: "#0B1A2D",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0F2340")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0B1A2D")}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6" style={{ borderTop: "1px solid #F3F4F6" }}>
              <p className="text-center text-xs" style={{ color: "#D1D5DB" }}>
                MOBYOU Mobilidade Eletrica &mdash; Todos os direitos reservados
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
