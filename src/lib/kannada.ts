// Kannada text utilities: script checks, deterministic transliteration and
// phoneme tokens for the intelligibility scorer. Kannada spelling is close to
// phonemic, so a small lookup table is enough.

const CONSONANTS: Record<string, string> = {
  "ಕ": "k", "ಖ": "kh", "ಗ": "g", "ಘ": "gh", "ಙ": "ṅ",
  "ಚ": "c", "ಛ": "ch", "ಜ": "j", "ಝ": "jh", "ಞ": "ñ",
  "ಟ": "ṭ", "ಠ": "ṭh", "ಡ": "ḍ", "ಢ": "ḍh", "ಣ": "ṇ",
  "ತ": "t", "ಥ": "th", "ದ": "d", "ಧ": "dh", "ನ": "n",
  "ಪ": "p", "ಫ": "ph", "ಬ": "b", "ಭ": "bh", "ಮ": "m",
  "ಯ": "y", "ರ": "r", "ಱ": "ṟ", "ಲ": "l", "ವ": "v",
  "ಶ": "ś", "ಷ": "ṣ", "ಸ": "s", "ಹ": "h", "ಳ": "ḷ", "ೞ": "ḻ",
};

const VOWELS: Record<string, string> = {
  "ಅ": "a", "ಆ": "ā", "ಇ": "i", "ಈ": "ī", "ಉ": "u", "ಊ": "ū",
  "ಋ": "ṛ", "ಎ": "e", "ಏ": "ē", "ಐ": "ai", "ಒ": "o", "ಓ": "ō", "ಔ": "au",
};

const VOWEL_SIGNS: Record<string, string> = {
  "ಾ": "ā", "ಿ": "i", "ೀ": "ī", "ು": "u", "ೂ": "ū", "ೃ": "ṛ",
  "ೆ": "e", "ೇ": "ē", "ೈ": "ai", "ೊ": "o", "ೋ": "ō", "ೌ": "au",
};

const VIRAMA = "್";
const ANUSVARA = "ಂ";
const VISARGA = "ಃ";
const NUKTA = "಼";
const ZW = /[‌‍]/g;

const DIGITS: Record<string, string> = {
  "೦": "0", "೧": "1", "೨": "2", "೩": "3", "೪": "4",
  "೫": "5", "೬": "6", "೭": "7", "೮": "8", "೯": "9",
};

export function isKannadaChar(ch: string) {
  const c = ch.codePointAt(0) ?? 0;
  return c >= 0x0c80 && c <= 0x0cff;
}

/** Share of letters that are Kannada script, ignoring spaces, digits, punctuation. */
export function scriptStats(text: string) {
  let kannada = 0;
  let latin = 0;
  let other = 0;
  for (const ch of text) {
    if (isKannadaChar(ch)) kannada++;
    else if (/[a-zA-Z]/.test(ch)) latin++;
    else if (/\p{L}/u.test(ch)) other++;
  }
  const total = kannada + latin + other;
  return { kannada, latin, other, total, kannadaShare: total ? kannada / total : 0 };
}

export function normalize(text: string) {
  return text
    .normalize("NFC")
    .replace(ZW, "")
    .replace(/[.,!?;:"'“”‘’()[\]{}…\-–—।॥]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Phoneme tokens -------------------------------------------------------------

export type Token = { p: string; aks: number; latin?: boolean };

/** Split into aksharas (grapheme clusters) for display and highlighting. */
export function aksharas(text: string): string[] {
  const clean = text.normalize("NFC").replace(ZW, "");
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("kn", { granularity: "grapheme" });
    const out: string[] = [];
    for (const s of seg.segment(clean)) out.push(s.segment);
    return mergeConjuncts(out);
  }
  return mergeConjuncts(Array.from(clean));
}

// Grapheme segmentation splits a conjunct like ತ್ತ into ತ್ + ತ; readers treat
// the whole cluster as one akshara, so glue anything ending in a virama to the next.
function mergeConjuncts(parts: string[]) {
  const out: string[] = [];
  for (const p of parts) {
    const prev = out[out.length - 1];
    if (prev && prev.endsWith(VIRAMA) && isKannadaChar(p[0])) out[out.length - 1] = prev + p;
    else out.push(p);
  }
  return out;
}

/**
 * Phoneme tokens with the index of the akshara they came from.
 * Spaces and punctuation are dropped, Latin letters (Kanglish) pass through.
 */
export function phonemes(text: string): { tokens: Token[]; aks: string[] } {
  // Keep spaces and punctuation in `aks` so the phrase displays as written;
  // they simply produce no tokens.
  const aks = aksharas(text.trim());
  const tokens: Token[] = [];
  aks.forEach((a, i) => {
    const chars = Array.from(a.toLowerCase()).filter((c) => c !== NUKTA);
    for (let j = 0; j < chars.length; j++) {
      const ch = chars[j];
      if (CONSONANTS[ch]) {
        tokens.push({ p: CONSONANTS[ch], aks: i });
        const next = chars[j + 1];
        if (next === VIRAMA) {
          j++;
        } else if (next && VOWEL_SIGNS[next]) {
          tokens.push({ p: VOWEL_SIGNS[next], aks: i });
          j++;
        } else {
          tokens.push({ p: "a", aks: i });
        }
      } else if (VOWELS[ch]) {
        tokens.push({ p: VOWELS[ch], aks: i });
      } else if (ch === ANUSVARA) {
        tokens.push({ p: "ṁ", aks: i });
      } else if (ch === VISARGA) {
        tokens.push({ p: "ḥ", aks: i });
      } else if (/[a-z]/.test(ch)) {
        // Romanised Kannada or English (Kanglish): fold common digraphs.
        const pair = ch + (chars[j + 1] ?? "");
        const dig = LATIN_DIGRAPHS[pair];
        if (dig && /[a-z]/.test(chars[j + 1] ?? "")) {
          tokens.push({ p: dig, aks: i, latin: true });
          j++;
        } else tokens.push({ p: ch === "w" ? "v" : ch, aks: i, latin: true });
      } else if (DIGITS[ch] || /[0-9]/.test(ch)) {
        tokens.push({ p: DIGITS[ch] ?? ch, aks: i });
      }
    }
  });
  return { tokens, aks };
}

const LATIN_DIGRAPHS: Record<string, string> = {
  aa: "ā", ee: "ī", ii: "ī", oo: "ū", uu: "ū", sh: "ś", ch: "c", th: "t", dh: "d", ph: "p", bh: "b", kh: "k", gh: "g",
};

// Transliteration --------------------------------------------------------------

// Friendly romanisation for learners ("Ellige hogbeku"), not ISO-15919.
const FRIENDLY: Record<string, string> = {
  ā: "aa", ī: "ee", ū: "oo", ē: "e", ō: "o", ṛ: "ru",
  ṭ: "t", ṭh: "th", ḍ: "d", ḍh: "dh", ṇ: "n", ṅ: "n", ñ: "n",
  c: "ch", ch: "chh", ś: "sh", ṣ: "sh", ḷ: "l", ḻ: "l", ṟ: "r", ḥ: "h",
};

const LABIALS = new Set(["p", "ph", "b", "bh", "m", "v"]);

function friendlyWord(word: string): string {
  // Keep Latin (English) words exactly as written.
  if (!Array.from(word).some(isKannadaChar)) return word;
  const { tokens } = phonemes(word);
  let out = "";
  tokens.forEach((t, i) => {
    if (t.p === "ṁ") {
      const next = tokens[i + 1]?.p;
      out += !next || LABIALS.has(next) ? "m" : "n";
      return;
    }
    out += FRIENDLY[t.p] ?? t.p;
  });
  return out;
}

export function transliterate(text: string): string {
  const s = text
    .normalize("NFC")
    .replace(ZW, "")
    .split(/(\s+|[.,!?;:"“”()…\-–—₹]+)/)
    .map((part) => (/\S/.test(part) ? friendlyWord(part) : part))
    .join("");
  // Capitalise the start of each sentence.
  return s.replace(/(^|[.!?]\s+)([a-z])/g, (_, a: string, b: string) => a + b.toUpperCase());
}

/** ISO-style label for a single akshara, used in tips ("ಳ (ḷ)"). */
export function iso(text: string) {
  return phonemes(text).tokens.map((t) => t.p).join("");
}
