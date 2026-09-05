"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, LifeBuoy } from "lucide-react";
import { SUPORTE_TIPOS } from "@/lib/constants";

const VAZIO = { tipo: "senha", nome: "", email: "", telefone: "", mensagem: "" };

interface FormSuporteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Preenche o formulário quando quem escreve já está logado. */
  nomePadrao?: string;
  emailPadrao?: string;
}

export function FormSuporte({ open, onOpenChange, nomePadrao, emailPadrao }: FormSuporteProps) {
  const [form, setForm] = useState({
    ...VAZIO,
    nome: nomePadrao ?? "",
    email: emailPadrao ?? "",
  });
  const [enviando, setEnviando] = useState(false);

  const set = (k: keyof typeof VAZIO, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch("/api/suporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error("Não foi possível enviar", { description: json.error });
        return;
      }
      toast.success("Mensagem enviada!", {
        description: "Vamos responder pelo contato que você deixou.",
      });
      onOpenChange(false);
      setForm({ ...VAZIO, nome: nomePadrao ?? "", email: emailPadrao ?? "" });
    } catch {
      toast.error("Erro inesperado ao enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Falar com o administrador
          </DialogTitle>
          <DialogDescription>Fale conosco!</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Do que se trata</Label>
            <Select
              items={Object.fromEntries(SUPORTE_TIPOS.map((t) => [t.value, t.label]))}
              value={form.tipo}
              onValueChange={(v) => v && set("tipo", v)}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPORTE_TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-nome">Seu nome</Label>
            <Input
              id="sup-nome"
              required
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Como podemos te chamar"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sup-email">E-mail</Label>
              <Input
                id="sup-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="seu@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-tel">Telefone</Label>
              <Input
                id="sup-tel"
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                placeholder="(12) 90000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-msg">Mensagem</Label>
            <Textarea
              id="sup-msg"
              required
              rows={4}
              maxLength={2000}
              value={form.mensagem}
              onChange={(e) => set("mensagem", e.target.value)}
              placeholder="Descreva o que aconteceu ou o que você precisa."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={enviando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
