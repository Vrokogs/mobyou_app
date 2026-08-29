"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Orcamento, OrcamentoItem, Diagnostico } from "@/types/database";
import { Plus, Trash2, Save, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface LinhaItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  // Em garantia: continua no orçamento e no histórico, mas com valor zerado.
  garantia: boolean;
}

const LINHA_VAZIA: LinhaItem = { descricao: "", quantidade: 1, valor_unitario: 0, garantia: false };

// Item em garantia não entra no total — o cliente não paga, mas o registro fica.
function subtotal(i: LinhaItem): number {
  return i.garantia ? 0 : i.quantidade * i.valor_unitario;
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

// Bloco reutilizável de linhas: serve tanto para peças quanto para serviços.
// A marcação de garantia zera o valor da linha sem tirá-la do orçamento.
function LinhasSecao({
  titulo,
  rotuloItem,
  linhas,
  subtotalLabel,
  onAdd,
  onRemove,
  onUpdate,
}: {
  titulo: string;
  rotuloItem: string;
  linhas: LinhaItem[];
  subtotalLabel: string;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, campo: keyof LinhaItem, valor: string | number | boolean) => void;
}) {
  const soma = linhas.reduce((acc, l) => acc + subtotal(l), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">{titulo}</h4>
        <Button variant="outline" size="xs" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>

      <div className="space-y-2">
        <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
          <div className="col-span-4 text-xs text-muted-foreground font-medium">Descrição</div>
          <div className="col-span-1 text-xs text-muted-foreground font-medium">Qtd</div>
          <div className="col-span-2 text-xs text-muted-foreground font-medium">Valor unit.</div>
          <div className="col-span-2 text-xs text-muted-foreground font-medium">Garantia</div>
          <div className="col-span-2 text-xs text-muted-foreground font-medium text-right">Subtotal</div>
          <div className="col-span-1" />
        </div>

        {linhas.map((linha, index) => (
          <div
            key={index}
            className={`grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-lg border p-2 ${
              linha.garantia ? "border-emerald-300 bg-emerald-50/40" : ""
            }`}
          >
            <div className="sm:col-span-4">
              <Input
                placeholder={rotuloItem}
                value={linha.descricao}
                onChange={(e) => onUpdate(index, "descricao", e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                type="number"
                min={1}
                value={linha.quantidade}
                onChange={(e) => onUpdate(index, "quantidade", parseInt(e.target.value) || 1)}
                className="text-sm h-8"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={linha.valor_unitario}
                onChange={(e) => onUpdate(index, "valor_unitario", parseFloat(e.target.value) || 0)}
                className="text-sm h-8"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <Checkbox
                  checked={linha.garantia}
                  onCheckedChange={(c) => onUpdate(index, "garantia", c === true)}
                />
                <span className={linha.garantia ? "text-emerald-700 font-medium" : "text-muted-foreground"}>
                  Em garantia
                </span>
              </label>
            </div>
            <div className="sm:col-span-2 text-right text-sm font-medium">
              {linha.garantia ? (
                <span className="text-emerald-700 flex items-center justify-end gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  R$ 0,00
                </span>
              ) : (
                formatCurrency(linha.quantidade * linha.valor_unitario)
              )}
            </div>
            <div className="sm:col-span-1 flex justify-end">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(index)}
                disabled={linhas.length === 1}
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        <div className="flex justify-end pr-1">
          <span className="text-sm font-semibold">
            {subtotalLabel}: {formatCurrency(soma)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function OrcamentoForm({
  orderId,
  diagnosticoData,
  existingOrcamento,
  onSubmit,
  onSendToClient,
}: OrcamentoFormProps) {
  const paraLinhas = (raw: unknown): LinhaItem[] =>
    ((raw as OrcamentoItem[] | null | undefined) ?? []).map((i) => ({
      descricao: i.descricao,
      quantidade: i.quantidade,
      valor_unitario: i.valor_unitario,
      garantia: i.garantia === true,
    }));

  const existingPecas = paraLinhas(existingOrcamento?.pecas);
  const existingServicos = paraLinhas(existingOrcamento?.servicos);

  const [pecas, setPecas] = useState<LinhaItem[]>(
    existingPecas.length > 0 ? existingPecas : [{ ...LINHA_VAZIA }]
  );
  const [servicos, setServicos] = useState<LinhaItem[]>(
    existingServicos.length > 0 ? existingServicos : [{ ...LINHA_VAZIA }]
  );
  const [maoObra, setMaoObra] = useState(
    existingOrcamento?.mao_de_obra || 0
  );
  const [prazoEstimado, setPrazoEstimado] = useState("");
  const [observacoes, setObservacoes] = useState(
    existingOrcamento?.observacoes || ""
  );
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const totalPecas = useMemo(() => pecas.reduce((acc, p) => acc + subtotal(p), 0), [pecas]);
  const totalServicos = useMemo(() => servicos.reduce((acc, sv) => acc + subtotal(sv), 0), [servicos]);

  // O que a garantia absorveu — não é cobrado, mas mostramos para o cliente ver o benefício.
  const totalGarantia = useMemo(
    () => [...pecas, ...servicos]
      .filter((i) => i.garantia && i.descricao.trim() !== "")
      .reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0),
    [pecas, servicos]
  );

  const total = useMemo(
    () => totalPecas + totalServicos + maoObra,
    [totalPecas, totalServicos, maoObra]
  );

  const addPeca = useCallback(() => setPecas((prev) => [...prev, { ...LINHA_VAZIA }]), []);
  const removePeca = useCallback((index: number) => setPecas((prev) => prev.filter((_, i) => i !== index)), []);
  const updatePeca = useCallback(
    (index: number, field: keyof LinhaItem, value: string | number | boolean) => {
      setPecas((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    },
    []
  );

  const addServico = useCallback(() => setServicos((prev) => [...prev, { ...LINHA_VAZIA }]), []);
  const removeServico = useCallback((index: number) => setServicos((prev) => prev.filter((_, i) => i !== index)), []);
  const updateServico = useCallback(
    (index: number, field: keyof LinhaItem, value: string | number | boolean) => {
      setServicos((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
    },
    []
  );

  function serializar(linhas: LinhaItem[], tipo: "peca" | "servico"): OrcamentoItem[] {
    return linhas
      .filter((l) => l.descricao.trim() !== "")
      .map((l) => ({
        descricao: l.descricao,
        quantidade: l.quantidade,
        valor_unitario: l.garantia ? 0 : l.valor_unitario,
        valor_total: subtotal(l),
        tipo,
        garantia: l.garantia,
      }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const orcamentoData = {
        ordem_id: orderId,
        criado_por: user?.id,
        pecas: serializar(pecas, "peca"),
        servicos: serializar(servicos, "servico"),
        mao_de_obra: maoObra,
        custos_adicionais: 0,
        prazo_estimado: prazoEstimado || null,
        valor_total: total,
        status: "rascunho" as const,
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
        responsavel_id: user?.id || null,
        tipo: "orcamento_enviado",
        titulo: "Orcamento enviado ao cliente",
        descricao: `Valor total: ${formatCurrency(total)}`,
      });

      await (supabase
        .from("ordens_servico") as any)
        .update({ status: "orcamento_enviado" })
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
      <LinhasSecao
        titulo="Peças"
        rotuloItem="Nome da peça"
        linhas={pecas}
        subtotalLabel="Subtotal de peças"
        onAdd={addPeca}
        onRemove={removePeca}
        onUpdate={updatePeca}
      />

      <Separator />

      {/* Servicos / mao de obra */}
      <LinhasSecao
        titulo="Serviços e mão de obra"
        rotuloItem="Descrição do serviço executado"
        linhas={servicos}
        subtotalLabel="Subtotal de serviços"
        onAdd={addServico}
        onRemove={removeServico}
        onUpdate={updateServico}
      />

      <Separator />

      {/* Mao de obra avulsa e prazo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Mão de obra adicional (R$)</Label>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={maoObra}
            onChange={(e) => setMaoObra(parseFloat(e.target.value) || 0)}
            className="mt-1"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Use para um valor fechado. Serviços detalhados vão na seção acima.
          </p>
        </div>
        <div>
          <Label className="text-sm font-medium">Prazo estimado</Label>
          <Input
            placeholder="Ex: 3 dias úteis"
            value={prazoEstimado}
            onChange={(e) => setPrazoEstimado(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {/* Observacoes */}
      <div>
        <Label className="text-sm font-medium">Observações</Label>
        <Textarea
          placeholder="Observações sobre o orçamento..."
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
            <span className="text-muted-foreground">Peças</span>
            <span>{formatCurrency(totalPecas)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Serviços</span>
            <span>{formatCurrency(totalServicos)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mão de obra adicional</span>
            <span>{formatCurrency(maoObra)}</span>
          </div>
          {totalGarantia > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Coberto pela garantia
              </span>
              <span>&minus; {formatCurrency(totalGarantia)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-bold">
            <span>Total a pagar</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
          {totalGarantia > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1">
              Os itens marcados como garantia continuam registrados na ordem e no histórico
              do cliente, com valor zerado.
            </p>
          )}
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
