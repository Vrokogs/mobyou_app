"use client";

import { useRef, useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Camera, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { salvarAvatar, iniciais, AVATAR_TIPOS } from "@/lib/avatar";

const CARGO: Record<string, string> = {
  gestor: "Gestor",
  vendedor: "Vendedor",
  tecnico: "Técnico",
  cliente: "Cliente",
};

interface TopbarProps {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl: string | null;
  onAvatarChange: (url: string) => void;
  onLogout: () => void;
}

export function Topbar({
  userId, userName, userRole, avatarUrl, onAvatarChange, onLogout,
}: TopbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function trocarFoto(arquivo: File | undefined) {
    if (!arquivo) return;
    setEnviando(true);
    const r = await salvarAvatar(createClient(), userId, arquivo);
    setEnviando(false);
    if (!r.ok) {
      toast.error("Não foi possível trocar a foto", { description: r.erro });
      return;
    }
    onAvatarChange(r.url);
    toast.success("Foto atualizada!");
  }

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 sticky top-0 z-20">
      <SidebarTrigger className="text-foreground/70" />

      <div className="ml-auto flex items-center gap-2">
        {/* Trocar a foto é do próprio usuário — daí o input viver aqui no topo,
            e não só na tela de Usuários, que é do gestor. */}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TIPOS.join(",")}
          className="hidden"
          onChange={(e) => {
            trocarFoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="h-auto gap-2.5 px-2 py-1.5 hover:bg-muted" />
            }
          >
            <Avatar className="h-9 w-9">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {iniciais(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight">{userName}</p>
              <p className="text-xs text-muted-foreground leading-tight">
                {CARGO[userRole] ?? userRole}
              </p>
            </div>
            {enviando
              ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="h-10 w-10">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {iniciais(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-xs text-muted-foreground">{CARGO[userRole] ?? userRole}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={enviando}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {avatarUrl ? "Trocar minha foto" : "Adicionar minha foto"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
