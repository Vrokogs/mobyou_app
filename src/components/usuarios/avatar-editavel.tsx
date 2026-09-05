"use client";

import { useRef, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { salvarAvatar, iniciais, AVATAR_TIPOS } from "@/lib/avatar";

// Foto de um colaborador, trocável no clique. Cada um pode subir a sua pelo
// menu do topo; aqui é o gestor definindo a de qualquer um — é o que faz o
// pódio do ranking ter rosto sem depender de cada vendedor lembrar de subir.
interface AvatarEditavelProps {
  userId: string;
  nome: string;
  avatarUrl: string | null;
  onChange: (url: string) => void;
}

export function AvatarEditavel({ userId, nome, avatarUrl, onChange }: AvatarEditavelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function trocar(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    const r = await salvarAvatar(createClient(), userId, arquivo);
    setEnviando(false);
    if (!r.ok) {
      toast.error("Não foi possível salvar a foto", { description: r.erro });
      return;
    }
    onChange(r.url);
    toast.success(`Foto de ${nome} atualizada!`);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TIPOS.join(",")}
        className="hidden"
        onChange={(e) => { trocar(e.target.files?.[0]); e.target.value = ""; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enviando}
        title={avatarUrl ? `Trocar a foto de ${nome}` : `Adicionar foto de ${nome}`}
        className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="h-9 w-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={nome} />}
          <AvatarFallback className="bg-muted text-[11px] font-semibold">
            {iniciais(nome)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
          {enviando
            ? <Loader2 className="h-4 w-4 animate-spin text-white" />
            : <Camera className="h-4 w-4 text-white" />}
        </span>
      </button>
    </>
  );
}
