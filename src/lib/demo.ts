// Demo mode: a scripted character that works with no API key, so the full
// flow can be tried (and shown to judges) even if the live service is down.
import { normalize, scriptStats, transliterate } from "./kannada";
import { ONLY_KANNADA_LINE, REPEAT_LINE } from "./scenes";
import type { Scene, TurnResult } from "./types";

function line(l: { kn: string; en: string }, scripted: boolean) {
  return { ...l, translit: transliterate(l.kn), scripted };
}

/** The line the demo pretends the learner said when they use the mic. */
export function demoHeard(scene: Scene, done: number[]) {
  const next =
    scene.demo.find((d, i) => d.required && !done.includes(i)) ?? scene.demo.find((_, i) => !done.includes(i)) ?? scene.demo[scene.demo.length - 1];
  return next.say;
}

export function demoTurn(scene: Scene, heard: string, done: number[], typed: boolean): TurnResult & { stepIndex?: number } {
  const text = normalize(heard);
  const stats = scriptStats(heard);
  if (!text) return { kind: "no_speech", message: "Type something to say.", scored: false, demo: true, typed };
  if (stats.other > 0 && stats.kannada === 0) {
    return { kind: "not_kannada", heard, reply: line(ONLY_KANNADA_LINE, true), message: "That didn't look like Kannada. Try a phrase from the hints.", scored: false, demo: true, typed };
  }

  const order = scene.demo.map((_, i) => i).sort((a, b) => Number(done.includes(a)) - Number(done.includes(b)));
  const idx = order.find((i) => scene.demo[i].match.some((k) => text.includes(normalize(k))));
  if (idx === undefined) {
    return {
      kind: "unclear",
      heard,
      reply: line(REPEAT_LINE, true),
      meaningEn: null,
      tip: "Demo mode only understands the scene's phrases. Try one from the hints.",
      scored: false,
      demo: true,
      typed,
    };
  }
  const step = scene.demo[idx];
  const nowDone = new Set([...done, idx]);
  const goalComplete = scene.demo.every((s, i) => !s.required || nowDone.has(i));
  const englishOnly = stats.kannada === 0;
  return {
    kind: "clear",
    heard,
    reply: line(step.reply, false),
    meaningEn: null,
    tip: step.tip ?? null,
    better: englishOnly ? line({ kn: step.say, en: "The same thing in Kannada script" }, false) : null,
    stepDone: !done.includes(idx),
    goalComplete,
    scored: true,
    demo: true,
    typed,
    stepIndex: idx,
  };
}
