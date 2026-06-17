"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Orcamento, OrcamentoItem, Diagnostico } from "@/types/database";
import { Plus, Trash2, Save, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface PecaItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
}

interface ServicoItem {
  descricao: string;
  preco: number;
}

interface OrcamentoFormProps {
  orderId: string;
  diagnosticoData?: Diagnostico | null;
  existingOrcamento?: Orcamento | null;
  onSubmit?: () => void;
  onSendToClient?: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function OrcamentoForm({
  orderId,
  diagnosticoData,
  existingOrcamento,
  onSubmit,
  onSendToClient,
}: OrcamentoFormProps) {
  const existingPecas: PecaItem[] =
    existingOrcamento?.itens
      ?.filter((i) => i.tipo === "peca")
      .map((i) => ({
        descricao: i.descricao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
      })) || [];

  const existingServicos: ServicoItem[] =
    existingOrcamento?.itens
      ?.filter((i) => i.tipo === "servico")
      .map((i) => ({
        descricao: i.descricao,
        preco: i.valor_total,
      })) || [];

  const [pecas, setPecas] = useState<PecaItem[]>(
    existingPecas.length > 0
      ? existingPecas
      : [{ descricao: "", quantidade: 1, valor_unitario: 0 }]
  );
  const [servicos, setServicos] = useState<ServicoItem[]>(
    existingServicos.length > 0
      ? existingServicos
      : [{ descricao: "", preco: 0 }]
  );
  const [maoObra, setMaoObra] = useState(
    existingOrcamento?.valor_mao_obra || 0
  );
  const [custosAdicionais, setCustosAdicionais] = useState(0);
  const [prazoEstimado, setPrazoEstimado] = useState("");
  const [observacoes, setObservacoes] = useState(
    existingOrcamento?.observacoes || ""
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const totalPecas = useMemo(
    () => pecas.reduce((acc, p) => acc + p.quantidade * p.valor_unitario, 0),
    [pecas]
  );

  const totalServicos = useMemo(
    () => servicos.reduce((acc, s) => acc + s.preco, 0),
    [servicos]
  );

  const total = useMemo(
    () => totalPecas + totalServicos + maoObra + custosAdicionais,
    [totalPecas, totalServicos, maoObra, custosAdicionais]
  );

  const addPeca = useCallback(() => {
    setPecas((prev) => [
      ...prev,
      { descricao: "", quantidade: 1, valor_unitario: 0 },
    ]);
  }, []);

  const removePeca = useCallback((index: number) => {
    setPecas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePeca = useCallback(
    (index: number, field: keyof PecaItem, value: string | number) => {
      setPecas((prev) =>
        prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  const addServico = useCallback(() => {
    setServicos((prev) => [...prev, { descricao: "", preco: 0 }]);
  }, []);

  const removeServico = useCallback((index: number) => {
    setServicos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateServico = useCallback(
    (index: number, field: keyof ServicoItem, value: string | number) => {
      setServicos((prev) =>
        prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  function buildOrcamentoItems(): OrcamentoItem[] {
    const items: OrcamentoItem[] = [];

    pecas
      .filter((p) => p.descricao.trim() !== "")
      .forEach((p) => {
        items.push({
          descricao: p.descricao,
          quantidade: p.quantidade,
          valor_unitario: p.valor_unitario,
          valor_total: p.quantidade * p.valor_unitario,
          tipo: "peca",
        });
      });

    servicos
      .filter((s) => s.descricao.trim() !== "")
      .forEach((s) => {
        items.push({
          descricao: s.descricao,
          quantidade: 1,
          valor_unitario: s.preco,
          valor_total: s.preco,
          tipo: "servico",
        });
      });

    return items;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const items = buildOrcamentoItems();

      const orcamentoData = {
        ordem_id: orderId,
        diagnostico_id: diagnosticoData?.id || null,
        itens: items,
        valor_pecas: totalPecas,
        valor_mao_obra: maoObra,
        valor_desconto: 0,
        valor_total: total,
        observacoes: observacoes || null,
        aprovado: null,
      };

      if (existingOrcamento) {
        const { error } = await (supabase
          .from("orcamentos") as any)
          .update(orcamentoData)
          .eq("id", existingOrcamento.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("orcamentos") as any)
          .insert(orcamentoData);
        if (error) throw error;
      }

      toast.success("Orcamento salvo com sucesso");
      onSubmit?.();
    } catch (err) {
      console.error("Erro ao salvar orcamento:", err);
      toast.error("Erro ao salvar orcamento");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendToClient() {
    setSending(true);
    try {
      await handleSave();

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      await (supabase.from("timeline_eventos") as any).insert({
        ordem_id: orderId,
        usuario_id: user?.id || null,
        tipo: "orcamento_enviado",
        titulo: "Orcamento enviado ao cliente",
        descricao: `Valor total: ${formatCurrency(total)}`,
      });

      await (supabase
        .from("ordens_servico") as any)
        .update({ status: "orcamento_enviado", valor_total: total })
        .eq("id", orderId);

      toast.success("Orcamento enviado ao cliente");
      onSendToClient?.();
    } catch (err) {
      console.error("Erro ao enviar orcamento:", err);
      toast.error("Erro ao enviar orcamento");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Pecas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Pecas</h4>
          <Button variant="outline" size="xs" onClick={addPeca}>
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
            <div className="col-span-5 text-xs text-muted-foreground font-medium">
              Nome
            </div>
            <div className="col-span-2 text-xs text-muted-foreground font-medium">
              Qtd
            </div>
            <div className="col-span-2 text-xs text-muted-foreground font-medium">
              Valor Unit.
            </div>
            <div className="col-span-2 text-xs text-muted-foreground font-medium text-right">
              Subtotal
            </div>
            <div className="col-span-1" />
          </div>

          {pecas.map((peca, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border p-2"
            >
              <div className="sm:col-span-5">
                <Input
                  placeholder="Nome da peca"
                  value={peca.descricao}
                  onChange={(e) =>
                    updatePeca(index, "descricao", e.target.value)
                  }
                  className="text-sm h-8"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={1}
                  value={peca.quantidade}
                  onChange={(e) =>
                    updatePeca(
                      index,
                      "quantidade",
                      parseInt(e.target.value) || 1
                    )
                  }
                  className="text-sm h-8"
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={peca.valor_unitario}
                  onChange={(e) =>
                    updatePeca(
                      index,
                      "valor_unitario",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="text-sm h-8"
                />
              </div>
              <div className="sm:col-span-2 text-right text-sm font-medium">
                {formatCurrency(peca.quantidade * peca.valor_unitario)}
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removePeca(index)}
                  disabled={pecas.length === 1}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pr-1">
            <span className="text-sm font-semibold">
              Subtotal Pecas: {formatCurrency(totalPecas)}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Servicos */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Servicos</h4>
          <Button variant="outline" size="xs" onClick={addServico}>
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
            <div className="col-span-8 text-xs text-muted-foreground font-medium">
              Descricao
            </div>
            <div className="col-span-3 text-xs text-muted-foreground font-medium text-right">
              Preco
            </div>
            <div className="col-span-1" />
          </div>

          {servicos.map((servico, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border p-2"
            >
              <div className="sm:col-span-8">
                <Input
                  placeholder="Descricao do servico"
                  value={servico.descricao}
                  onChange={(e) =>
                    updateServico(index, "descricao", e.target.value)
                  }
                  className="text-sm h-8"
                />
              </div>
              <div className="sm:col-span-3">
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={servico.preco}
                  onChange={(e) =>
                    updateServico(
                      index,
                      "preco",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="text-sm h-8"
                />
              </div>
              <div className="sm:col-span-1 flex justify-end">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => removeServico(index)}
                  disabled={servicos.length === 1}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pr-1">
            <span className="text-sm font-semibold">
              Subtotal Servicos: {formatCurrency(totalServicos)}
            </span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Mao de Obra e Custos Adicionais */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Mao de Obra (R$)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={maoObra}
            onChange={(e) => setMaoObra(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Custos Adicionais (R$)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={custosAdicionais}
            onChange={(e) =>
              setCustosAdicionais(parseFloat(e.target.value) || 0)
            }
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Prazo Estimado</Label>
          <Input
            placeholder="Ex: 3 dias uteis"
            value={prazoEstimado}
            onChange={(e) => setPrazoEstimado(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Observacoes */}
      <div>
        <Label className="text-sm font-medium">Observacoes</Label>
        <Textarea
          placeholder="Observacoes sobre o orcamento..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="mt-1"
          rows={3}
        />
      </div>

      <Separator />

      {/* Total */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pecas</span>
            <span>{formatCurrency(totalPecas)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Servicos</span>
            <span>{formatCurrency(totalServicos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mao de Obra</span>
            <span>{formatCurrency(maoObra)}</span>
          </div>
          {custosAdicionais > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custos Adicionais</span>
              <span>{formatCurrency(custosAdicionais)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          Salvar Rascunho
        </Button>
        <Button onClick={handleSendToClient} disabled={sending || total === 0}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Send className="h-4 w-4 mr-1.5" />
          )}
          Enviar ao Cliente
        </Button>
      </div>
    </div>
  );
}

export function OrcamentoFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
