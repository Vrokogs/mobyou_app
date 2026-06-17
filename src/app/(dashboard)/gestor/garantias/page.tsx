"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, Filter } from "lucide-react";
import { format } from "date-fns";
import { GARANTIA_STATUS } from "@/lib/constants";
import type { Garantia, GarantiaStatus } from "@/types/database";

interface GarantiaWithRelations extends Garantia {
  scooter?: { modelo: string; marca: string; chassi: string | null } | null;
  cliente?: { nome: string } | null;
}

const STATUS_COLORS: Record<GarantiaStatus, string> = {
  ativa: "bg-green-100 text-green-800",
  expirada: "bg-red-100 text-red-800",
  cancelada: "bg-gray-100 text-gray-800",
};

export default function GarantiasPage() {
  const [garantias, setGarantias] = useState<GarantiaWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [changeDialog, setChangeDialog] = useState(false);
  const [selectedGarantia, setSelectedGarantia] = useState<GarantiaWithRelations | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const loadGarantias = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from("garantias")
      .select(
        "*, scooter:scooters!scooter_id(modelo, marca, chassi), cliente:profiles!cliente_id(nome)"
      )
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data } = await query;
    setGarantias((data ?? []) as GarantiaWithRelations[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadGarantias();
  }, [loadGarantias]);

  function openChangeStatus(garantia: GarantiaWithRelations) {
    setSelectedGarantia(garantia);
    setNewStatus(garantia.status);
    setChangeDialog(true);
  }

  async function handleChangeStatus() {
    if (!selectedGarantia || !newStatus) return;
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("garantias")
      .update({ status: newStatus as GarantiaStatus })
      .eq("id", selectedGarantia.id);

    setSaving(false);
    setChangeDialog(false);
    setSelectedGarantia(null);
    loadGarantias();
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "---";
    try {
      return format(new Date(dateStr), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Card>
          <CardContent className="pt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Garantias</h1>
          <p className="text-muted-foreground">
            Gerencie as garantias das scooters.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativa">Ativa</SelectItem>
            <SelectItem value="expirada">Expirada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Lista de Garantias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {garantias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma garantia encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scooter</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Data Inicio</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {garantias.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      {g.scooter
                        ? `${g.scooter.marca} ${g.scooter.modelo}`
                        : "---"}
                    </TableCell>
                    <TableCell>{g.cliente?.nome ?? "---"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {g.scooter?.chassi ?? "---"}
                    </TableCell>
                    <TableCell>{formatDate(g.data_inicio)}</TableCell>
                    <TableCell>{formatDate(g.data_fim)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[g.status as GarantiaStatus] ?? ""}
                      >
                        {GARANTIA_STATUS[g.status as GarantiaStatus] ?? g.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openChangeStatus(g)}
                      >
                        Alterar Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={changeDialog} onOpenChange={setChangeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Status da Garantia</DialogTitle>
            <DialogDescription>
              {selectedGarantia?.scooter
                ? `${selectedGarantia.scooter.marca} ${selectedGarantia.scooter.modelo}`
                : "Garantia"}{" "}
              - {selectedGarantia?.cliente?.nome ?? ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o novo status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="expirada">Expirada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleChangeStatus} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
