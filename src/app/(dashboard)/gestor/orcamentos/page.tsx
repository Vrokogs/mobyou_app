"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Orcamento, OrdemServico, Profile } from "@/types/database";
import { DollarSign, Eye, FileText } from "lucide-react";

interface OrcamentoWithRelations extends Orcamento {
  ordem?: Pick<OrdemServico, "id" | "numero"> & {
    cliente?: Pick<Profile, "id" | "nome">;
  };
}

type OrcamentoFilterStatus = "todos" | "rascunho" | "enviado" | "aprovado" | "rejeitado";

const STATUS_OPTIONS: { value: OrcamentoFilterStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "rejeitado", label: "Rejeitado" },
];

function getOrcamentoStatus(orc: OrcamentoWithRelations): string {
  return orc.status ?? "rascunho";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "aprovado":
      return { label: "Aprovado", variant: "default" as const, className: "bg-green-100 text-green-800" };
    case "rejeitado":
      return { label: "Rejeitado", variant: "destructive" as const, className: "" };
    case "enviado":
      return { label: "Enviado", variant: "secondary" as const, className: "bg-blue-100 text-blue-800" };
    default:
      return { label: "Rascunho", variant: "outline" as const, className: "" };
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function OrcamentosPage() {
  const router = useRouter();
  const [orcamentos, setOrcamentos] = useState<OrcamentoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrcamentoFilterStatus>("todos");

  const fetchOrcamentos = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();

      const { data: orcData, error } = await supabase
        .from("orcamentos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched: OrcamentoWithRelations[] = [];

      if (orcData) {
        for (const orc of orcData as any[]) {
          const { data: ordemData } = await supabase
            .from("ordens_servico")
            .select(
              `
              id,
              numero,
              cliente:profiles!ordens_servico_cliente_id_fkey(id, nome)
            `
            )
            .eq("id", orc.ordem_id)
            .single();

          enriched.push({
            ...orc,
            ordem: (ordemData as unknown) as OrcamentoWithRelations["ordem"],
          });
        }
      }

      setOrcamentos(enriched);
    } catch (err) {
      console.error("Erro ao carregar orcamentos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrcamentos();
  }, [fetchOrcamentos]);

  const filteredOrcamentos = orcamentos.filter((orc) => {
    if (statusFilter === "todos") return true;
    return getOrcamentoStatus(orc) === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Orcamentos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie todos os orcamentos
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Status
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(val) =>
              val && setStatusFilter(val as OrcamentoFilterStatus)
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>OS No</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Envio</TableHead>
              <TableHead>Data Aprovacao</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-7 w-7 rounded-md ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredOrcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center text-muted-foreground">
                    <FileText className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">Nenhum orcamento encontrado</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrcamentos.map((orc) => {
                const status = getOrcamentoStatus(orc);
                const badge = getStatusBadge(status);

                return (
                  <TableRow
                    key={orc.id}
                    className="cursor-pointer"
                    onClick={() =>
                      orc.ordem?.id &&
                      router.push(`/gestor/ordens/${orc.ordem.id}`)
                    }
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {orc.ordem?.numero || "-"}
                    </TableCell>
                    <TableCell>
                      {orc.ordem?.cliente?.nome || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(orc.valor_total ?? 0)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          badge.className ||
                          (badge.variant === "destructive"
                            ? "bg-red-100 text-red-800"
                            : badge.variant === "outline"
                              ? "bg-gray-100 text-gray-800 border border-gray-300"
                              : "bg-primary/10 text-primary")
                        }`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(orc.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(orc.data_aprovacao)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (orc.ordem?.id) {
                            router.push(`/gestor/ordens/${orc.ordem.id}`);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
