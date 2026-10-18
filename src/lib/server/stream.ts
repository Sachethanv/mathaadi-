import "server-only";
// Helpers for reading the character's reply while the model is still writing
// its JSON answer, so the first sentence can be shown and spoken early.

/** The answer without any <think> block. null while still inside one. */
export function visibleJson(soFar: string): string | null {
  const open = soFar.indexOf("<think>");
  if (open < 0) return soFar;
  const close = soFar.indexOf("</think>", open);
  if (close < 0) return null;
  return soFar.slice(0, open) + soFar.slice(close + 8);
}

/** A string field of a JSON object that may be cut off part-way. */
export function partialString(json: string, field: string): { value: string; closed: boolean } | null {
  const m = new RegExp(`"${field}"\\s*:\\s*"`).exec(json);
  if (!m) return null;
  let out = "";
  for (let i = m.index + m[0].length; i < json.length; i++) {
    const c = json[i];
    if (c === '"') return { value: out, closed: true };
    if (c !== "\\") {
      out += c;
      continue;
    }
    const n = json[i + 1];
    if (n === undefined) break; // escape cut off mid-way: wait for more
    if (n === "u") {
      const hex = json.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
    } else {
      out += n === "n" ? "\n" : n === "t" ? "\t" : n === "r" ? "" : n;
      i += 1;
    }
  }
  return { value: out, closed: false };
}

export function enumField(json: string, field: string): string | null {
  return new RegExp(`"${field}"\\s*:\\s*"([a-z_]+)"`).exec(json)?.[1] ?? null;
}

/**
 * Full sentences in text[from..]. A sentence ends at . ? ! । or a newline that
 * is followed by more text; once the field is closed the rest counts too.
 */
export function takeSentences(text: string, from: number, closed: boolean): { sentences: string[]; next: number } {
  const sentences: string[] = [];
  const re = /[.?!।\n]+(?=\s)/g;
  re.lastIndex = from;
  let next = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    const s = text.slice(next, end).trim();
    if (s) sentences.push(s);
    next = end;
  }
  if (closed) {
    const rest = text.slice(next).trim();
    if (rest) sentences.push(rest);
    next = text.length;
  }
  return { sentences, next };
}
