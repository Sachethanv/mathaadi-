import "server-only";

// Best-effort per-IP limit so a single visitor can't drain API credits.
// In-memory, so each serverless instance counts separately; good enough for a demo.
const hits = new Map<string, number[]>();

export function rateLimit(ip: string, bucket: string, limit: number, windowMs = 60 * 60 * 1000) {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return { ok: false, retryAfterSec: Math.ceil((windowMs - (now - list[0])) / 1000) };
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || now - v[v.length - 1] > windowMs) hits.delete(k);
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
