"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { isFail, type useRecorder } from "@/hooks/useRecorder";
import { band, scoreBest } from "@/lib/score";
import { cardHref } from "@/lib/custom";
import { nextScene as pickNext } from "@/lib/scenes";
import { saveSceneResult, setSceneConfidence, useProgress } from "@/lib/store";
import type { Scene } from "@/lib/types";
import { CheckIcon, RetryIcon } from "../icons";
import { MicButton } from "../MicButton";
import { HearButtons, ScoreRing } from "../ui";
import { Highlighted } from "./Bubbles";
import type { Msg, ScoredPhrase } from "./types";

type Recorder = ReturnType<typeof useRecorder>;

const CONFIDENCE = ["Not yet", "A little", "Okay", "Fairly", "Ready!"];

function Drill({ scene, item, recorder, live, onScore }: { scene: Scene; item: ScoredPhrase; recorder: Recorder; live: boolean; onScore: (s: ScoredPhrase) => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const phrase = scene.phrases.find((p) => p.id === item.phraseId);
  const targets = [item.kn, ...(phrase?.variants ?? [])];

  const stop = async () => {
    const r = await recorder.stop();
    if (isFail(r)) return setNote(r.message);
    setBusy(true);
    setNote(null);
    try {
      const fd = new FormData();
      fd.append("sceneId", scene.id);
      fd.append("target", item.kn);
      fd.append("durationMs", String(r.durationMs));
      fd.append("audio", r.blob, "drill");
      if (!live) fd.append("demo", "1");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = await res.json();
      if (!j.ok) {
        setNote(j.message ?? "Couldn't check that one. Try again.");
        return;
      }
      const s = scoreBest(targets, j.heard);
      onScore({ ...s, phraseId: item.phraseId, kn: item.kn, en: item.en });
      setNote(`${j.demo ? "Demo · " : ""}Heard: ${j.heard}`);
    } catch {
      setNote("No connection. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex items-center gap-4 rounded-2xl bg-surface-2 p-3">
      <MicButton size="md" recording={recorder.recording} level={recorder.level} elapsed={recorder.elapsed} maxMs={recorder.maxMs} busy={busy} onStart={() => recorder.start().then((f) => f && setNote(f.message))} onStop={stop} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">Say it again</p>
        <p className="text-muted">{note ?? "Listen first, then hold the mic and say it."}</p>
      </div>
    </div>
  );
}

export function Report({ scene, msgs, goalComplete, recorder, live, onRestart }: { scene: Scene; msgs: Msg[]; goalComplete: boolean; recorder: Recorder; live: boolean; onRestart: () => void }) {
  const progress = useProgress();
  // Best attempt per phrase, from spoken (not typed) clear turns.
  const initial = useMemo(() => {
    const best = new Map<string, ScoredPhrase>();
    for (const m of msgs) {
      if (m.who !== "learner" || m.typed || !m.match) continue;
      const prev = best.get(m.match.phraseId);
      if (!prev || m.match.score > prev.score) best.set(m.match.phraseId, m.match);
    }
    return [...best.values()];
  }, [msgs]);
  const [items, setItems] = useState(initial);
  const [improved, setImproved] = useState<Record<string, number>>({});
  const [drill, setDrill] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const saved = useRef(false);

  const spokenTurns = msgs.filter((m) => m.who === "learner" && !m.typed).length;
  const typedTurns = msgs.filter((m) => m.who === "learner" && m.typed).length;
  const overall = items.length ? Math.round(items.reduce((a, b) => a + b.score, 0) / items.length) : 0;
  const weakest = [...items].sort((a, b) => a.score - b.score)[0];
  const nextScene = pickNext(scene, (id) => !!progress.scenes[id]?.goalMet);
  const mission = weakest ?? { kn: scene.phrases[0].kn, en: scene.phrases[0].en };

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    saveSceneResult(scene.id, overall, goalComplete);
  }, [scene.id, overall, goalComplete]);

  return (
    <div className="space-y-4 px-4 pb-12">
      <section className="rise rounded-[28px] border border-line bg-surface p-5 text-center shadow-card">
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${goalComplete ? "bg-good-soft text-good" : "bg-surface-2 text-muted"}`}>
          {goalComplete ? <CheckIcon size={28} /> : <span className="text-2xl">{scene.icon}</span>}
        </div>
        <h2 className="mt-3 text-2xl font-extrabold">{goalComplete ? "Goal reached!" : "Nice practice"}</h2>
        <p className="mt-1 text-muted">{goalComplete ? scene.goal : `You worked on: ${scene.goal.toLowerCase()}.`}</p>
        {items.length > 0 ? (
          <div className="mt-5 flex items-center justify-center gap-4">
            <ScoreRing score={overall} size={96} label="Intelligibility" />
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Would a local understand?</p>
              <p className="mt-1 font-bold">{band(overall).label}</p>
              <p className="text-sm text-muted">Across {items.length} phrase{items.length > 1 ? "s" : ""} you said</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
            {typedTurns && !spokenTurns ? "You typed this time. Speak a line out loud next time to get a score." : "Say one of the scene's phrases out loud to get a score."}
          </p>
        )}
      </section>

      {items.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 font-bold">Your phrases</h3>
          <ul className="space-y-3">
            {items.map((it) => {
              const b = band(it.score);
              return (
                <li key={it.phraseId} className="rise rounded-3xl border border-line bg-surface p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Highlighted aks={it.targetAks} flagged={it.flagged} className="text-xl font-semibold" />
                      <p className="text-sm text-muted">{it.en}</p>
                    </div>
                    <ScoreRing score={it.score} size={56} />
                  </div>
                  <p className={`mt-2 text-sm font-semibold ${b.tone === "good" ? "text-good" : b.tone === "ok" ? "text-ok" : "text-work"}`}>
                    {b.label}
                    {improved[it.phraseId] !== undefined && <span className="ml-2 rounded-full bg-good-soft px-2 py-0.5 text-xs text-good">up from {improved[it.phraseId]}</span>}
                  </p>
                  {it.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1.5">
                      {it.issues.map((iss, i) => (
                        <li key={i} className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                          {iss.tip}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">Every sound came through. Lovely.</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <HearButtons text={it.kn} scene={scene.id} live={live} compact />
                    <button type="button" onClick={() => setDrill(drill === it.phraseId ? null : it.phraseId)} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-4 py-2 text-sm font-semibold text-brand">
                      <RetryIcon size={16} /> Say it again
                    </button>
                  </div>
                  {drill === it.phraseId && (
                    <Drill
                      scene={scene}
                      item={it}
                      recorder={recorder}
                      live={live}
                      onScore={(s) => {
                        setItems((cur) => cur.map((c) => (c.phraseId === s.phraseId ? (s.score >= c.score ? s : c) : c)));
                        if (s.score > it.score) setImproved((m) => ({ ...m, [s.phraseId]: m[s.phraseId] ?? it.score }));
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 px-1 text-xs text-muted">Scores show how clearly a Kannada speech system understood you, which is a good stand-in for a local. They don&apos;t judge your accent.</p>
        </section>
      )}

      <section className="rounded-3xl border border-line bg-surface p-4 shadow-card">
        <p className="font-bold">How ready do you feel to do this for real?</p>
        <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Confidence">
          {CONFIDENCE.map((c, i) => {
            const on = (confidence ?? progress.scenes[scene.id]?.confidence) === i + 1;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setConfidence(i + 1);
                  setSceneConfidence(scene.id, i + 1);
                }}
                className={`rounded-2xl px-1 py-3 text-xs font-semibold transition ${on ? "bg-brand text-on-brand" : "bg-surface-2 text-muted"}`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-accent-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Real-world mission</p>
        <p className="mt-1">
          Next time you {scene.mission}, say{" "}
          <span className="kn font-bold">{mission.kn}</span> <span className="text-muted">({mission.en})</span>.
        </p>
        <Link href={cardHref(scene)} className="mt-3 flex items-center justify-center gap-2 rounded-full bg-surface py-3 font-semibold shadow-card">
          🗒️ Open the pocket card
        </Link>
        <p className="mt-2 text-center text-xs text-muted">Your lines on one screen, with &ldquo;say it for me&rdquo; for when you freeze.</p>
      </section>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button type="button" onClick={onRestart} className="rounded-full border border-line bg-surface py-3.5 font-semibold">
          Practise again
        </button>
        <Link href={`/scene/${nextScene.id}`} className="rounded-full bg-brand py-3.5 text-center font-semibold text-on-brand">
          Next: {nextScene.title}
        </Link>
      </div>
      <Link href="/" className="block py-2 text-center text-sm font-medium text-muted">
        Back to all scenes
      </Link>
    </div>
  );
}
