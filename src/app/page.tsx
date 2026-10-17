"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon, CheckIcon, FlameIcon, GearIcon } from "@/components/icons";
import { HearButtons, InAppBrowserBanner, LineText, SettingsSheet, useLive } from "@/components/ui";
import { LIFESAVERS, phraseOfTheDay, SCENES } from "@/lib/scenes";
import { last7, settingsStore, streak, useProgress, useSettings } from "@/lib/store";

export default function Home() {
  const progress = useProgress();
  const settings = useSettings();
  const { live, serverLive } = useLive();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const days = mounted ? progress.days : [];
  const s = streak(days);
  const week = last7(days);
  const pod = phraseOfTheDay();
  const nextId = SCENES.find((sc) => !progress.scenes[sc.id]?.goalMet)?.id ?? SCENES[0].id;
  const practisedToday = week[6]?.done;

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-lg pb-10">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <div className="flex items-center gap-3">
          <div className="kn grid h-11 w-11 place-items-center rounded-2xl bg-brand text-lg font-bold text-on-brand shadow-card" aria-hidden>
            ಮಾ
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight tracking-tight">Maathaadi</h1>
            <p className="kn text-sm text-muted">ಮಾತಾಡಿ · just speak</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mounted && !live && <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-ink">Demo</span>}
          <span className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ${s ? "bg-accent-soft text-ink" : "bg-surface-2 text-muted"}`} aria-label={`${s} day streak`}>
            <FlameIcon size={16} className={s ? "text-accent" : ""} /> {s}
          </span>
          <button type="button" onClick={() => setSettingsOpen(true)} className="grid h-11 w-11 place-items-center rounded-full bg-surface-2" aria-label="Settings">
            <GearIcon size={20} />
          </button>
        </div>
      </header>

      <InAppBrowserBanner />

      {mounted && !settings.onboarded && (
        <section className="rise mx-4 mt-3 rounded-3xl bg-brand p-5 text-on-brand shadow-card">
          <p className="kn text-2xl font-bold">ನಮಸ್ಕಾರ!</p>
          <p className="mt-2 leading-relaxed opacity-95">
            Rehearse real Bengaluru moments out loud. Hold the mic, say it in Kannada, and see whether a local would understand you. Mistakes are welcome here.
          </p>
          <button type="button" onClick={() => settingsStore.set({ onboarded: true })} className="mt-4 rounded-full bg-on-brand px-5 py-2.5 font-semibold text-brand">
            Got it
          </button>
        </section>
      )}

      <section className="mx-4 mt-3 rounded-3xl border border-line bg-surface p-4 shadow-card" aria-label="This week">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            {s > 1 ? `${s}-day streak` : practisedToday ? "You practised today" : "A few minutes a day is plenty"}
          </p>
          <p className="text-xs text-muted">{practisedToday ? "See you tomorrow" : "Practise today to keep it going"}</p>
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-1.5">
          {week.map((d, i) => (
            <li key={i} className="flex flex-col items-center gap-1">
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs ${d.done ? "bg-brand text-on-brand" : d.isToday ? "border-2 border-dashed border-brand text-brand" : "bg-surface-2 text-muted"}`}>
                {d.done ? <CheckIcon size={15} /> : ""}
              </span>
              <span className={`text-[11px] ${d.isToday ? "font-bold" : "text-muted"}`}>{d.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-4 mt-3 rounded-3xl bg-accent-soft p-5" aria-label="Phrase of the day">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Phrase of the day</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <LineText kn={pod.phrase.kn} en={pod.phrase.en} size="lg" />
          <HearButtons text={pod.phrase.kn} scene={pod.sceneId} live={live} />
        </div>
        {pod.sceneId && (
          <Link href={`/scene/${pod.sceneId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
            Use it in a conversation <ArrowIcon size={16} />
          </Link>
        )}
      </section>

      <section className="mt-6 px-4" aria-labelledby="scenes">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 id="scenes" className="text-lg font-bold">First week in Bengaluru</h2>
          <span className="text-sm text-muted">{SCENES.filter((sc) => progress.scenes[sc.id]?.goalMet).length}/{SCENES.length} done</span>
        </div>
        <ul className="space-y-3">
          {SCENES.map((sc) => {
            const rec = mounted ? progress.scenes[sc.id] : undefined;
            const isNext = mounted && sc.id === nextId;
            return (
              <li key={sc.id}>
                <Link
                  href={`/scene/${sc.id}`}
                  className={`group flex items-center gap-4 rounded-3xl border bg-surface p-4 shadow-card transition active:scale-[0.99] ${isNext ? "border-brand" : "border-line"}`}
                >
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `var(--tint-${sc.tint})` }} aria-hidden>
                    {sc.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-bold">{sc.title}</span>
                      <span className="kn text-sm text-muted">{sc.titleKn}</span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{sc.goal}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      {rec?.goalMet ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-good-soft px-2 py-0.5 font-semibold text-good"><CheckIcon size={12} /> Done</span>
                      ) : isNext ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 font-semibold text-on-brand">Up next</span>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">New</span>
                      )}
                      {rec && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Best {rec.best}</span>}
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{sc.minutes} min</span>
                    </span>
                  </span>
                  <ArrowIcon size={20} className="shrink-0 text-muted transition group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-6 px-4" aria-labelledby="lifesavers">
        <h2 id="lifesavers" className="mb-1 px-1 text-lg font-bold">Lifesaver phrases</h2>
        <p className="mb-3 px-1 text-sm text-muted">For when you get stuck, anywhere in the city.</p>
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-4 shadow-card">
          {LIFESAVERS.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <LineText kn={p.kn} en={p.en} size="sm" />
              <HearButtons text={p.kn} live={live} compact />
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-8 px-6 text-center text-xs leading-relaxed text-muted">
        <p>Maathaadi scores whether a local would understand you, not your accent. Kanglish and regional Kannada count as correct.</p>
        <p className="mt-2">Your voice is transcribed by Sarvam AI and never stored by this app.</p>
      </footer>

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} serverLive={serverLive} />
    </main>
  );
}
