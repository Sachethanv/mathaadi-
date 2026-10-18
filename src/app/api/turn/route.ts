import { NextResponse } from "next/server";
import { demoHeard, demoTurn } from "@/lib/demo";
import { transliterate } from "@/lib/kannada";
import { checkScene, isCustomId } from "@/lib/custom";
import { getScene, HOLD_ON_LINE, ONLY_KANNADA_LINE, REPEAT_LINE } from "@/lib/scenes";
import { replyOk, sttGate, textGate, trimReply } from "@/lib/server/gates";
import { systemPrompt, TURN_SCHEMA, userPrompt } from "@/lib/server/prompt";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { chatJson, chatStream, SarvamError, sarvamConfigured, speak, transcribe } from "@/lib/server/sarvam";
import { verify } from "@/lib/server/plan";
import { enumField, partialString, takeSentences, visibleJson } from "@/lib/server/stream";
import type { HistoryItem, Scene, StreamEvent, TurnResult } from "@/lib/types";

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

type Emit = (e: StreamEvent) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demo mode, paced like the live service so the streamed UI behaves the same. */
async function demoStream(result: TurnResult, typed: boolean, emit: Emit) {
  await sleep(typed ? 150 : 450);
  if (result.heard) emit({ t: "heard", heard: result.heard, typed, demo: !typed });
  if (result.reply && !result.reply.scripted) {
    await sleep(350);
    const words = result.reply.kn.split(" ");
    for (let i = 1; i <= words.length; i++) {
      emit({ t: "reply", kn: words.slice(0, i).join(" ") });
      await sleep(70);
    }
  }
  emit({ t: "done", result });
}

/**
 * Speaks sentences as they are accepted. Each one is sent to Sarvam at once
 * (in parallel), and the audio is emitted strictly in order.
 */
function speechQueue(voice: string, pace: number, emit: Emit) {
  let chain = Promise.resolve();
  return {
    add(sentence: string) {
      const audio = speak(sentence, voice, pace).catch((e) => {
        console.error("[turn] tts", e);
        return null;
      });
      chain = chain.then(async () => {
        const mp3 = await audio;
        if (mp3) emit({ t: "audio", audio: mp3.toString("base64"), mime: "audio/mpeg" });
      });
    },
    drain: () => chain,
  };
}

type Reply = { turn: LlmTurn; spoken: string | null };

/**
 * Gate 3 with streaming. Gate 4 runs on every sentence before it is shown:
 * nothing is emitted until "comprehension" is known, an unclear turn stops the
 * stream, and a sentence that isn't Kannada script ends the reply there.
 */
async function streamedLlm(scene: Scene, history: HistoryItem[], heard: string, typed: boolean, emit: Emit, speech: ReturnType<typeof speechQueue>): Promise<Reply | null> {
  let comprehension: string | null = null;
  let consumed = 0;
  let shown = "";
  let closed = false; // no more sentences will be accepted
  let badStart = false;

  const { content, stopped } = await chatStream(systemPrompt(scene), userPrompt(history, heard, typed), TURN_SCHEMA, (soFar, stop) => {
    const json = visibleJson(soFar);
    if (json === null || closed) return;
    comprehension ??= enumField(json, "comprehension");
    if (!comprehension) return;
    if (comprehension === "unclear") {
      closed = true;
      return stop();
    }
    const field = partialString(json, "reply_kn");
    if (!field) return;
    const { sentences, next } = takeSentences(field.value, consumed, field.closed);
    consumed = next;
    for (const raw of sentences) {
      if (!replyOk(raw)) {
        closed = true;
        if (!shown) {
          badStart = true;
          stop();
        }
        return;
      }
      const room = 200 - shown.length;
      const s = raw.length <= room ? raw : shown ? "" : trimReply(raw);
      if (!s) {
        closed = true;
        return;
      }
      shown = shown ? `${shown} ${s}` : s;
      speech.add(s);
      emit({ t: "reply", kn: shown });
    }
    if (field.closed) closed = true;
  });

  if (comprehension === "unclear") {
    const parsed = stopped ? null : parseJsonSafe(content);
    return { turn: parsed ?? { comprehension: "unclear", heard, meaning_en: null, step_done: false, goal_complete: false, reply_kn: REPEAT_LINE.kn, reply_en: REPEAT_LINE.en, tip: null, better_kn: null, better_en: null }, spoken: null };
  }
  if (badStart) return null;
  const parsed = parseJsonSafe(content);
  if (shown) {
    // Text already on screen wins; the rest of the JSON fills in the details.
    const base: LlmTurn = parsed ?? { comprehension: "partial", heard, meaning_en: null, step_done: false, goal_complete: false, reply_kn: shown, reply_en: "", tip: null, better_kn: null, better_en: null };
    return { turn: { ...base, comprehension: base.comprehension === "unclear" ? "partial" : base.comprehension, reply_kn: shown, reply_en: parsed?.reply_en ?? "" }, spoken: shown };
  }
  return parsed && replyOk(parsed.reply_kn) ? { turn: parsed, spoken: null } : null;
}

async function plainLlm(scene: Scene, history: HistoryItem[], heard: string, typed: boolean, attempts: number): Promise<LlmTurn | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { content, finish } = await chatJson(systemPrompt(scene), userPrompt(history, heard, typed), TURN_SCHEMA);
    if (finish === "length") continue;
    const parsed = parseJsonSafe(content);
    if (parsed && replyOk(parsed.reply_kn)) return parsed;
  }
  return null;
}

type TurnInput = { scene: Scene; history: HistoryItem[]; done: number[]; audio: Blob | null; typedText: string; durationMs: number; pace: number };

/**
 * The live pipeline. With emit, it streams and the caller awaits drain() for
 * the last audio; without, it returns one result with the audio inside.
 */
async function liveTurn(input: TurnInput, emit: Emit | null, speech: ReturnType<typeof speechQueue> | null): Promise<TurnResult> {
  const { scene, history, audio, typedText, durationMs, pace } = input;
  const typed = !audio;
  let heard: string;
  if (audio) {
    if (audio.size < 1000) return { kind: "no_speech", message: "Hold the button while you speak.", scored: false };
    if (audio.size > MAX_AUDIO_BYTES) return { kind: "no_speech", message: "That recording was too long. Keep it under 15 seconds.", scored: false };
    const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : audio.type.includes("wav") ? "wav" : "webm";
    const stt = await transcribe(audio, `turn.${ext}`, scene.keyterms);
    const verdict = sttGate(stt, durationMs);
    heard = stt.transcript.trim();
    if (!verdict.ok) {
      const reply = verdict.kind === "not_kannada" ? scripted(ONLY_KANNADA_LINE) : verdict.kind === "unclear" ? scripted(REPEAT_LINE) : undefined;
      return { kind: verdict.kind, heard: heard || undefined, detectedLanguage: stt.language_code, message: verdict.message, reply, scored: false };
    }
  } else {
    const verdict = textGate(typedText);
    heard = typedText.trim();
    if (!verdict.ok) return { kind: verdict.kind, message: verdict.message, scored: false, typed };
  }
  // The learner sees exactly what was heard while the character thinks.
  emit?.({ t: "heard", heard, typed });

  // Gate 3: the LLM, forced into a schema. Gate 4: check what it produced.
  let turn: LlmTurn | null = null;
  let spoken: string | null = null;
  if (emit && speech) {
    const r = await streamedLlm(scene, history, heard, typed, emit, speech);
    if (r) ({ turn, spoken } = r);
    else turn = await plainLlm(scene, history, heard, typed, 1); // one retry, not streamed
  } else {
    turn = await plainLlm(scene, history, heard, typed, 2);
  }
  if (!turn) {
    return { kind: "error", heard, reply: scripted(HOLD_ON_LINE), message: "The character lost their words for a second. Try saying it again.", scored: false, typed };
  }

  const unclear = turn.comprehension === "unclear";
  // The code, not only the prompt, enforces "no guessing".
  const replyLine = unclear ? REPEAT_LINE : { kn: spoken ?? trimReply(turn.reply_kn.trim()), en: turn.reply_en.trim() };
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

  if (!unclear && !spoken) {
    // Not streamed sentence by sentence (non-streaming request, or the retry).
    if (speech) speech.add(result.reply!.kn);
    else {
      try {
        const mp3 = await speak(result.reply!.kn, scene.character.voice, pace);
        result.audio = mp3.toString("base64");
        result.audioMime = "audio/mpeg";
      } catch (e) {
        console.error("[turn] tts", e);
      }
    }
  }
  return result;
}

function ndjson(run: (emit: Emit) => Promise<void>) {
  const enc = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      let open = true;
      const emit: Emit = (e) => {
        if (!open) return;
        try {
          ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        } catch {
          open = false; // client went away
        }
      };
      try {
        await run(emit);
      } catch (e) {
        emit({ t: "done", result: errorResult(e) });
      }
      open = false;
      try {
        ctrl.close();
      } catch {}
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" },
  });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ kind: "error", message: "Bad request.", scored: false } satisfies TurnResult, { status: 400 });
  }
  const sceneId = String(form.get("sceneId") ?? "");
  let scene = getScene(sceneId);
  if (!scene && isCustomId(sceneId)) {
    // The learner's own scene travels with the turn. Live turns only accept it
    // unchanged from how the server wrote it; demo turns never reach the model.
    const raw = String(form.get("scene") ?? "");
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}
    const checked = checkScene(parsed);
    const demoTurnOnly = !sarvamConfigured() || form.get("demo") === "1";
    if (checked && checked.id === sceneId && (demoTurnOnly || verify(raw, String(form.get("sceneSig") ?? "")))) scene = checked;
  }
  if (!scene) return NextResponse.json({ kind: "error", message: "Unknown scene.", scored: false } satisfies TurnResult, { status: 404 });

  let history: HistoryItem[] = [];
  let done: number[] = [];
  try {
    history = JSON.parse(String(form.get("history") ?? "[]")).slice(-12);
    done = JSON.parse(String(form.get("done") ?? "[]")).filter((n: unknown) => typeof n === "number");
  } catch {}
  const audioField = form.get("audio");
  const audio = audioField instanceof Blob ? audioField : null;
  const typedText = String(form.get("text") ?? "").slice(0, MAX_TEXT);
  const durationMs = Number(form.get("durationMs") ?? 0);
  const pace = form.get("slow") === "1" ? 0.8 : 1;
  const typed = !audio;
  const live = sarvamConfigured() && form.get("demo") !== "1";
  const streaming = form.get("stream") === "1";

  // Demo mode ---------------------------------------------------------------
  if (!live) {
    const heard = typed ? typedText : demoHeard(scene, done);
    const result = demoTurn(scene, heard, done, typed);
    return streaming ? ndjson((emit) => demoStream(result, typed, emit)) : NextResponse.json(result);
  }

  // Live mode ---------------------------------------------------------------
  const rl = rateLimit(clientIp(req), "turn", Number(process.env.TURNS_PER_HOUR || 30));
  if (!rl.ok) {
    return NextResponse.json(
      { kind: "error", message: `You've practised a lot this hour. Take a short break and come back in ${Math.ceil(rl.retryAfterSec / 60)} minutes.`, scored: false } satisfies TurnResult,
      { status: 429 },
    );
  }

  const input: TurnInput = { scene, history, done, audio, typedText, durationMs, pace };
  if (streaming) {
    return ndjson(async (emit) => {
      const speech = speechQueue(scene.character.voice, pace, emit);
      emit({ t: "done", result: await liveTurn(input, emit, speech) });
      await speech.drain();
    });
  }
  try {
    return NextResponse.json(await liveTurn(input, null, null));
  } catch (e) {
    return NextResponse.json(errorResult(e), { status: 200 });
  }
}
