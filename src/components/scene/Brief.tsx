"use client";
import type { Scene } from "@/lib/types";
import { HearButtons, LineText } from "../ui";

export function Brief({ scene, live, onStart, starting }: { scene: Scene; live: boolean; onStart: () => void; starting: boolean }) {
  return (
    <div className="pb-32">
      <section className="rise mx-4 rounded-[28px] p-5" style={{ background: `var(--tint-${scene.tint})` }}>
        <div className="flex items-center gap-4">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-surface/70 text-5xl" aria-hidden>
            {scene.icon}
          </span>
          <div>
            <p className="text-sm text-muted">{scene.place}</p>
            <p className="mt-1 font-semibold">
              {scene.phone ? "📞 Phone call with" : "You'll talk to"} {scene.character.name}, the {scene.character.role}.
            </p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-surface/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Your goal</p>
          <p className="mt-1 text-lg font-bold">{scene.goal}</p>
          <ol className="mt-3 space-y-2">
            {scene.goalSteps.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-brand">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-6 px-4">
        <h2 className="px-1 text-lg font-bold">Phrases you&apos;ll need</h2>
        <p className="mb-3 px-1 text-sm text-muted">Listen to each one, then say it along with the voice. You can peek at these again during the chat.</p>
        <ul className="space-y-2">
          {scene.phrases.map((p, i) => (
            <li key={p.id} className="rise flex items-center justify-between gap-3 rounded-3xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: `${i * 50}ms` }}>
              <LineText kn={p.kn} en={p.en} />
              <HearButtons text={p.kn} scene={scene.id} live={live} />
            </li>
          ))}
        </ul>
        <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">🗣️ {scene.regionalNote}</p>
      </section>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg via-bg to-transparent px-4 pt-6">
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="mx-auto block w-full max-w-lg rounded-full bg-brand py-4 text-lg font-bold text-on-brand shadow-card transition active:scale-[0.98] disabled:opacity-70"
        >
          {starting ? "Getting ready…" : "Start talking"}
        </button>
      </div>
    </div>
  );
}
