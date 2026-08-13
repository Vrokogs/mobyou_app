// Rate limiter simples em memória (janela fixa por IP+rota).
// Observação: em serverless (Vercel) o estado é por instância e reinicia em cold
// start — é uma primeira camada contra rajadas/abuso. Para limite forte e
// distribuído, migrar depois para Vercel KV / Upstash Redis.

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

// Limpeza preguiçosa para não crescer indefinidamente
function gc(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  gc(now);
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return (xff?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

// Helper: retorna Response 429 pronta se estourar o limite; senão null.
export function checkRate(
  req: Request,
  rota: string,
  limit: number,
  windowMs = 60_000,
): { retryAfter: number } | null {
  const { ok, retryAfter } = rateLimit(`${rota}:${clientIp(req)}`, limit, windowMs);
  return ok ? null : { retryAfter };
}
