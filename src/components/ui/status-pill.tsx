import { cn } from "@/lib/utils";

// Pill de status: fundo pastel, bolinha cheia e texto na cor forte.
//
// Hoje cada tela escreve a sua ("bg-green-100 text-green-800", "bg-amber-100
// text-amber-800"...), e as mesmas palavras saem de cores diferentes conforme a
// página. O tom mora aqui para o sistema inteiro falar a mesma língua.
export type TomStatus =
  | "neutro"    // rascunho, sem informação
  | "andamento" // em curso, alguém está tocando
  | "espera"    // parado aguardando alguém
  | "sucesso"   // concluído, ativo, aprovado
  | "alerta"    // vencendo, precisa de atenção
  | "erro";     // cancelado, expirado, recusado

const TONS: Record<TomStatus, string> = {
  neutro: "bg-slate-100 text-slate-700",
  andamento: "bg-violet-100 text-violet-700",
  espera: "bg-amber-100 text-amber-800",
  sucesso: "bg-emerald-100 text-emerald-700",
  alerta: "bg-orange-100 text-orange-800",
  erro: "bg-rose-100 text-rose-700",
};

const BOLINHA: Record<TomStatus, string> = {
  neutro: "bg-slate-500",
  andamento: "bg-violet-500",
  espera: "bg-amber-500",
  sucesso: "bg-emerald-500",
  alerta: "bg-orange-500",
  erro: "bg-rose-500",
};

interface StatusPillProps {
  children: React.ReactNode;
  tom?: TomStatus;
  /** Sem a bolinha, para tabelas muito densas. */
  semPonto?: boolean;
  className?: string;
}

export function StatusPill({
  children, tom = "neutro", semPonto, className,
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        TONS[tom],
        className,
      )}
    >
      {!semPonto && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", BOLINHA[tom])} />
      )}
      {children}
    </span>
  );
}
