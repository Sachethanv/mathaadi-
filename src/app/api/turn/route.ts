import { NextResponse } from "next/server";
import { demoHeard, demoTurn } from "@/lib/demo";
import { transliterate } from "@/lib/kannada";
import { getScene, HOLD_ON_LINE, ONLY_KANNADA_LINE, REPEAT_LINE } from "@/lib/scenes";
import { replyOk, sttGate, textGate, trimReply } from "@/lib/server/gates";
import { systemPrompt, TURN_SCHEMA, userPrompt } from "@/lib/server/prompt";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { chatJson, SarvamError, sarvamConfigured, speak, transcribe } from "@/lib/server/sarvam";
import type { HistoryItem, TurnResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 2.5 * 1024 * 1024;
const MAX_TEXT = 200;

type LlmTurn = {
  comprehension: "clear" | "partial" | "unclear";
  heard: string;
  meaning_en: string | null;
  step_done: boolean;
  goal_complete: boolean;
  reply_kn: string;
  reply_en: string;
  tip: string | null;
  better_kn: string | null;
  better_en: string | null;
};

const scripted = (l: { kn: string; en: string }) => ({ ...l, translit: transliterate(l.kn), scripted: true });

function parseJsonSafe(s: string): LlmTurn | null {
  const cleaned = s.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof v.reply_kn !== "string" || !["clear", "partial", "unclear"].includes(v.comprehension)) return null;
    return v as LlmTurn;
  } catch {
    return null;
  }
}

function errorResult(e: unknown): TurnResult {
  const code = e instanceof SarvamError ? e.code : "upstream";
  const message =
    code === "quota"
      ? "The live voice service has run out of credit. Turn on demo mode in Settings to keep practising."
      : code === "busy"
        ? "Lots of people are practising right now. Try again in a moment."
        : code === "timeout" || code === "network"
          ? "The connection is slow. Check your data and try again."
          : "Something went wrong on our side. Try again.";
  console.error("[turn]", e);
  return { kind: "error", message, scored: false };
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ kind: "error", message: "Bad request.", scored: false } satisfies TurnResult, { status: 400 });
  }
  const scene = getScene(String(form.get("sceneId") ?? ""));
  if (!scene) return NextResponse.json({ kind: "error", message: "Unknown scene.", scored: false } satisfies TurnResult, { status: 404 });

  let history: HistoryItem[] = [];
  let done: number[] = [];
  try {
    history = JSON.parse(String(form.get("history") ?? "[]")).slice(-12);
    done = JSON.parse(String(form.get("done") ?? "[]")).filter((n: unknown) => typeof n === "number");
  } catch {}
  const audio = form.get("audio");
  const typedText = String(form.get("text") ?? "").slice(0, MAX_TEXT);
  const durationMs = Number(form.get("durationMs") ?? 0);
  const pace = form.get("slow") === "1" ? 0.8 : 1;
  const typed = !(audio instanceof Blob);
  const live = sarvamConfigured() && form.get("demo") !== "1";

  // Demo mode ---------------------------------------------------------------
  if (!live) {
    const heard = typed ? typedText : demoHeard(scene, done);
    return NextResponse.json(demoTurn(scene, heard, done, typed));
  }

  // Live mode ---------------------------------------------------------------
  const rl = rateLimit(clientIp(req), "turn", Number(process.env.TURNS_PER_HOUR || 30));
  if (!rl.ok) {
    return NextResponse.json(
      { kind: "error", message: `You've practised a lot this hour. Take a short break and come back in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`, scored: false } satisfies TurnResult,
      { status: 429 },
    );
  }

  try {
    let heard: string;
    if (!typed) {
      const blob = audio as Blob;
      if (blob.size < 1000) return NextResponse.json({ kind: "no_speech", message: "Hold the button while you speak.", scored: false } satisfies TurnResult);
      if (blob.size > MAX_AUDIO_BYTES) return NextResponse.json({ kind: "no_speech", message: "That recording was too long. Keep it under 15 seconds.", scored: false } satisfies TurnResult);
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("wav") ? "wav" : "webm";
      const stt = await transcribe(blob, `turn.${ext}`, scene.keyterms);
      const verdict = sttGate(stt, durationMs);
      heard = stt.transcript.trim();
      if (!verdict.ok) {
        const reply = verdict.kind === "not_kannada" ? scripted(ONLY_KANNADA_LINE) : verdict.kind === "unclear" ? scripted(REPEAT_LINE) : undefined;
        return NextResponse.json({ kind: verdict.kind, heard: heard || undefined, detectedLanguage: stt.language_code, message: verdict.message, reply, scored: false } satisfies TurnResult);
      }
    } else {
      const verdict = textGate(typedText);
      heard = typedText.trim();
      if (!verdict.ok) return NextResponse.json({ kind: verdict.kind, message: verdict.message, scored: false, typed } satisfies TurnResult);
    }

    // Gate 3: the LLM, forced into a schema. Gate 4: check what it produced.
    let turn: LlmTurn | null = null;
    for (let attempt = 0; attempt < 2 && !turn; attempt++) {
      const { content, finish } = await chatJson(systemPrompt(scene), userPrompt(history, heard, typed), TURN_SCHEMA);
      if (finish === "length") continue;
      const parsed = parseJsonSafe(content);
      if (parsed && replyOk(parsed.reply_kn)) turn = parsed;
    }
    if (!turn) {
      return NextResponse.json({ kind: "error", heard, reply: scripted(HOLD_ON_LINE), message: "The character lost their words for a second. Try saying it again.", scored: false, typed } satisfies TurnResult);
    }

    const unclear = turn.comprehension === "unclear";
    // The code, not only the prompt, enforces "no guessing".
    const replyLine = unclear ? REPEAT_LINE : { kn: trimReply(turn.reply_kn.trim()), en: turn.reply_en.trim() };
    const result: TurnResult = {
      kind: turn.comprehension,
      heard, // always the exact transcript, never the LLM's copy
      reply: { ...replyLine, translit: transliterate(replyLine.kn), scripted: unclear },
      meaningEn: unclear ? null : turn.meaning_en,
      tip: unclear ? null : turn.tip,
      better: !unclear && turn.better_kn && replyOk(turn.better_kn) ? { kn: turn.better_kn, en: turn.better_en ?? "", translit: transliterate(turn.better_kn) } : null,
      stepDone: !unclear && turn.step_done,
      goalComplete: !unclear && turn.goal_complete,
      scored: !unclear,
      typed,
    };

    if (!unclear) {
      try {
        const mp3 = await speak(result.reply!.kn, scene.character.voice, pace);
        result.audio = mp3.toString("base64");
        result.audioMime = "audio/mpeg";
      } catch (e) {
        console.error("[turn] tts", e);
      }
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(errorResult(e), { status: 200 });
  }
}
