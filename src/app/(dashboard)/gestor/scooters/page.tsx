"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Eye, Pencil, Bike } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import type { Scooter, Profile, GarantiaStatus } from "@/types/database";

interface ScooterFormData {
  modelo: string;
  marca: string;
  cor: string;
  ano: string;
  numero_serie: string;
  chassi: string;
  cliente_id: string;
  data_compra: string;
}

interface ScooterWithOwner extends Scooter {
  proprietario?: { nome: string } | null;
  garantia_status?: GarantiaStatus | null;
}

export default function ScootersPage() {
  const [scooters, setScooters] = useState<ScooterWithOwner[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<ScooterFormData>();

  const loadScooters = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from("scooters")
      .select("*, proprietario:profiles!proprietario_id(nome)")
      .order("created_at", { ascending: false });

    if (search.trim()) {
      query = query.or(
        `modelo.ilike.%${search}%,marca.ilike.%${search}%,chassi.ilike.%${search}%,numero_serie.ilike.%${search}%`
      );
    }

    const { data: scooterData } = await query;
    const scooterList = (scooterData ?? []) as ScooterWithOwner[];

    // Load garantia status for each scooter
    if (scooterList.length > 0) {
      const scooterIds = scooterList.map((s) => s.id);
      const { data: garantias } = await supabase
        .from("garantias")
        .select("scooter_id, status")
        .in("scooter_id", scooterIds)
        .order("created_at", { ascending: false });

      const garantiaMap: Record<string, GarantiaStatus> = {};
      garantias?.forEach((g) => {
        if (!garantiaMap[g.scooter_id]) {
          garantiaMap[g.scooter_id] = g.status as GarantiaStatus;
        }
      });

      scooterList.forEach((s) => {
        s.garantia_status = garantiaMap[s.id] ?? null;
      });
    }

    setScooters(scooterList);
    setLoading(false);
  }, [search]);

  const loadClientes = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, nome, email, telefone, cpf, endereco, cidade, estado, cep, role, avatar_url, ativo, created_at, updated_at")
      .eq("role", "cliente")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    setClientes((data ?? []) as Profile[]);
  }, []);

  useEffect(() => {
    loadScooters();
    loadClientes();
  }, [loadScooters, loadClientes]);

  async function onSubmit(formData: ScooterFormData) {
    setSaving(true);
    const supabase = createClient();

    await supabase.from("scooters").insert({
      modelo: formData.modelo,
      marca: formData.marca,
      cor: formData.cor || null,
      ano: formData.ano ? parseInt(formData.ano) : null,
      numero_serie: formData.numero_serie || null,
      chassi: formData.chassi || null,
      proprietario_id: formData.cliente_id || null,
      km_atual: 0,
      status: "ativo",
      placa: null,
      motor_numero: null,
      bateria_numero: null,
      foto_url: null,
      observacoes: null,
    });

    reset();
    setDialogOpen(false);
    setSaving(false);
    loadScooters();
  }

  function getGarantiaLabel(status: GarantiaStatus | null | undefined) {
    if (!status) return { label: "Sem garantia", className: "bg-gray-100 text-gray-600" };
    switch (status) {
      case "ativa":
        return { label: "Ativa", className: "bg-green-100 text-green-800" };
      case "expirada":
        return { label: "Expirada", className: "bg-red-100 text-red-800" };
      case "cancelada":
        return { label: "Cancelada", className: "bg-gray-100 text-gray-800" };
      default:
        return { label: status, className: "" };
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-8 w-64" />
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
          <h1 className="text-2xl font-bold tracking-tight">Scooters</h1>
          <p className="text-muted-foreground">
            Gerencie todas as scooters cadastradas.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Nova Scooter
              </Button>
            }
          />
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Scooter</DialogTitle>
              <DialogDescription>
                Cadastre uma nova scooter no sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    placeholder="Ex: S1 Pro"
                    {...register("modelo", { required: "Modelo obrigatorio" })}
                  />
                  {errors.modelo && (
                    <p className="text-xs text-destructive">{errors.modelo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    placeholder="Ex: NIU"
                    {...register("marca", { required: "Marca obrigatoria" })}
                  />
                  {errors.marca && (
                    <p className="text-xs text-destructive">{errors.marca.message}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <Input id="cor" placeholder="Ex: Branca" {...register("cor")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ano">Ano</Label>
                  <Input
                    id="ano"
                    type="number"
                    placeholder="Ex: 2024"
                    {...register("ano")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_serie">Numero de Serie</Label>
                  <Input
                    id="numero_serie"
                    placeholder="Numero de serie"
                    {...register("numero_serie")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chassi">Chassi</Label>
                  <Input
                    id="chassi"
                    placeholder="Numero do chassi"
                    {...register("chassi")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cliente (proprietario)</Label>
                <Controller
                  name="cliente_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_compra">Data de Compra</Label>
                <Input
                  id="data_compra"
                  type="date"
                  {...register("data_compra")}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Cadastrar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por modelo, marca, chassi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bike className="h-5 w-5" />
            Lista de Scooters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scooters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma scooter encontrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Chassi</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Garantia</TableHead>
                  <TableHead>Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scooters.map((scooter) => {
                  const garantia = getGarantiaLabel(scooter.garantia_status);
                  return (
                    <TableRow key={scooter.id}>
                      <TableCell className="font-medium">
                        {scooter.modelo}
                      </TableCell>
                      <TableCell>{scooter.marca}</TableCell>
                      <TableCell>{scooter.cor ?? "---"}</TableCell>
                      <TableCell>{scooter.ano ?? "---"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {scooter.chassi ?? "---"}
                      </TableCell>
                      <TableCell>
                        {scooter.proprietario?.nome ?? "---"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={garantia.className}
                        >
                          {garantia.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" render={<Link href={`/gestor/scooters/${scooter.id}`} />}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" render={<Link href={`/gestor/scooters/${scooter.id}`} />}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
