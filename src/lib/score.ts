// Intelligibility score: "would a local understand you?", not a nativeness score.
// Compares the target phrase with what the speech system heard, at the phoneme
// level, with weighted edits for the errors learners of Kannada actually make.
import { phonemes, type Token } from "./kannada";

export type IssueKind = "retroflex" | "length" | "gemination" | "aspiration" | "sibilant" | "missing" | "extra" | "different";

export type Issue = {
  kind: IssueKind;
  target?: string; // akshara in the target phrase
  heard?: string; // akshara in what was heard
  tip: string;
};

export type PhraseScore = {
  score: number; // 0..100
  targetAks: string[];
  flagged: number[]; // indexes into targetAks to highlight
  issues: Issue[];
};

const RETROFLEX: Record<string, string> = { t: "ṭ", th: "ṭh", d: "ḍ", dh: "ḍh", n: "ṇ", l: "ḷ" };
const LONG: Record<string, string> = { a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" };
const ASPIRATED: Record<string, string> = { k: "kh", g: "gh", c: "ch", j: "jh", t: "th", d: "dh", p: "ph", b: "bh", "ṭ": "ṭh", "ḍ": "ḍh" };
const SIBILANTS = new Set(["s", "ś", "ṣ"]);
const NASALS = new Set(["ṁ", "n", "m", "ṇ", "ṅ", "ñ"]);
const VOWELS = new Set(["a", "ā", "i", "ī", "u", "ū", "e", "ē", "o", "ō", "ai", "au", "ṛ"]);

function pairOf(map: Record<string, string>, a: string, b: string) {
  return map[a] === b || map[b] === a;
}

// Fold a phoneme to its plain Latin base, for comparing against romanised input
// (which can't show retroflex or vowel length, so those are not errors there).
const FOLD: Record<string, string> = {
  ā: "a", ī: "i", ū: "u", ē: "e", ō: "o", ṭ: "t", ṭh: "t", th: "t", ḍ: "d", ḍh: "d", dh: "d", ṇ: "n", ṅ: "n", ñ: "n", ṁ: "n",
  ḷ: "l", ḻ: "l", ś: "s", ṣ: "s", ṟ: "r", kh: "k", gh: "g", ch: "c", jh: "j", ph: "p", bh: "b", ṛ: "r",
};
const fold = (p: string) => FOLD[p] ?? p;

function subCost(a: string, b: string, loose = false): [number, IssueKind | null] {
  if (a === b) return [0, null];
  if (loose) return fold(a) === fold(b) ? [0.1, null] : [1, "different"];
  if (pairOf(RETROFLEX, a, b)) return [0.6, "retroflex"];
  if (pairOf(LONG, a, b)) return [0.5, "length"];
  if (pairOf(ASPIRATED, a, b)) return [0.25, "aspiration"];
  if (SIBILANTS.has(a) && SIBILANTS.has(b)) return [0.3, "sibilant"];
  if (a === "ṁ" && NASALS.has(b)) return [0.1, null];
  if (b === "ṁ" && NASALS.has(a)) return [0.1, null];
  if ((a === "r" && b === "ṟ") || (a === "ṟ" && b === "r")) return [0.1, null];
  if ((a === "ḷ" && b === "ḻ") || (a === "ḻ" && b === "ḷ")) return [0.1, null];
  // Latin letters from Kanglish vs Kannada phonemes: compare loosely.
  if (a[0] === b[0]) return [0.4, "different"];
  return [1, "different"];
}

type Step = { op: "sub" | "del" | "ins"; i: number; j: number; kind: IssueKind | null; cost: number };

function align(T: Token[], H: Token[]) {
  const n = T.length;
  const m = H.length;
  const d: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const back: (Step | null)[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  for (let i = 1; i <= n; i++) {
    const gem = i > 1 && T[i - 1].p === T[i - 2].p && !VOWELS.has(T[i - 1].p);
    const c = gem ? 0.6 : 1;
    d[i][0] = d[i - 1][0] + c;
    back[i][0] = { op: "del", i: i - 1, j: -1, kind: gem ? "gemination" : "missing", cost: c };
  }
  // Semi-global: extra words the learner said before the phrase are free.
  for (let j = 1; j <= m; j++) {
    d[0][j] = 0;
    back[0][j] = { op: "ins", i: -1, j: j - 1, kind: null, cost: 0 };
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const [sc, sk] = subCost(T[i - 1].p, H[j - 1].p, !!(T[i - 1].latin || H[j - 1].latin));
      const delGem = i > 1 && T[i - 1].p === T[i - 2].p && !VOWELS.has(T[i - 1].p);
      const insGem = j > 1 && H[j - 1].p === H[j - 2].p && !VOWELS.has(H[j - 1].p);
      const del = d[i - 1][j] + (delGem ? 0.6 : 1);
      const ins = d[i][j - 1] + (insGem ? 0.6 : 1);
      const sub = d[i - 1][j - 1] + sc;
      if (sub <= del && sub <= ins) {
        d[i][j] = sub;
        back[i][j] = { op: "sub", i: i - 1, j: j - 1, kind: sk, cost: sc };
      } else if (del <= ins) {
        d[i][j] = del;
        back[i][j] = { op: "del", i: i - 1, j: j - 1, kind: delGem ? "gemination" : "missing", cost: delGem ? 0.6 : 1 };
      } else {
        d[i][j] = ins;
        back[i][j] = { op: "ins", i: i - 1, j: j - 1, kind: insGem ? "gemination" : "extra", cost: insGem ? 0.6 : 1 };
      }
    }
  }
  // ...and so are extra words after it.
  let endJ = m;
  for (let j = 0; j <= m; j++) if (d[n][j] < d[n][endJ]) endJ = j;
  const steps: Step[] = [];
  let i = n;
  let j = endJ;
  while (i > 0 || j > 0) {
    const s = back[i][j]!;
    steps.push(s);
    if (s.op === "sub") { i--; j--; } else if (s.op === "del") { i--; } else { j--; }
  }
  return { cost: d[n][endJ], steps: steps.reverse() };
}

function tipFor(kind: IssueKind, target?: string, heard?: string): string {
  const t = target ? `${target}` : "";
  const h = heard ? `${heard}` : "";
  switch (kind) {
    case "retroflex":
      return `You said ${h} where a local expects ${t}. For ಟ ಡ ಣ ಳ, curl your tongue tip back to the roof of your mouth; for ತ ದ ನ ಲ, touch your teeth.`;
    case "length":
      return `Vowel length changes meaning in Kannada. Target ${t}, heard ${h}: hold long vowels (ಆ ಈ ಊ ಏ ಓ) about twice as long.`;
    case "gemination":
      return `${t || h} has a double consonant. Pause on it briefly, like "ha-ttu" in ಹತ್ತು (ten).`;
    case "aspiration":
      return `Small one: ${t} has a puff of air (or doesn't). Locals usually understand either way.`;
    case "sibilant":
      return `${t} vs ${h}: the "s" and "sh" sounds are close; most listeners will still follow you.`;
    case "missing":
      return `A sound in ${t} didn't come through. Try saying it a little slower.`;
    case "extra":
      return `An extra sound was heard${h ? ` (${h})` : ""}. Keep the phrase short and steady.`;
    default:
      return `Target ${t}, heard ${h}. Listen to the slow version and copy the rhythm.`;
  }
}

/** Score heard speech against one target phrase. */
export function scorePhrase(target: string, heard: string): PhraseScore {
  const T = phonemes(target);
  const H = phonemes(heard);
  if (!T.tokens.length) return { score: 0, targetAks: T.aks, flagged: [], issues: [] };
  const { cost, steps } = align(T.tokens, H.tokens);
  const base = 100 * (1 - cost / T.tokens.length);

  const flagged = new Set<number>();
  const issues: Issue[] = [];
  const seen = new Set<string>();
  for (const s of steps) {
    if (!s.kind || s.cost === 0) continue;
    const tAk = s.i >= 0 && T.tokens[s.i] ? T.aks[T.tokens[s.i].aks] : undefined;
    const hAk = s.j >= 0 && H.tokens[s.j] ? H.aks[H.tokens[s.j].aks] : undefined;
    if (s.i >= 0 && T.tokens[s.i]) flagged.add(T.tokens[s.i].aks);
    const key = `${s.kind}:${tAk}:${hAk}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({ kind: s.kind, target: tAk, heard: s.op === "del" ? undefined : hAk, tip: tipFor(s.kind, tAk, s.op === "del" ? undefined : hAk) });
  }
  // Learner-specific errors first, generic ones after.
  const order: IssueKind[] = ["retroflex", "length", "gemination", "missing", "different", "extra", "sibilant", "aspiration"];
  issues.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  // In a long phrase one slip barely moves the average, so each learner-specific
  // error also costs a few points; locals notice these.
  const marked = issues.filter((x) => x.kind === "retroflex" || x.kind === "length" || x.kind === "gemination").length;
  const score = Math.max(0, Math.min(100, Math.round(base - 5 * marked)));
  return { score, targetAks: T.aks, flagged: [...flagged].sort((a, b) => a - b), issues: issues.slice(0, 3) };
}

/** Score against the best of a phrase and its accepted variants. */
export function scoreBest(targets: string[], heard: string): PhraseScore {
  let best: PhraseScore | null = null;
  for (const t of targets) {
    const s = scorePhrase(t, heard);
    if (!best || s.score > best.score) best = s;
  }
  return best!;
}

export function band(score: number): { label: string; tone: "good" | "ok" | "work" } {
  if (score >= 80) return { label: "A local would understand you", tone: "good" };
  if (score >= 55) return { label: "Understood with a little effort", tone: "ok" };
  return { label: "Worth another try", tone: "work" };
}
