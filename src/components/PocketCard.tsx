"use client";
// The lines for one real conversation on a single screen, to use at the
// actual stall or counter. "Say it for me" plays a line aloud when the
// learner freezes; "Show" turns the phone into a big-text card.
import Link from "next/link";
import { useEffect, useState } from "react";
import { type CustomPlan, playHref } from "@/lib/custom";
import { prefetchLine, playLine, stopAudio, unlockAudio } from "@/lib/audio";
import { transliterate } from "@/lib/kannada";
import { LIFESAVERS } from "@/lib/scenes";
import { useSettings } from "@/lib/store";
import type { Scene } from "@/lib/types";
import { BackIcon, CloseIcon, SpeakerIcon } from "./icons";
import { HearButtons, LineText, useLive } from "./ui";

function SayItButton({ text, scene, live }: { text: string; scene: string; live: boolean }) {
  const [busy, setBusy] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const go = async () => {
    unlockAudio();
    if (busy) {
      stopAudio();
      setBusy(false);
      return;
    }
    setBusy(true);
    const ok = await playLine(text, { scene, live });
    setBusy(false);
    if (!ok) {
      setNoVoice(true);
      setTimeout(() => setNoVoice(false), 2600);
    }
  };
  return (
    <div className="relative flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        onClick={go}
        aria-label="Say it for me"
        className={`grid h-14 w-14 place-items-center rounded-full shadow-card transition active:scale-95 ${busy ? "bg-work text-white" : "bg-brand text-on-brand"}`}
      >
        <SpeakerIcon size={24} />
      </button>
      <span className="text-[11px] font-semibold text-muted">Say it</span>
      {noVoice && (
        <span role="status" className="absolute right-0 top-full z-10 mt-1 w-48 rounded-xl bg-ink px-3 py-2 text-xs text-bg shadow-card">
          Voice plays in live mode. Use Show instead.
        </span>
      )}
    </div>
  );
}

export function PocketCard({ scene, plan }: { scene: Scene; plan?: CustomPlan }) {
  const settings = useSettings();
  const live = useLive().live && !plan?.demo;
  const situation = plan?.situation;
  const [shown, setShown] = useState<{ kn: string; en: string } | null>(null);
  const hear = [scene.opening, ...scene.demo.filter((d) => d.required).map((d) => d.reply)].slice(0, 4);

  // Load every line's audio now, so it plays instantly (and offline) at the stall.
  useEffect(() => {
    for (const p of scene.phrases) prefetchLine(p.kn, { scene: scene.id, live });
  }, [scene, live]);

  // Keep the screen on while the card is open.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-lg pb-28">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2.5">
          <Link href={playHref(scene)} className="grid h-11 w-11 place-items-center rounded-full bg-surface-2" aria-label="Back to the scene">
            <BackIcon size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold leading-tight">
              {scene.icon} {scene.title}
            </p>
            <p className="text-xs text-muted">Pocket card</p>
          </div>
        </div>
      </header>

      <section className="mx-4 mt-4 rounded-3xl p-4" style={{ background: `var(--tint-${scene.tint})` }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your goal</p>
        <p className="mt-1 text-lg font-bold leading-snug">{scene.goal}</p>
        {situation && situation !== scene.goal && <p className="mt-1 text-sm text-muted">“{situation}”</p>}
      </section>

      <section className="mt-5 px-4" aria-labelledby="lines">
        <h2 id="lines" className="mb-1 px-1 text-lg font-bold">
          Your lines
        </h2>
        <p className="mb-3 px-1 text-sm text-muted">In order. Say them yourself, or tap Say it and let the phone speak.</p>
        <ol className="space-y-3">
          {scene.phrases.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card">
              <span className="grid h-7 w-7 shrink-0 place-items-center self-start rounded-full bg-surface-2 text-sm font-bold text-muted">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <LineText kn={p.kn} en={p.en} translit={transliterate(p.kn)} size="lg" />
                <button type="button" onClick={() => setShown(p)} className="mt-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">
                  Show
                </button>
              </div>
              <SayItButton text={p.kn} scene={scene.id} live={live} />
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 px-4" aria-labelledby="hear">
        <h2 id="hear" className="mb-1 px-1 text-lg font-bold">
          You might hear
        </h2>
        <p className="mb-3 px-1 text-sm text-muted">What a {scene.character.role} may say back.</p>
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4 shadow-card">
          {hear.map((h) => (
            <li key={h.kn} className="flex items-center justify-between gap-3 py-3">
              <LineText kn={h.kn} en={h.en} size="sm" />
              <HearButtons text={h.kn} scene={scene.id} live={live} compact />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 px-4" aria-labelledby="stuck">
        <h2 id="stuck" className="mb-3 px-1 text-lg font-bold">
          If you get stuck
        </h2>
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4 shadow-card">
          {LIFESAVERS.slice(0, 4).map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <LineText kn={p.kn} en={p.en} size="sm" />
              <HearButtons text={p.kn} live={live} compact slowToo={false} />
            </li>
          ))}
        </ul>
      </section>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur">
        <Link href={playHref(scene)} className="mx-auto mb-1 block max-w-lg rounded-full bg-brand py-3.5 text-center font-semibold text-on-brand">
          Rehearse it once more
        </Link>
      </div>

      {shown && (
        <button
          type="button"
          onClick={() => setShown(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg px-6 text-center"
          aria-label="Close"
        >
          <span className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-surface-2" aria-hidden>
            <CloseIcon size={20} />
          </span>
          <span className="kn text-5xl font-bold leading-tight" lang="kn">
            {shown.kn}
          </span>
          {settings.showEn && <span className="text-lg text-muted">{shown.en}</span>}
          <span className="text-sm text-muted">Tap anywhere to close</span>
        </button>
      )}
    </main>
  );
}
