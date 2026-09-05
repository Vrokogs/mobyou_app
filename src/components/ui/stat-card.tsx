import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Card de número do painel. Existe para as telas pararem de montar esse bloco
// à mão, cada uma com um espaçamento e uma cor de ícone diferente.
interface StatCardProps {
  titulo: string;
  valor: string | number;
  legenda?: string;
  icon: LucideIcon;
  /** Destaca o card com a borda e o fundo da cor da marca. */
  destaque?: boolean;
  className?: string;
}

export function StatCard({
  titulo, valor, legenda, icon: Icon, destaque, className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        destaque && "border-primary/30 bg-primary/5",
        className,
      )}
    >
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{titulo}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight">{valor}</p>
          {legenda && (
            <p className="mt-0.5 text-xs text-muted-foreground">{legenda}</p>
          )}
        </div>
        {/* Caixa pêssego com ícone laranja: a marca aparece sem colorir o card
            inteiro, e todos os cards ficam iguais entre si. */}
        <div className="shrink-0 rounded-xl bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
