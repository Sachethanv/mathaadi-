"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowIcon, CheckIcon, FlameIcon, GearIcon } from "@/components/icons";
import { HearButtons, InAppBrowserBanner, LineText, SettingsSheet, useLive } from "@/components/ui";
import { CATEGORIES, LEVELS, LIFESAVERS, phraseOfTheDay, SCENES, scenesIn } from "@/lib/scenes";
import { last7, settingsStore, streak, useProgress, useSettings, type SceneRecord } from "@/lib/store";
import type { CategoryId, Scene } from "@/lib/types";

function LevelDots({ level }: { level: Scene["level"] }) {
  return (
    <span className="inline-flex items-center gap-1" title={LEVELS[level]} aria-label={`Level: ${LEVELS[level]}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= level ? "bg-brand" : "bg-line"}`} />
      ))}
    </span>
  );
}

function SceneTile({ sc, rec }: { sc: Scene; rec?: SceneRecord }) {
  return (
    <Link
      href={`/scene/${sc.id}`}
      className="flex h-full flex-col rounded-3xl border border-line bg-surface p-3.5 shadow-card transition active:scale-[0.98]"
    >
      <div className="flex items-start justify-between">
        <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: `var(--tint-${sc.tint})` }} aria-hidden>
          {sc.icon}
        </span>
        {rec?.goalMet ? (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-good-soft text-good" aria-label="Done">
            <CheckIcon size={15} />
          </span>
        ) : (
          <LevelDots level={sc.level} />
        )}
      </div>
      <p className="mt-3 font-bold leading-snug">{sc.title}</p>
      <p className="kn text-sm text-muted">{sc.titleKn}</p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">{sc.goal}</p>
      <div className="mt-auto flex flex-wrap gap-1 pt-2.5 text-[11px]">
        {sc.phone && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">📞 Call</span>}
        {rec ? <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">Best {rec.best}</span> : <span className="rounded-full bg-surface-2 px-2 py-0.5 text-muted">{LEVELS[sc.level]}</span>}
      </div>
    </Link>
  );
}

export default function Home() {
  const progress = useProgress();
  const settings = useSettings();
  const { live, serverLive } = useLive();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<CategoryId | "all">("all");
  useEffect(() => {
    setMounted(true);
    try {
      const f = localStorage.getItem("maathaadi:filter");
      if (f && (f === "all" || CATEGORIES.some((c) => c.id === f))) setFilter(f as CategoryId | "all");
    } catch {}
  }, []);
  const choose = (f: CategoryId | "all") => {
    setFilter(f);
    const top = document.getElementById("browse")?.getBoundingClientRect().top ?? 0;
    if (top > 120) document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      localStorage.setItem("maathaadi:filter", f);
    } catch {}
  };

  const scenes = mounted ? progress.scenes : {};
  const days = mounted ? progress.days : [];
  const s = streak(days);
  const week = last7(days);
  const pod = phraseOfTheDay();
  const practisedToday = week[6]?.done;
  const doneCount = SCENES.filter((sc) => scenes[sc.id]?.goalMet).length;

  // Today's pick: an unfinished scene at the easiest remaining level, rotating daily.
  const open = SCENES.filter((sc) => !scenes[sc.id]?.goalMet);
  const minLevel = Math.min(...open.map((sc) => sc.level));
  const pool = open.filter((sc) => sc.level === minLevel);
  const dayIndex = Math.floor(Date.now() / 86400000);
  const pick = pool.length ? pool[dayIndex % pool.length] : SCENES[dayIndex % SCENES.length];

  const shown = filter === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === filter);

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-lg pb-10">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="kn grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-lg font-bold text-on-brand shadow-card" aria-hidden>
            ಮಾ
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold leading-tight tracking-tight">Maathaadi</h1>
            <p className="kn truncate text-sm text-muted">ಮಾತಾಡಿ · just speak</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            Rehearse {SCENES.length} real Bengaluru moments out loud, from autos to Ugadi lunch. Hold the mic, say it in Kannada, and see whether a local would understand you. Mistakes are welcome here.
          </p>
          <button type="button" onClick={() => settingsStore.set({ onboarded: true })} className="mt-4 rounded-full bg-on-brand px-5 py-2.5 font-semibold text-brand">
            Got it
          </button>
        </section>
      )}

      {/* Today's pick */}
      <Link
        href={`/scene/${pick.id}`}
        className="rise mx-4 mt-3 block rounded-[28px] p-5 shadow-card transition active:scale-[0.99]"
        style={{ background: `var(--tint-${pick.tint})` }}
        aria-label={`Today's scene: ${pick.title}`}
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{practisedToday ? "One more for today?" : "Today's scene"}</p>
        <div className="mt-2 flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface/70 text-4xl" aria-hidden>
            {pick.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-tight">
              {pick.title} <span className="kn text-base font-semibold text-muted">{pick.titleKn}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">{pick.goal}</p>
          </div>
        </div>
        <span className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand py-3 font-bold text-on-brand">
          Start · {pick.minutes} min <ArrowIcon size={18} />
        </span>
      </Link>

      <section className="mx-4 mt-3 rounded-3xl border border-line bg-surface p-4 shadow-card" aria-label="Your progress">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{s > 1 ? `${s}-day streak` : practisedToday ? "You practised today" : "A few minutes a day is plenty"}</p>
          <p className="text-xs text-muted">
            {doneCount}/{SCENES.length} scenes done
          </p>
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
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(doneCount / SCENES.length) * 100}%` }} />
        </div>
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

      {/* Browse by life situation */}
      <section className="mt-6" aria-labelledby="browse">
        <h2 id="browse" className="px-5 text-lg font-bold">
          Everyday life in Bengaluru
        </h2>
        <div className="sticky top-0 z-20 mt-2 bg-bg/90 py-2 backdrop-blur">
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Filter scenes by situation">
            {[{ id: "all" as const, title: "All", icon: "✨" }, ...CATEGORIES].map((c) => {
              const on = filter === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => choose(c.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${on ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-ink"}`}
                >
                  <span aria-hidden>{c.icon}</span> {c.title}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 px-4 pt-2">
          {shown.map((cat) => {
            const list = scenesIn(cat.id);
            const done = list.filter((sc) => scenes[sc.id]?.goalMet).length;
            return (
              <div key={cat.id}>
                <div className="mb-2.5 flex items-end justify-between px-1">
                  <div>
                    <h3 className="font-bold">
                      {cat.title} <span className="kn text-sm font-medium text-muted">{cat.titleKn}</span>
                    </h3>
                    <p className="text-xs text-muted">{cat.blurb}</p>
                  </div>
                  <span className="text-xs text-muted">
                    {done}/{list.length}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-3">
                  {list.map((sc) => (
                    <li key={sc.id}>
                      <SceneTile sc={sc} rec={scenes[sc.id]} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 px-4" aria-labelledby="lifesavers">
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
