"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

// Gráfico de barras horizontais para comparar poucos itens nomeados — ranking de
// vendedores, faturamento por loja. A barra é sempre uma medida só: quando há
// duas de escalas diferentes (motos e reais), a barra carrega o dinheiro e a
// quantidade vira texto. Dois eixos no mesmo gráfico enganam a leitura.
//
// Todas as barras usam a MESMA cor de propósito. Colorir por posição (ouro,
// prata, bronze) faz o gráfico se repintar quando o filtro de mês muda a ordem,
// e a cor passa a significar "lugar" em vez de "quem". A posição já é dita pela
// ordenação e pelo ícone à esquerda.

export interface BarraItem {
  id: string;
  rotulo: string;
  /** Valor que desenha a barra. */
  valor: number;
  /** Texto miúdo ao lado do valor, ex.: "2 motos". */
  detalhe?: string;
  /** Enfeite à esquerda do nome (medalha, número da posição). */
  prefixo?: React.ReactNode;
  /** Selo ao lado do nome, ex.: "sem vendas". */
  selo?: React.ReactNode;
}

interface BarChartProps {
  titulo: string;
  icon?: LucideIcon;
  descricao?: string;
  itens: BarraItem[];
  /** Cor das barras. Uma só — é uma série única, então não há legenda. */
  cor?: string;
  formatar: (n: number) => string;
  vazio?: string;
  className?: string;
}

export function BarChart({
  titulo, icon: Icon, descricao, itens, cor = "var(--primary)", formatar, vazio, className,
}: BarChartProps) {
  const maior = Math.max(1, ...itens.map((i) => i.valor));
  const soma = itens.reduce((s, i) => s + i.valor, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {titulo}
        </CardTitle>
        {descricao && (
          <p className="text-xs text-muted-foreground">{descricao}</p>
        )}
      </CardHeader>

      <CardContent>
        {itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {vazio ?? "Nada para mostrar neste período."}
          </p>
        ) : (
          <div className="space-y-1">
            {itens.map((item) => {
              const largura = item.valor > 0 ? Math.max(2, (item.valor / maior) * 100) : 0;
              const fatia = soma > 0 ? Math.round((item.valor / soma) * 100) : 0;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger
                    render={
                      <div className="group grid w-full cursor-default grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(88px,132px)_minmax(0,1fr)_auto]" />
                    }
                  >
                  {/* Nome */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    {item.prefixo}
                    <span className="truncate text-sm font-medium">{item.rotulo}</span>
                    {item.selo}
                  </div>

                  {/* Barra: cresce da base reta à esquerda, ponta arredondada.
                      Fica por último no mobile para o nome e o valor lerem juntos. */}
                  <div className="order-last h-2.5 w-full overflow-hidden rounded-sm bg-muted sm:order-none">
                    <div
                      className="h-full rounded-r transition-[width] duration-500 ease-out"
                      style={{ width: `${largura}%`, backgroundColor: cor }}
                    />
                  </div>

                  {/* Valor na ponta */}
                  <div className="whitespace-nowrap text-right text-sm">
                    <span className="font-semibold tabular-nums">{formatar(item.valor)}</span>
                    {item.detalhe && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{item.detalhe}</span>
                    )}
                  </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{item.rotulo}</p>
                    <p className="text-xs opacity-80">
                      {formatar(item.valor)}
                      {item.detalhe ? ` · ${item.detalhe}` : ""}
                      {soma > 0 ? ` · ${fatia}% do total` : ""}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
