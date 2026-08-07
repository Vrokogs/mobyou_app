"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
  height?: number;
  label?: string;
}

export function SignaturePad({ onChange, height = 150, label }: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const drawn = React.useRef(false);
  const last = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, rect.width) * ratio;
    canvas.height = Math.max(1, rect.height) * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#0B1A2D";
    }
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    last.current = getPos(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx || !last.current) return;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    drawn.current = true;
  }

  function handleUp() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    emit();
  }

  function emit() {
    const c = canvasRef.current;
    if (!c) return;
    onChange(drawn.current ? c.toDataURL("image/png") : null);
  }

  function clear() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, c.width, c.height);
    drawn.current = false;
    onChange(null);
  }

  return (
    <div className="space-y-1">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <div className="relative rounded-md border bg-white">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height, touchAction: "none" }}
          className="rounded-md"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
        />
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="absolute top-1 right-1 text-muted-foreground"
          onClick={clear}
        >
          <Eraser className="h-3 w-3 mr-1" />
          Limpar
        </Button>
        <span className="pointer-events-none absolute bottom-1 left-2 text-[10px] text-muted-foreground">
          Assine aqui
        </span>
      </div>
    </div>
  );
}
