import "server-only";

const BASE = process.env.SARVAM_BASE_URL || "https://api.sarvam.ai";
const KEY = process.env.SARVAM_API_KEY || "";

export const STT_MODEL = process.env.SARVAM_STT_MODEL || "saaras:v3";
export const STT_MODE = process.env.SARVAM_STT_MODE || "verbatim";
export const LLM_MODEL = process.env.SARVAM_LLM_MODEL || "sarvam-105b";
export const TTS_MODEL = process.env.SARVAM_TTS_MODEL || "bulbul:v3";

export function sarvamConfigured() {
  return KEY.length > 0 && process.env.DEMO_MODE !== "1";
}

export class SarvamError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call(path: string, init: RequestInit, timeoutMs = 20000, retry = true): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "api-subscription-key": KEY, ...(init.headers || {}) },
      signal: ctrl.signal,
    });
    if ((res.status === 429 || res.status === 502 || res.status === 503) && retry) {
      await new Promise((r) => setTimeout(r, 1000));
      return call(path, init, timeoutMs, false);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const code = /insufficient_quota|quota/i.test(body) ? "quota" : res.status === 429 ? "busy" : "upstream";
      throw new SarvamError(res.status, code, `Sarvam ${path} ${res.status}: ${body.slice(0, 300)}`);
    }
    return res;
  } catch (e) {
    if (e instanceof SarvamError) throw e;
    if ((e as Error).name === "AbortError") throw new SarvamError(504, "timeout", `Sarvam ${path} timed out`);
    throw new SarvamError(502, "network", `Sarvam ${path} failed: ${(e as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
}

export type SttResult = { transcript: string; language_code: string | null; language_probability: number | null };

export async function transcribe(audio: Blob, filename: string, keyterms: string[]): Promise<SttResult> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", STT_MODEL);
  form.append("mode", STT_MODE);
  // "unknown" makes Sarvam report the language it heard and how sure it is.
  form.append("language_code", "unknown");
  // keyterms is only supported on saaras:v4. Never pass target phrases here,
  // or the recogniser would "hear" the right answer and hide real mistakes.
  if (STT_MODEL.startsWith("saaras:v4") && keyterms.length) form.append("keyterms", JSON.stringify(keyterms.slice(0, 50)));
  const res = await call("/speech-to-text", { method: "POST", body: form });
  const json = await res.json();
  return {
    transcript: String(json.transcript ?? ""),
    language_code: json.language_code ?? null,
    language_probability: typeof json.language_probability === "number" ? json.language_probability : null,
  };
}

export async function chatJson(system: string, user: string, schema: object) {
  const res = await call(
    "/v1/chat/completions",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: 1500,
        reasoning_effort: "low",
        response_format: { type: "json_schema", json_schema: { name: "turn", schema, strict: true } },
      }),
    },
    25000,
  );
  const json = await res.json();
  const choice = json.choices?.[0];
  return { content: String(choice?.message?.content ?? ""), finish: String(choice?.finish_reason ?? "") };
}

export async function speak(text: string, speaker: string, pace = 1): Promise<Buffer> {
  const body = (langField: string) =>
    JSON.stringify({
      text,
      [langField]: "kn-IN",
      model: TTS_MODEL,
      speaker,
      pace,
      output_audio_codec: "mp3",
      speech_sample_rate: 22050,
    });
  let res: Response;
  try {
    res = await call("/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: body("target_language_code") });
  } catch (e) {
    // The docs name the field both ways; try the other spelling on a validation error.
    if (e instanceof SarvamError && (e.status === 400 || e.status === 422)) {
      res = await call("/text-to-speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: body("language_code") });
    } else throw e;
  }
  const json = await res.json();
  const b64 = json.audios?.[0];
  if (!b64) throw new SarvamError(502, "upstream", "Sarvam TTS returned no audio");
  return Buffer.from(b64, "base64");
}

/**
 * Same request as chatJson, streamed (SSE). onText gets the whole answer so
 * far after every chunk, plus a stop() that ends the stream early (used when
 * the reply already failed a gate, so no more tokens are paid for).
 */
export async function chatStream(
  system: string,
  user: string,
  schema: object,
  onText: (soFar: string, stop: () => void) => void,
): Promise<{ content: string; finish: string; stopped: boolean }> {
  const ctrl = new AbortController();
  let stopped = false;
  const stop = () => {
    stopped = true;
    ctrl.abort();
  };
  // 25 s to the first token, 40 s overall.
  let timedOut = false;
  const firstByte = setTimeout(() => ((timedOut = true), ctrl.abort()), 25000);
  const overall = setTimeout(() => ((timedOut = true), ctrl.abort()), 40000);
  let content = "";
  let finish = "";
  try {
    const res = await fetch(`${BASE}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-subscription-key": KEY, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: 1500,
        reasoning_effort: "low",
        stream: true,
        response_format: { type: "json_schema", json_schema: { name: "turn", schema, strict: true } },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      const code = /insufficient_quota|quota/i.test(body) ? "quota" : res.status === 429 ? "busy" : "upstream";
      throw new SarvamError(res.status, code, `Sarvam chat stream ${res.status}: ${body.slice(0, 300)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(firstByte);
      buf += dec.decode(value, { stream: true });
      let nl: number;
      let changed = false;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          const choice = j.choices?.[0];
          // Reasoning tokens (if the model sends them separately) are ignored.
          const piece = choice?.delta?.content;
          if (typeof piece === "string" && piece) {
            content += piece;
            changed = true;
          }
          if (choice?.finish_reason) finish = String(choice.finish_reason);
        } catch {}
      }
      if (changed) onText(content, stop);
      if (stopped) break;
    }
    return { content, finish, stopped };
  } catch (e) {
    if (stopped) return { content, finish, stopped };
    if (e instanceof SarvamError) throw e;
    if (timedOut) throw new SarvamError(504, "timeout", "Sarvam chat stream timed out");
    throw new SarvamError(502, "network", `Sarvam chat stream failed: ${(e as Error).message}`);
  } finally {
    clearTimeout(firstByte);
    clearTimeout(overall);
  }
}
