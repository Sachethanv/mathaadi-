import { NextResponse } from "next/server";
import { getScene } from "@/lib/scenes";
import { systemPrompt, TURN_SCHEMA, userPrompt } from "@/lib/server/prompt";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { audioMime, chatJson, sarvamConfigured, speak } from "@/lib/server/sarvam";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const msg = (e: unknown) => String((e as Error)?.message ?? e).slice(0, 400);

/**
 * GET /api/status            → { live }
 * GET /api/status?check=1    → also makes one small character call and one
 *                              voice call, and says what came back. For
 *                              checking a deployment; costs a few paise.
 */
export async function GET(req: Request) {
  const live = sarvamConfigured();
  if (new URL(req.url).searchParams.get("check") !== "1" || !live) return NextResponse.json({ live });
  if (!rateLimit(clientIp(req), "check", 6).ok) return NextResponse.json({ live, error: "Too many checks this hour." }, { status: 429 });

  const scene = getScene("auto")!;
  const out: Record<string, unknown> = { live };
  try {
    const t0 = Date.now();
    const { content, finish } = await chatJson(systemPrompt(scene), userPrompt([{ who: "character", kn: scene.opening.kn }], "ಮೆಜೆಸ್ಟಿಕ್ ಹೋಗ್ಬೇಕು", false), TURN_SCHEMA);
    let parsed: { reply_kn?: string } | null = null;
    try {
      parsed = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1));
    } catch {}
    out.character = { ok: !!parsed?.reply_kn, ms: Date.now() - t0, finish, reply: parsed?.reply_kn ?? null, raw: parsed ? undefined : content.slice(0, 300) };
  } catch (e) {
    out.character = { ok: false, error: msg(e) };
  }
  try {
    const t0 = Date.now();
    const audio = await speak(scene.opening.kn, scene.character.voice, 1);
    out.voice = { ok: audio.length > 1000, ms: Date.now() - t0, bytes: audio.length, type: audioMime(audio) };
  } catch (e) {
    out.voice = { ok: false, error: msg(e) };
  }
  return NextResponse.json(out);
}
