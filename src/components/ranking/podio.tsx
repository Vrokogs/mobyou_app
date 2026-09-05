"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { iniciais } from "@/lib/avatar";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ColocadoPodio {
  id: string;
  nome: string;
  avatarUrl: string | null;
  total: number;
  qtd: number;
}

interface PodioProps {
  colocados: ColocadoPodio[];
  formatar: (n: number) => string;
  /** Esconde o valor vendido de quem não pode ver faturamento. */
  mostrarValor?: boolean;
}

// O DOM segue a classificação real (1º, 2º, 3º) — é como o leitor de tela lê e
// como o celular empilha. Só no desktop o CSS reposiciona para o formato de
// pódio, com o 2º à esquerda, o 1º ao centro e mais alto, e o 3º à direita.
const DEGRAU = [
  { ordem: "sm:order-2", altura: "sm:h-56", aro: "ring-amber-400/70", medalha: "text-amber-400", base: "from-amber-400/25" },
  { ordem: "sm:order-1", altura: "sm:h-44", aro: "ring-slate-300/60", medalha: "text-slate-300", base: "from-slate-300/20" },
  { ordem: "sm:order-3", altura: "sm:h-40", aro: "ring-orange-700/60", medalha: "text-orange-600", base: "from-orange-700/20" },
];

export function Podio({ colocados, formatar, mostrarValor = true }: PodioProps) {
  if (colocados.length === 0) return null;

  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4">
      {colocados.slice(0, 3).map((c, idx) => {
        const d = DEGRAU[idx];
        const primeiro = idx === 0;
        return (
          <div
            key={c.id}
            className={cn(
              "flex flex-col items-center justify-end rounded-2xl border p-4 text-center transition-transform",
              "border-white/10 bg-gradient-to-b to-transparent",
              d.base,
              d.altura,
              d.ordem,
              primeiro && "sm:-translate-y-2 sm:border-amber-400/40",
            )}
          >
            <div className="relative">
              {primeiro && (
                <Crown className="absolute -top-7 left-1/2 h-6 w-6 -translate-x-1/2 fill-amber-400 text-amber-400" />
              )}
              <span
                className={cn(
                  "absolute -left-3 -top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-sm font-bold",
                  d.medalha,
                )}
              >
                {idx + 1}
              </span>
              <Avatar className={cn("ring-2 ring-offset-2 ring-offset-transparent", d.aro, primeiro ? "h-20 w-20" : "h-16 w-16")}>
                {c.avatarUrl && <AvatarImage src={c.avatarUrl} alt={c.nome} />}
                <AvatarFallback className="bg-white/10 text-base font-bold text-white">
                  {iniciais(c.nome)}
                </AvatarFallback>
              </Avatar>
            </div>

            <p className={cn("mt-3 font-semibold text-white", primeiro ? "text-base" : "text-sm")}>
              {c.nome}
            </p>

            {mostrarValor && (
              <p className={cn("mt-1 font-bold text-primary", primeiro ? "text-2xl" : "text-lg")}>
                {formatar(c.total)}
              </p>
            )}
            <p className="mt-0.5 text-xs text-white/50">
              {c.qtd} moto{c.qtd === 1 ? "" : "s"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
