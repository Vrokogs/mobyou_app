"use client";

import * as React from "react";
import { ptBR } from "react-day-picker/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5)); // 00, 05, ..., 55

// value format: "YYYY-MM-DDTHH:mm" (same as <input type="datetime-local">)
function parseValue(value: string) {
  if (!value) return { date: undefined as Date | undefined, hour: "", minute: "" };
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = (datePart || "").split("-").map(Number);
  const date = y && m && d ? new Date(y, m - 1, d) : undefined;
  const [hh = "", mm = ""] = (timePart || "").split(":");
  return { date, hour: hh, minute: mm };
}

function buildValue(date: Date | undefined, hour: string, minute: string) {
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${hour || "09"}:${minute || "00"}`;
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Selecione data e horario",
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const { date, hour, minute } = parseValue(value);

  const display = value
    ? new Date(value).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  function handleDateSelect(selected: Date | undefined) {
    if (!selected) return;
    onChange(buildValue(selected, hour, minute));
  }

  function handleHour(h: string | null) {
    if (!h) return;
    onChange(buildValue(date ?? new Date(), h, minute || "00"));
  }

  function handleMinute(m: string | null) {
    if (!m) return;
    onChange(buildValue(date ?? new Date(), hour || "09", m));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="h-4 w-4 opacity-70" />
            {display || placeholder}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={date}
            onSelect={handleDateSelect}
            captionLayout="dropdown"
            autoFocus
          />
          <div className="flex flex-col gap-3 border-t p-3 sm:border-t-0 sm:border-l">
            <p className="text-xs font-medium text-muted-foreground">Horario</p>
            <div className="flex items-center gap-2">
              <Select value={hour} onValueChange={handleHour}>
                <SelectTrigger className="w-[72px]">
                  <SelectValue placeholder="HH" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">:</span>
              <Select value={minute} onValueChange={handleMinute}>
                <SelectTrigger className="w-[72px]">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {MINUTES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {["08:00", "10:00", "13:00", "15:00", "17:00", "19:00"].map(
                (slot) => {
                  const active = value && display.endsWith(slot);
                  return (
                    <Button
                      key={slot}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        const [h, m] = slot.split(":");
                        onChange(buildValue(date ?? new Date(), h, m));
                      }}
                    >
                      {slot}
                    </Button>
                  );
                }
              )}
            </div>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => onChange("")}
              >
                Limpar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
