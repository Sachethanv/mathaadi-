import { getScene, HOLD_ON_LINE, LIFESAVERS, ONLY_KANNADA_LINE, REPEAT_LINE, SCENES } from "@/lib/scenes";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { sarvamConfigured, speak } from "@/lib/server/sarvam";

export const runtime = "nodejs";

// Only fixed lines (phrases, openings, scripted replies) are spoken through this
// GET route, so responses can be cached by the CDN and repeat demos cost nothing.
const ALLOWED = new Set<string>([
  ...SCENES.flatMap((s) => [s.opening.kn, ...s.phrases.map((p) => p.kn), ...s.demo.map((d) => d.reply.kn)]),
  ...LIFESAVERS.map((p) => p.kn),
  REPEAT_LINE.kn,
  ONLY_KANNADA_LINE.kn,
  HOLD_ON_LINE.kn,
]);

const memo = new Map<string, Buffer>();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const text = url.searchParams.get("text") ?? "";
  const scene = getScene(url.searchParams.get("scene") ?? "");
  const slow = url.searchParams.get("slow") === "1";
  if (!sarvamConfigured()) return new Response(null, { status: 204 });
  if (!ALLOWED.has(text)) return new Response("Not a fixed line", { status: 400 });

  const voice = scene?.character.voice ?? "ishita";
  const key = `${voice}:${slow}:${text}`;
  let audio = memo.get(key);
  if (!audio) {
    const rl = rateLimit(clientIp(req), "tts", 120);
    if (!rl.ok) return new Response("Too many requests", { status: 429 });
    try {
      audio = await speak(text, voice, slow ? 0.7 : 1);
    } catch (e) {
      console.error("[tts]", e);
      return new Response("TTS failed", { status: 502 });
    }
    if (memo.size > 300) memo.clear();
    memo.set(key, audio);
  }
  return new Response(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=604800, s-maxage=31536000, immutable",
    },
  });
}
