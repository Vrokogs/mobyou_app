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
import { MOBYOU_MODELOS, MOBYOU_MARCA } from "@/lib/constants";
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

// O modelo vem solto da nota fiscal, então a mesma moto aparece escrita de
// várias formas: "Mobyou X13" e "X13", "Vegas" e "Mobyou Vegas", "Mob Tri" e
// "MobTri". Para as abas, o que só difere pelo prefixo da marca, por espaço ou
// por caixa conta como um modelo só. Grafias realmente diferentes ("X11 MINI" e
// "X11 MINI 1000W") continuam separadas — podem ser motos diferentes e não cabe
// ao filtro decidir isso.
function chaveModelo(modelo: string | null): string {
  return (modelo ?? "")
    .toLowerCase()
    .replace(/^mobyou\b/, "")
    .replace(/\s+/g, "");
}

export default function ScootersPage() {
  const [scooters, setScooters] = useState<ScooterWithOwner[]>([]);
  const [clientes, setClientes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeloFiltro, setModeloFiltro] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, control, formState: { errors } } =
    useForm<ScooterFormData>({ defaultValues: { marca: MOBYOU_MARCA } });

  const loadScooters = useCallback(async () => {
    const supabase = createClient();

    let query = supabase
      .from("scooters")
      .select("*, proprietario:profiles!cliente_id(nome)")
      .order("created_at", { ascending: false });

    if (search.trim()) {
      query = query.or(
        `modelo.ilike.%${search}%,marca.ilike.%${search}%,chassi.ilike.%${search}%,numero_serie.ilike.%${search}%`
      );
    }

    const { data: scooterData } = await query;
    const scooterList = (scooterData ?? []) as unknown as ScooterWithOwner[];

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
    setClientes((data ?? []) as unknown as Profile[]);
  }, []);

  useEffect(() => {
    loadScooters();
    loadClientes();
  }, [loadScooters, loadClientes]);

  async function onSubmit(formData: ScooterFormData) {
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await (supabase.from("scooters") as any).insert({
      modelo: formData.modelo,
      marca: formData.marca,
      cor: formData.cor || null,
      ano: formData.ano ? parseInt(formData.ano) : null,
      numero_serie: formData.numero_serie,
      chassi: formData.chassi,
      cliente_id: formData.cliente_id || null,
      data_compra: formData.data_compra || null,
      criado_por: user?.id ?? null,
    });

    reset({ marca: MOBYOU_MARCA });
    setDialogOpen(false);
    setSaving(false);
    loadScooters();
  }

  // Uma aba por modelo que realmente tem moto cadastrada, da maior frota para a
  // menor. O rótulo é a grafia mais usada do grupo, para a aba mostrar o nome
  // como ele aparece na lista.
  const modelosDisponiveis = (() => {
    const grupos = new Map<string, { qtd: number; grafias: Record<string, number> }>();
    for (const s of scooters) {
      const chave = chaveModelo(s.modelo);
      if (!chave) continue;
      const g = grupos.get(chave) ?? { qtd: 0, grafias: {} };
      g.qtd += 1;
      const nome = s.modelo ?? "";
      g.grafias[nome] = (g.grafias[nome] ?? 0) + 1;
      grupos.set(chave, g);
    }
    return [...grupos.entries()]
      .map(([chave, g]) => ({
        chave,
        qtd: g.qtd,
        rotulo: Object.entries(g.grafias).sort((a, b) => b[1] - a[1])[0][0],
      }))
      .sort((a, b) => b.qtd - a.qtd || a.rotulo.localeCompare(b.rotulo));
  })();

  const scootersFiltradas =
    modeloFiltro === "todos"
      ? scooters
      : scooters.filter((s) => chaveModelo(s.modelo) === modeloFiltro);

  const rotuloAtivo = modelosDisponiveis.find((m) => m.chave === modeloFiltro)?.rotulo;

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
                  <Controller
                    name="modelo"
                    control={control}
                    rules={{ required: "Modelo obrigatorio" }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione o modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOBYOU_MODELOS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.modelo && (
                    <p className="text-xs text-destructive">{errors.modelo.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    placeholder="Ex: Mobyou"
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

      {/* Abas por modelo. Rolam na horizontal porque a frota tem mais de vinte
          grafias e a barra não caberia numa linha só. */}
      {modelosDisponiveis.length > 0 && (
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 px-1 w-max">
            <Button
              variant={modeloFiltro === "todos" ? "default" : "outline"}
              size="sm"
              className="rounded-full"
              onClick={() => setModeloFiltro("todos")}
            >
              Todos
              <Badge variant="secondary" className="ml-1.5 bg-black/10 text-inherit">
                {scooters.length}
              </Badge>
            </Button>
            {modelosDisponiveis.map((m) => (
              <Button
                key={m.chave}
                variant={modeloFiltro === m.chave ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setModeloFiltro(m.chave)}
              >
                {m.rotulo}
                <Badge variant="secondary" className="ml-1.5 bg-black/10 text-inherit">
                  {m.qtd}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bike className="h-5 w-5" />
            Lista de Scooters
            <span className="text-sm font-normal text-muted-foreground">
              — {scootersFiltradas.length}
              {rotuloAtivo ? ` ${rotuloAtivo}` : " no total"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scootersFiltradas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {scooters.length === 0
                ? "Nenhuma scooter encontrada."
                : `Nenhuma scooter do modelo ${rotuloAtivo ?? ""} nesta busca.`}
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
                {scootersFiltradas.map((scooter) => {
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
