import "server-only";
import { normalize, scriptStats } from "../kannada";
import type { SttResult } from "./sarvam";

// Gate 2: decide "clear or not" from signals the code can check, before the
// LLM ever sees the turn. Thresholds are starting points; tune them on real
// recordings (good Kannada, broken Kannada, English, silence, a noisy room).

const LANG_NAMES: Record<string, string> = {
  "hi-IN": "Hindi", "en-IN": "English", "ta-IN": "Tamil", "te-IN": "Telugu", "ml-IN": "Malayalam",
  "mr-IN": "Marathi", "bn-IN": "Bengali", "gu-IN": "Gujarati", "pa-IN": "Punjabi", "ur-IN": "Urdu",
};

export type GateVerdict =
  | { ok: true }
  | { ok: false; kind: "no_speech" | "not_kannada" | "unclear"; message: string; language?: string | null };

export function sttGate(stt: SttResult, durationMs: number): GateVerdict {
  const text = stt.transcript.trim();
  if (!text) return { ok: false, kind: "no_speech", message: "I didn't catch any speech. Try again a bit closer to the phone." };

  // Speech models sometimes invent repeated words from noise.
  const words = normalize(text).split(" ").filter(Boolean);
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  if (durationMs < 3000 && [...counts.values()].some((c) => c >= 3)) {
    return { ok: false, kind: "no_speech", message: "That sounded like background noise. Try again somewhere a little quieter." };
  }

  const stats = scriptStats(text);
  const lang = stt.language_code;
  const prob = stt.language_probability ?? 0;
  const langName = lang ? LANG_NAMES[lang] : undefined;

  // Kanglish is fine: Latin-script English words count as allowed, as long as
  // some of the sentence is Kannada.
  const kannadaOrLatin = stats.total ? (stats.kannada + stats.latin) / stats.total : 0;
  if (stats.kannada === 0 || stats.kannadaShare < 0.3) {
    if (stats.kannada === 0 || kannadaOrLatin < 0.7 || (lang && lang !== "kn-IN" && prob > 0.7)) {
      return {
        ok: false,
        kind: "not_kannada",
        language: lang,
        message: langName ? `That sounded like ${langName}. Try it in Kannada; the hint button has phrases.` : "That didn't sound like Kannada. Try it in Kannada; the hint button has phrases.",
      };
    }
  }
  if (lang && lang !== "kn-IN" && prob > 0.7 && stats.kannadaShare < 0.5) {
    return { ok: false, kind: "not_kannada", language: lang, message: `That sounded like ${langName ?? "another language"}. Try it in Kannada.` };
  }
  if (stt.language_probability !== null && prob < 0.4) {
    return { ok: false, kind: "unclear", message: "I heard something, but it wasn't clear enough to answer." };
  }
  return { ok: true };
}

/** Typed input: no audio signals, so only basic checks. Romanised Kannada is allowed. */
export function textGate(text: string): GateVerdict {
  const t = text.trim();
  if (!t) return { ok: false, kind: "no_speech", message: "Type something to say." };
  const stats = scriptStats(t);
  if (stats.other > 0 && stats.kannada === 0) {
    return { ok: false, kind: "not_kannada", message: "Type in Kannada script or in English letters (like 'meter haaki')." };
  }
  return { ok: true };
}

/** Gate 4: the character's line must be mostly Kannada script, and short. */
export function replyOk(kn: string) {
  const s = scriptStats(kn);
  return s.kannada > 0 && s.kannadaShare >= 0.5;
}

export function trimReply(kn: string, max = 200) {
  if (kn.length <= max) return kn;
  const cut = kn.slice(0, max);
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("?"), cut.lastIndexOf("!"));
  return end > 40 ? cut.slice(0, end + 1) : cut.trimEnd() + "…";
}
