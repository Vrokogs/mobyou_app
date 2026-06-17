"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  Image,
  MessageSquare,
  PenTool,
  Search,
  Send,
  Settings,
  Truck,
  User,
  Wrench,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { TimelineEvento } from "@/types/database";

const TIMELINE_ICONS: Record<string, React.ElementType> = {
  criacao: Calendar,
  agendamento: Clock,
  confirmacao: CheckCircle,
  recebimento: Truck,
  checkin: ClipboardCheck,
  analise: Search,
  diagnostico: FileText,
  orcamento: PenTool,
  orcamento_enviado: Send,
  aprovacao: CheckCircle,
  inicio_servico: Wrench,
  servico: Settings,
  testes: Search,
  finalizacao: CheckCircle,
  entrega: Truck,
  cancelamento: XCircle,
  nao_comparecimento: AlertCircle,
  remarcacao: RefreshCw,
  foto: Image,
  comentario: MessageSquare,
  atribuicao: User,
  status_change: RefreshCw,
};

const TIMELINE_COLORS: Record<string, string> = {
  criacao: "bg-blue-100 text-blue-600",
  agendamento: "bg-blue-100 text-blue-600",
  confirmacao: "bg-indigo-100 text-indigo-600",
  recebimento: "bg-purple-100 text-purple-600",
  checkin: "bg-violet-100 text-violet-600",
  analise: "bg-amber-100 text-amber-600",
  diagnostico: "bg-orange-100 text-orange-600",
  orcamento: "bg-cyan-100 text-cyan-600",
  orcamento_enviado: "bg-cyan-100 text-cyan-600",
  aprovacao: "bg-lime-100 text-lime-600",
  inicio_servico: "bg-blue-100 text-blue-600",
  servico: "bg-blue-100 text-blue-600",
  testes: "bg-sky-100 text-sky-600",
  finalizacao: "bg-emerald-100 text-emerald-600",
  entrega: "bg-green-100 text-green-600",
  cancelamento: "bg-red-100 text-red-600",
  nao_comparecimento: "bg-gray-100 text-gray-600",
  remarcacao: "bg-pink-100 text-pink-600",
  foto: "bg-violet-100 text-violet-600",
  comentario: "bg-gray-100 text-gray-600",
  atribuicao: "bg-teal-100 text-teal-600",
  status_change: "bg-indigo-100 text-indigo-600",
};

export interface TimelineEvent extends TimelineEvento {
  usuario_nome?: string;
  fotos?: string[];
}

interface TimelineViewProps {
  events: TimelineEvent[];
  loading?: boolean;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Agora mesmo";
  if (diffMin < 60) return `${diffMin}min atras`;
  if (diffHr < 24) return `${diffHr}h atras`;
  if (diffDay < 7) return `${diffDay}d atras`;
  return formatDate(dateStr);
}

export function TimelineView({ events, loading }: TimelineViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Nenhum evento registrado</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-0">
        {events.map((event, index) => {
          const Icon = TIMELINE_ICONS[event.tipo] || Clock;
          const colorClass =
            TIMELINE_COLORS[event.tipo] || "bg-gray-100 text-gray-600";
          const isLast = index === events.length - 1;

          return (
            <div
              key={event.id}
              className={cn(
                "relative flex gap-4 pb-6",
                isLast && "pb-0"
              )}
            >
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  colorClass
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {event.titulo}
                    </p>
                    {event.descricao && (
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                        {event.descricao}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelative(event.created_at)}
                  </time>
                </div>

                {event.usuario_nome && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {event.usuario_nome}
                    </span>
                  </div>
                )}

                {event.fotos && event.fotos.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {event.fotos.map((foto, fIdx) => (
                      <div
                        key={fIdx}
                        className="h-16 w-16 rounded-lg overflow-hidden border bg-muted"
                      >
                        <img
                          src={foto}
                          alt={`Foto ${fIdx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-1">
                  <time
                    className="text-[11px] text-muted-foreground/60"
                    title={formatDate(event.created_at)}
                  >
                    {formatDate(event.created_at)}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
