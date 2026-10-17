"use client";
// One shared <audio> element, unlocked on the first tap so iOS lets later
// replies play automatically after each push-to-talk.

function silentWav() {
  // 0.05 s of 8 kHz mono silence, built in memory.
  const n = 400;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
}

let el: HTMLAudioElement | null = null;
let unlocked = false;
const listeners = new Set<(playing: boolean) => void>();
const blobCache = new Map<string, string>();
let current: { resolve: () => void } | null = null;

function audio() {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    el.addEventListener("ended", () => finish());
    el.addEventListener("error", () => finish());
  }
  return el;
}

function emit(p: boolean) {
  listeners.forEach((l) => l(p));
}

function finish() {
  emit(false);
  const c = current;
  current = null;
  c?.resolve();
}

export function onPlaying(l: (playing: boolean) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Call inside a tap handler. */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  const a = audio();
  a.src = silentWav();
  a.play().catch(() => {});
  try {
    window.speechSynthesis?.getVoices();
  } catch {}
}

export function stopAudio() {
  if (el && !el.paused) el.pause();
  try {
    window.speechSynthesis?.cancel();
  } catch {}
  if (current) finish();
}

function playSrc(src: string): Promise<void> {
  stopAudio();
  const a = audio();
  return new Promise((resolve) => {
    current = { resolve };
    a.src = src;
    emit(true);
    a.play().catch(() => finish());
  });
}

export function playBase64(b64: string, mime = "audio/mpeg") {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  return playSrc(url);
}

/** Browser voice fallback (demo mode). Only used if the device has a Kannada voice. */
export function hasKannadaVoice() {
  try {
    return !!window.speechSynthesis?.getVoices().some((v) => v.lang.toLowerCase().startsWith("kn"));
  } catch {
    return false;
  }
}

function speakBrowser(text: string, slow: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const synth = window.speechSynthesis;
      const voice = synth?.getVoices().find((v) => v.lang.toLowerCase().startsWith("kn"));
      if (!synth || !voice) return resolve(false);
      stopAudio();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice;
      u.lang = voice.lang;
      u.rate = slow ? 0.7 : 0.95;
      u.onend = () => {
        emit(false);
        resolve(true);
      };
      u.onerror = () => {
        emit(false);
        resolve(false);
      };
      emit(true);
      synth.speak(u);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Speak a fixed line (phrase, opening, scripted reply). Uses the cached
 * server voice when live, and the browser's Kannada voice otherwise.
 * Resolves to false if nothing could be played.
 */
export async function playLine(text: string, opts: { scene?: string; slow?: boolean; live: boolean }): Promise<boolean> {
  if (opts.live) {
    const key = `${opts.scene ?? ""}|${opts.slow ? 1 : 0}|${text}`;
    let url = blobCache.get(key);
    if (!url) {
      try {
        const q = new URLSearchParams({ text, scene: opts.scene ?? "", slow: opts.slow ? "1" : "0" });
        const res = await fetch(`/api/tts?${q}`);
        if (res.status === 200) {
          url = URL.createObjectURL(await res.blob());
          blobCache.set(key, url);
        }
      } catch {}
    }
    if (url) {
      await playSrc(url);
      return true;
    }
  }
  return speakBrowser(text, !!opts.slow);
}
