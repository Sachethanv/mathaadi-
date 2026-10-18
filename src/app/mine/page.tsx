"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackIcon, CloseIcon } from "@/components/icons";
import { LineText, useLive } from "@/components/ui";
import { cardHref, type CustomPlan, playHref } from "@/lib/custom";
import { removeMine, saveMine, useMine } from "@/lib/store";

const EXAMPLES = [
  "Buy tomatoes for ₹20 a kg",
  "Ask the auto driver to wait 10 minutes",
  "Tell my landlord the kitchen tap is leaking",
  "Ask the gym about monthly fees",
  "Order filter coffee with less sugar",
];

function PlanPreview({ plan, onRehearse }: { plan: CustomPlan; onRehearse: () => void }) {
  const s = plan.scene;
  return (
    <section className="rise mx-4 mt-4 overflow-hidden rounded-3xl border border-line bg-surface shadow-card" aria-label="Your scene">
      <div className="p-4" style={{ background: `var(--tint-${s.tint})` }}>
        <p className="text-3xl" aria-hidden>
          {s.icon}
        </p>
        <p className="mt-2 text-lg font-bold leading-snug">{s.title}</p>
        <p className="text-sm text-muted">
          With {s.character.name}, {s.character.role} · {s.place}
        </p>
      </div>
      <div className="p-4">
        {plan.demo && (
          <p className="mb-3 rounded-2xl bg-surface-2 p-3 text-sm text-muted">
            Demo mode: this uses the closest ready-made scene with your details added. With the live service, Maathaadi writes a scene just for your situation.
          </p>
        )}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">You&apos;ll practise saying</p>
        <ul className="mt-2 space-y-2">
          {s.phrases.slice(0, 4).map((p) => (
            <li key={p.id} className="rounded-2xl bg-surface-2 px-3 py-2">
              <LineText kn={p.kn} en={p.en} size="sm" />
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href={cardHref(s)} className="rounded-full border border-line py-3 text-center font-semibold">
            Pocket card
          </Link>
          <button type="button" onClick={onRehearse} className="rounded-full bg-brand py-3 font-semibold text-on-brand">
            Rehearse it
          </button>
        </div>
      </div>
    </section>
  );
}

export default function MinePage() {
  const router = useRouter();
  const { live, ready } = useLive();
  const plans = useMine();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<CustomPlan | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setMounted(true), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const situation = text.trim();
    if (situation.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    setFresh(null);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ situation, demo: !live }), signal: ctrl.signal });
      clearTimeout(t);
      const j = await res.json();
      if (!j.ok) setError(j.message ?? "Couldn't write that scene.");
      else {
        saveMine(j.plan);
        setFresh(j.plan);
        setText("");
      }
    } catch {
      setError("The connection dropped. Check your data and try again.");
    }
    setBusy(false);
  };

  const others = plans.filter((p) => p.scene.id !== fresh?.scene.id);

  return (
    <main className="mx-auto min-h-dvh max-w-lg pb-10">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2.5">
          <Link href="/" className="grid h-11 w-11 place-items-center rounded-full bg-surface-2" aria-label="Back to scenes">
            <BackIcon size={20} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">Plan a real conversation</p>
            <p className="text-xs text-muted">Rehearse it here, then do it for real{ready && !live ? " · Demo mode" : ""}</p>
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="mx-4 mt-4 rounded-3xl border border-line bg-surface p-4 shadow-card">
        <label htmlFor="situation" className="font-bold">
          What do you need to do?
        </label>
        <p className="mt-1 text-sm text-muted">Describe it in English, with any details: the item, the price, the place.</p>
        <textarea
          id="situation"
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={240}
          placeholder="e.g. Buy tomatoes for ₹20 a kg at the Jayanagar market"
          className="mt-3 w-full resize-none rounded-2xl border border-line bg-bg p-3 text-base outline-none focus:border-brand"
        />
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-full bg-surface-2 px-3 py-1.5 text-sm"
            >
              {ex}
            </button>
          ))}
        </div>
        <button type="submit" disabled={busy || text.trim().length < 8} className="mt-4 w-full rounded-full bg-brand py-3.5 font-semibold text-on-brand transition active:scale-[0.98] disabled:opacity-50">
          {busy ? "Writing your scene…" : "Write my scene"}
        </button>
        {error && (
          <p role="alert" className="mt-3 rounded-2xl bg-ok-soft p-3 text-sm">
            {error}
          </p>
        )}
      </form>

      {busy && (
        <div className="mx-4 mt-4 space-y-3 rounded-3xl border border-line bg-surface p-4" aria-hidden>
          <div className="h-5 w-2/5 animate-pulse rounded-full bg-surface-2" />
          <div className="h-10 animate-pulse rounded-2xl bg-surface-2" />
          <div className="h-10 animate-pulse rounded-2xl bg-surface-2" />
        </div>
      )}

      {fresh && <PlanPreview plan={fresh} onRehearse={() => router.push(playHref(fresh.scene))} />}

      {mounted && others.length > 0 && (
        <section className="mt-6 px-4" aria-labelledby="mine">
          <h2 id="mine" className="mb-3 px-1 text-lg font-bold">
            Your scenes
          </h2>
          <ul className="space-y-2">
            {others.map((p) => (
              <li key={p.scene.id} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3 shadow-card">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl" style={{ background: `var(--tint-${p.scene.tint})` }} aria-hidden>
                  {p.scene.icon}
                </span>
                <Link href={playHref(p.scene)} className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.scene.title}</p>
                  <p className="truncate text-sm text-muted">{p.situation}</p>
                </Link>
                <Link href={cardHref(p.scene)} className="rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold">
                  Card
                </Link>
                <button type="button" onClick={() => removeMine(p.scene.id)} className="grid h-9 w-9 place-items-center rounded-full text-muted" aria-label={`Delete ${p.scene.title}`}>
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
