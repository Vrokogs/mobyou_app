"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { OrdemServicoStatus } from "@/types/database";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUS_FLOW: OrdemServicoStatus[] = [
  "agendado",
  "confirmado",
  "recebido",
  "checkin_realizado",
  "em_analise",
  "diagnostico_concluido",
  "orcamento_enviado",
  "aguardando_aprovacao",
  "aprovado",
  "aguardando_inicio",
  "em_servico",
  "testes_finais",
  "finalizado",
  "entregue",
];

const TERMINAL_STATUSES: OrdemServicoStatus[] = [
  "cancelado",
  "nao_compareceu",
  "remarcado",
];

const STATUS_STEP_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  agendado: {
    bg: "bg-blue-500",
    border: "border-blue-500",
    text: "text-blue-700",
  },
  confirmado: {
    bg: "bg-indigo-500",
    border: "border-indigo-500",
    text: "text-indigo-700",
  },
  recebido: {
    bg: "bg-purple-500",
    border: "border-purple-500",
    text: "text-purple-700",
  },
  checkin_realizado: {
    bg: "bg-violet-500",
    border: "border-violet-500",
    text: "text-violet-700",
  },
  em_analise: {
    bg: "bg-amber-500",
    border: "border-amber-500",
    text: "text-amber-700",
  },
  diagnostico_concluido: {
    bg: "bg-orange-500",
    border: "border-orange-500",
    text: "text-orange-700",
  },
  orcamento_enviado: {
    bg: "bg-cyan-500",
    border: "border-cyan-500",
    text: "text-cyan-700",
  },
  aguardando_aprovacao: {
    bg: "bg-yellow-500",
    border: "border-yellow-500",
    text: "text-yellow-700",
  },
  aprovado: {
    bg: "bg-lime-500",
    border: "border-lime-500",
    text: "text-lime-700",
  },
  aguardando_inicio: {
    bg: "bg-teal-500",
    border: "border-teal-500",
    text: "text-teal-700",
  },
  em_servico: {
    bg: "bg-blue-500",
    border: "border-blue-500",
    text: "text-blue-700",
  },
  testes_finais: {
    bg: "bg-sky-500",
    border: "border-sky-500",
    text: "text-sky-700",
  },
  finalizado: {
    bg: "bg-emerald-500",
    border: "border-emerald-500",
    text: "text-emerald-700",
  },
  entregue: {
    bg: "bg-green-500",
    border: "border-green-500",
    text: "text-green-700",
  },
  cancelado: {
    bg: "bg-red-500",
    border: "border-red-500",
    text: "text-red-700",
  },
  nao_compareceu: {
    bg: "bg-gray-500",
    border: "border-gray-500",
    text: "text-gray-700",
  },
  remarcado: {
    bg: "bg-pink-500",
    border: "border-pink-500",
    text: "text-pink-700",
  },
};

interface StatusStepperProps {
  currentStatus: OrdemServicoStatus;
}

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const isTerminal = TERMINAL_STATUSES.includes(currentStatus);
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="w-full">
      <ScrollArea className="w-full">
        <div className="flex items-start gap-0 pb-4 min-w-max px-1">
          {STATUS_FLOW.map((status, index) => {
            const isPast =
              !isTerminal && currentIndex > index;
            const isCurrent =
              !isTerminal && currentIndex === index;
            const isFuture = isTerminal || currentIndex < index;
            const colors = STATUS_STEP_COLORS[status];

            return (
              <div key={status} className="flex items-start">
                <div className="flex flex-col items-center min-w-[80px]">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                      isPast &&
                        "border-green-500 bg-green-500 text-white",
                      isCurrent &&
                        cn(
                          colors.border,
                          colors.bg,
                          "text-white ring-4 ring-offset-2",
                          `ring-${colors.bg.replace("bg-", "").replace("500", "200")}`
                        ),
                      isFuture &&
                        "border-muted-foreground/30 bg-muted text-muted-foreground"
                    )}
                  >
                    {isPast ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-[10px] font-medium text-center leading-tight max-w-[76px]",
                      isPast && "text-green-700 dark:text-green-400",
                      isCurrent && colors.text,
                      isFuture && "text-muted-foreground"
                    )}
                  >
                    {ORDER_STATUS_LABELS[status]}
                  </span>
                </div>
                {index < STATUS_FLOW.length - 1 && (
                  <div className="flex items-center mt-3.5">
                    <div
                      className={cn(
                        "h-0.5 w-6",
                        isPast
                          ? "bg-green-500"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {isTerminal && (
        <div className="mt-3 flex items-center gap-2">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full",
              STATUS_STEP_COLORS[currentStatus].bg,
              "text-white"
            )}
          >
            <span className="text-xs font-bold">!</span>
          </div>
          <span
            className={cn(
              "text-sm font-semibold",
              STATUS_STEP_COLORS[currentStatus].text
            )}
          >
            {ORDER_STATUS_LABELS[currentStatus]}
          </span>
        </div>
      )}
    </div>
  );
}
