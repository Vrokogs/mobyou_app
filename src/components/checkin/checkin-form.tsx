"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  CHECKIN_ITEMS,
  CHECKIN_CLASSIFICATIONS,
} from "@/lib/constants";
import type { CheckinItem } from "@/types/database";
import { cn } from "@/lib/utils";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CheckinFormData {
  [itemValue: string]: {
    classificacao: string;
    observacao: string;
  };
}

interface CheckinFormProps {
  orderId: string;
  existingData?: CheckinItem[];
  onSubmit?: () => void;
  readOnly?: boolean;
}

const CLASSIFICATION_COLORS: Record<string, string> = {
  bom: "data-checked:border-green-500 data-checked:bg-green-500",
  regular: "data-checked:border-yellow-500 data-checked:bg-yellow-500",
  ruim: "data-checked:border-red-500 data-checked:bg-red-500",
  nao_aplicavel: "data-checked:border-gray-400 data-checked:bg-gray-400",
  ausente: "data-checked:border-gray-600 data-checked:bg-gray-600",
};

const CLASSIFICATION_LABEL_COLORS: Record<string, string> = {
  bom: "text-green-700 dark:text-green-400",
  regular: "text-yellow-700 dark:text-yellow-400",
  ruim: "text-red-700 dark:text-red-400",
  nao_aplicavel: "text-gray-500",
  ausente: "text-gray-600",
};

export function CheckinForm({
  orderId,
  existingData,
  onSubmit,
  readOnly = false,
}: CheckinFormProps) {
  const initialData: CheckinFormData = {};
  CHECKIN_ITEMS.forEach((item) => {
    const existing = existingData?.find((e) => e.item === item.value);
    initialData[item.value] = {
      classificacao: existing?.classificacao || "",
      observacao: existing?.observacao || "",
    };
  });

  const [formData, setFormData] = useState<CheckinFormData>(initialData);
  const [saving, setSaving] = useState(false);

  const handleClassificacao = useCallback(
    (itemValue: string, classificacao: string) => {
      setFormData((prev) => ({
        ...prev,
        [itemValue]: { ...prev[itemValue], classificacao },
      }));
    },
    []
  );

  const handleObservacao = useCallback(
    (itemValue: string, observacao: string) => {
      setFormData((prev) => ({
        ...prev,
        [itemValue]: { ...prev[itemValue], observacao },
      }));
    },
    []
  );

  async function handleSubmit() {
    const filled = Object.entries(formData).filter(
      ([, v]) => v.classificacao !== ""
    );
    if (filled.length === 0) {
      toast.error("Preencha pelo menos um item do checklist");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      if (existingData && existingData.length > 0) {
        await supabase
          .from("checkin_items")
          .delete()
          .eq("ordem_id", orderId);
      }

      const items = filled.map(([itemValue, data]) => ({
        ordem_id: orderId,
        item: itemValue,
        classificacao: data.classificacao,
        observacao: data.observacao || null,
      }));

      const { error } = await (supabase.from("checkin_items") as any).insert(items);

      if (error) throw error;

      toast.success("Check-in salvo com sucesso");
      onSubmit?.();
    } catch (err) {
      console.error("Erro ao salvar checkin:", err);
      toast.error("Erro ao salvar check-in");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {CHECKIN_ITEMS.map((item) => {
        const data = formData[item.value];
        return (
          <div
            key={item.value}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              data?.classificacao === "ruim" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
              data?.classificacao === "regular" && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20",
              data?.classificacao === "bom" && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
              !data?.classificacao && "border-border"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="sm:w-40 shrink-0">
                <Label className="text-sm font-medium">{item.label}</Label>
              </div>

              <div className="flex-1">
                <RadioGroup
                  value={data?.classificacao || ""}
                  onValueChange={(val: string) =>
                    handleClassificacao(item.value, val)
                  }
                  disabled={readOnly}
                  className="flex flex-wrap gap-3"
                >
                  {CHECKIN_CLASSIFICATIONS.map((cls) => (
                    <div key={cls.value} className="flex items-center gap-1.5">
                      <RadioGroupItem
                        value={cls.value}
                        className={cn(CLASSIFICATION_COLORS[cls.value])}
                      />
                      <Label
                        className={cn(
                          "text-xs font-medium cursor-pointer",
                          data?.classificacao === cls.value
                            ? CLASSIFICATION_LABEL_COLORS[cls.value]
                            : "text-muted-foreground"
                        )}
                      >
                        {cls.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="sm:w-48">
                <Input
                  placeholder="Observacao..."
                  value={data?.observacao || ""}
                  onChange={(e) =>
                    handleObservacao(item.value, e.target.value)
                  }
                  disabled={readOnly}
                  className="text-xs h-7"
                />
              </div>
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Salvar Check-in
          </Button>
        </div>
      )}
    </div>
  );
}

export function CheckinFormSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-3 flex-1">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
