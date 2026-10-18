"use client";
import { useEffect, useState, type ReactNode } from "react";
import { onPlaying, playLine, stopAudio, unlockAudio } from "@/lib/audio";
import { transliterate } from "@/lib/kannada";
import { settingsStore, useSettings } from "@/lib/store";
import { CloseIcon, SlowIcon, SpeakerIcon } from "./icons";

/** Is the live Sarvam service on (key set on the server and demo mode off)? */
export function useLive() {
  const settings = useSettings();
  const [server, setServer] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => r.json())
      .then((j) => alive && setServer(!!j.live))
      .catch(() => alive && setServer(false));
    return () => {
      alive = false;
    };
  }, []);
  return { live: !!server && !settings.demo, serverLive: server, ready: server !== null };
}

/** A Kannada line shown in script, transliteration and English per the learner's settings. */
export function LineText({ kn, en, translit, size = "md", className = "" }: { kn: string; en?: string; translit?: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = useSettings();
  const t = translit ?? transliterate(kn);
  const knSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const showKn = s.showKn || (!s.showTranslit && !s.showEn);
  return (
    <div className={className}>
      {showKn && <p className={`kn font-semibold ${knSize}`} lang="kn">{kn}</p>}
      {s.showTranslit && <p className={`${showKn ? "text-[0.95em] text-muted" : `${knSize} font-semibold`} italic`}>{t}</p>}
      {s.showEn && en && <p className="text-sm text-muted">{en}</p>}
    </div>
  );
}

export function usePlaying() {
  const [playing, setPlaying] = useState(false);
  useEffect(() => onPlaying(setPlaying), []);
  return playing;
}

/** Tap-to-hear button, with an optional slow replay next to it. */
export function HearButtons({ text, scene, live, slowToo = true, compact = false }: { text: string; scene?: string; live: boolean; slowToo?: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState<"normal" | "slow" | null>(null);
  const [noVoice, setNoVoice] = useState(false);
  const settings = useSettings();
  const go = async (slow: boolean) => {
    unlockAudio();
    if (busy) {
      stopAudio();
      setBusy(null);
      return;
    }
    setBusy(slow ? "slow" : "normal");
    const ok = await playLine(text, { scene, slow: slow || settings.slowVoice, live });
    setBusy(null);
    if (!ok) {
      setNoVoice(true);
      setTimeout(() => setNoVoice(false), 2600);
    }
  };
  const btn = `inline-flex items-center justify-center rounded-full border border-line bg-surface text-ink transition active:scale-95 ${compact ? "h-9 w-9" : "h-11 w-11"}`;
  return (
    <div className="relative flex shrink-0 items-center gap-1.5">
      <button type="button" className={`${btn} ${busy === "normal" ? "border-brand text-brand" : ""}`} onClick={() => go(false)} aria-label="Hear it">
        <SpeakerIcon size={compact ? 17 : 19} />
      </button>
      {slowToo && (
        <button type="button" className={`${btn} ${busy === "slow" ? "border-brand text-brand" : ""}`} onClick={() => go(true)} aria-label="Hear it slowly">
          <SlowIcon size={compact ? 17 : 19} />
        </button>
      )}
      {noVoice && (
        <span role="status" className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl bg-ink px-3 py-2 text-xs text-bg shadow-card">
          Voice plays in live mode. This device has no Kannada voice.
        </span>
      )}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div className="sheet safe-bottom relative max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-3 shadow-card">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-surface-2" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-14 items-center justify-between gap-4 py-2">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? "bg-brand" : "bg-line"}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? "left-7" : "left-1"}`} />
      </button>
    </label>
  );
}

export function SettingsSheet({ open, onClose, serverLive }: { open: boolean; onClose: () => void; serverLive: boolean | null }) {
  const s = useSettings();
  const set = settingsStore.set;
  const onlyOne = [s.showKn, s.showTranslit, s.showEn].filter(Boolean).length === 1;
  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Show each line in</p>
      <div className="divide-y divide-line">
        <Toggle label="ಕನ್ನಡ script" checked={s.showKn} onChange={(v) => (v || !onlyOne) && set({ showKn: v })} />
        <Toggle label="English letters" hint="Transliteration, e.g. “Meeter haaki”" checked={s.showTranslit} onChange={(v) => (v || !onlyOne) && set({ showTranslit: v })} />
        <Toggle label="English meaning" checked={s.showEn} onChange={(v) => (v || !onlyOne) && set({ showEn: v })} />
      </div>
      <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">Practice</p>
      <div className="divide-y divide-line">
        <Toggle label="Slower voice" hint="Characters speak a little slower" checked={s.slowVoice} onChange={(v) => set({ slowVoice: v })} />
        <Toggle label="Hands-free" hint="Listens after each reply and sends when you pause" checked={s.handsFree} onChange={(v) => set({ handsFree: v })} />
        <Toggle
          label="Demo mode"
          hint={serverLive === false ? "On automatically: no live voice service is set up yet" : "Scripted characters, no internet voice service"}
          checked={s.demo || serverLive === false}
          onChange={(v) => serverLive !== false && set({ demo: v })}
        />
      </div>
      <p className="mt-5 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        Your voice is sent to Sarvam AI to be transcribed and is never saved by Maathaadi. Progress stays on this phone.
      </p>
      <button
        type="button"
        className="mb-4 mt-3 w-full rounded-2xl py-3 text-sm font-medium text-work"
        onClick={() => {
          try {
            localStorage.removeItem("maathaadi:progress");
          } catch {}
          location.reload();
        }}
      >
        Reset my progress
      </button>
    </Sheet>
  );
}

export function ScoreRing({ score, size = 88, label }: { score: number; size?: number; label?: string }) {
  const r = size / 2 - 7;
  const c = 2 * Math.PI * r;
  const tone = score >= 80 ? "var(--good)" : score >= 55 ? "var(--ok)" : "var(--work)";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${label ?? "Score"} ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth="7" fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset 700ms ease" }} />
      </svg>
      <span className={`absolute font-bold tabular-nums ${size < 70 ? "text-base" : "text-xl"}`}>{score}</span>
    </div>
  );
}

export function InAppBrowserBanner() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setShow(/Instagram|FBAN|FBAV|WhatsApp|Line\/|Snapchat|; wv\)/i.test(navigator.userAgent));
  }, []);
  if (!show) return null;
  return (
    <div className="mx-4 mt-3 rounded-2xl border border-accent bg-accent-soft p-4 text-sm">
      <p className="font-semibold">Open in Chrome or Safari for the mic</p>
      <p className="mt-1 text-muted">Apps like WhatsApp and Instagram often block the microphone in their built-in browser.</p>
      <button
        type="button"
        className="mt-3 rounded-full bg-ink px-4 py-2 font-medium text-bg"
        onClick={() => {
          navigator.clipboard?.writeText(location.href).then(() => setCopied(true));
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
