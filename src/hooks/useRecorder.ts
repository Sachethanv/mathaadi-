"use client";
// Push-to-talk recorder with the browser-side clarity checks (Gate 1):
// too short, no speech above the noise floor, clipped, and a 15 s hard stop.
import { useCallback, useEffect, useRef, useState } from "react";

export type Recording = { blob: Blob; mime: string; durationMs: number };
export type RecordFail = { reason: "short" | "silent" | "loud" | "interrupted" | "denied" | "unsupported"; message: string };

const MAX_MS = 15000;
const MIN_MS = 600;
const TAIL_MS = 300; // keep recording briefly after release (Bluetooth delay)

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return "";
}

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0); // 0..1 for the live meter
  const [elapsed, setElapsed] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const rms = useRef<number[]>([]);
  const clipped = useRef({ clip: 0, total: 0 });
  const started = useRef(0);
  const raf = useRef(0);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = useRef<((r: Recording | RecordFail) => void) | null>(null);
  const aborted = useRef<RecordFail | null>(null);

  const cleanupLoop = () => {
    cancelAnimationFrame(raf.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    setLevel(0);
  };

  const ensureStream = useCallback(async (): Promise<MediaStream | RecordFail> => {
    if (stream.current && stream.current.getAudioTracks().some((t) => t.readyState === "live")) return stream.current;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return { reason: "unsupported", message: "This browser can't record audio. Open the link in Chrome or Safari, or type instead." };
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      return stream.current;
    } catch {
      return { reason: "denied", message: "Microphone access is off. Allow it from the mic icon in your browser's address bar, or type instead." };
    }
  }, []);

  /** Ask for the mic up front (e.g. on "Start talking"), so the first press records instantly. */
  const prepare = useCallback(async () => {
    const s = await ensureStream();
    return s instanceof MediaStream ? null : s;
  }, [ensureStream]);

  const start = useCallback(async (): Promise<RecordFail | null> => {
    if (rec.current) return null;
    const s = await ensureStream();
    if (!(s instanceof MediaStream)) return s;
    const mime = pickMime();
    const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
    rec.current = r;
    chunks.current = [];
    rms.current = [];
    clipped.current = { clip: 0, total: 0 };
    aborted.current = null;

    ctx.current ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.current.state === "suspended") await ctx.current.resume().catch(() => {});
    const src = ctx.current.createMediaStreamSource(s);
    const an = ctx.current.createAnalyser();
    an.fftSize = 1024;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const loop = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      let clip = 0;
      for (let i = 0; i < buf.length; i++) {
        sum += buf[i] * buf[i];
        if (Math.abs(buf[i]) > 0.99) clip++;
      }
      const v = Math.sqrt(sum / buf.length);
      rms.current.push(v);
      clipped.current.clip += clip;
      clipped.current.total += buf.length;
      setLevel(Math.min(1, v * 6));
      setElapsed(Date.now() - started.current);
      raf.current = requestAnimationFrame(loop);
    };

    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = () => {
      src.disconnect();
      cleanupLoop();
      setRecording(false);
      rec.current = null;
      const durationMs = Date.now() - started.current;
      const done = settle.current;
      settle.current = null;
      if (!done) return;
      if (aborted.current) return done(aborted.current);
      const type = r.mimeType || mime || "audio/webm";
      const blob = new Blob(chunks.current, { type });
      if (durationMs < MIN_MS || blob.size === 0) return done({ reason: "short", message: "Hold the button while you speak." });

      const sorted = [...rms.current].sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * 0.2)] ?? 0;
      const threshold = Math.max(floor * 2.5, 0.012);
      let run = 0;
      let speech = false;
      for (const v of rms.current) {
        run = v > threshold ? run + 1 : 0;
        if (run >= 5) {
          speech = true;
          break;
        }
      }
      if (!speech) return done({ reason: "silent", message: "I couldn't hear any speech. Try again a bit closer to the phone." });
      if (clipped.current.total && clipped.current.clip / clipped.current.total > 0.05) {
        return done({ reason: "loud", message: "Too loud. Hold the phone a little further away." });
      }
      done({ blob, mime: type, durationMs });
    };

    started.current = Date.now();
    setElapsed(0);
    r.start(250);
    setRecording(true);
    raf.current = requestAnimationFrame(loop);
    maxTimer.current = setTimeout(() => r.state === "recording" && r.stop(), MAX_MS);
    return null;
  }, [ensureStream]);

  /** Stop and get the checked recording (or the reason it was rejected). */
  const stop = useCallback((): Promise<Recording | RecordFail> => {
    return new Promise((resolve) => {
      const r = rec.current;
      if (!r) return resolve(aborted.current ?? { reason: "short", message: "Hold the button while you speak." });
      settle.current = resolve;
      setTimeout(() => r.state === "recording" && r.stop(), TAIL_MS);
    });
  }, []);

  const abort = useCallback((message = "Recording stopped.") => {
    const r = rec.current;
    if (!r) return;
    aborted.current = { reason: "interrupted", message };
    if (!settle.current) settle.current = () => {};
    if (r.state === "recording") r.stop();
  }, []);

  // Phone locked or tab switched mid-recording: discard it.
  useEffect(() => {
    const onVis = () => document.visibilityState === "hidden" && abort("Recording stopped because the app went to the background.");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [abort]);

  useEffect(
    () => () => {
      cleanupLoop();
      stream.current?.getTracks().forEach((t) => t.stop());
      ctx.current?.close().catch(() => {});
    },
    [],
  );

  return { recording, level, elapsed, maxMs: MAX_MS, start, stop, abort, prepare };
}

export function isFail(r: Recording | RecordFail): r is RecordFail {
  return "reason" in r;
}
