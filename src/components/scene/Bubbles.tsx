"use client";
import { band } from "@/lib/score";
import type { Scene } from "@/lib/types";
import { EarIcon, MicIcon, RetryIcon } from "../icons";
import { HearButtons, LineText } from "../ui";
import type { Msg, ScoredPhrase } from "./types";

export function Highlighted({ aks, flagged, className = "" }: { aks: string[]; flagged: number[]; className?: string }) {
  const f = new Set(flagged);
  return (
    <span className={`kn ${className}`} lang="kn">
      {aks.map((a, i) =>
        f.has(i) ? (
          <mark key={i} className="rounded-md bg-work-soft px-0.5 text-work underline decoration-2 underline-offset-4">
            {a}
          </mark>
        ) : (
          <span key={i}>{a}</span>
        ),
      )}
    </span>
  );
}

function ScorePill({ m }: { m: ScoredPhrase }) {
  const b = band(m.score);
  const cls = b.tone === "good" ? "bg-good-soft text-good" : b.tone === "ok" ? "bg-ok-soft text-ok" : "bg-work-soft text-work";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <span className="tabular-nums">{m.score}</span> · {b.label}
    </span>
  );
}

function MicHelp() {
  return (
    <div className="rise mx-auto max-w-[90%] rounded-3xl border border-line bg-surface p-4 text-sm shadow-card" role="status">
      <p className="font-semibold">Turn the microphone on</p>
      {/* A tiny address bar, so people know which icon to look for. */}
      <div className="mt-3 flex items-center gap-2 rounded-full bg-surface-2 px-3 py-2 text-xs text-muted" aria-hidden>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-on-brand">
          <MicIcon size={14} />
        </span>
        <span className="truncate">{location.host}</span>
      </div>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
        <li>Tap the icon at the left of the web address.</li>
        <li>Set Microphone to Allow.</li>
        <li>Reload this page.</li>
      </ol>
      <button type="button" onClick={() => location.reload()} className="mt-3 w-full rounded-full bg-brand py-2.5 font-semibold text-on-brand">
        Reload
      </button>
      <p className="mt-2 text-center text-xs text-muted">Or keep going by typing below.</p>
    </div>
  );
}

export function Bubble({ msg, scene, live, avatar, streaming = false, onRetry }: { msg: Msg; scene: Scene; live: boolean; avatar: string; streaming?: boolean; onRetry?: () => void }) {
  if (msg.who === "notice") {
    if (msg.help === "mic") return <MicHelp />;
    const cls = msg.tone === "good" ? "bg-good-soft text-good" : msg.tone === "warn" ? "bg-ok-soft text-ink" : "bg-surface-2 text-muted";
    return (
      <div className="rise flex justify-center" role="status">
        <div className={`max-w-[90%] rounded-2xl px-4 py-2 text-center text-sm ${cls}`}>
          <p>{msg.text}</p>
          {msg.help === "retry" && onRetry && (
            <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-4 py-1.5 text-sm font-semibold text-brand shadow-card">
              <RetryIcon size={14} /> Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (msg.who === "character") {
    return (
      <div className="rise flex items-end gap-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg" style={{ background: `var(--tint-${scene.tint})` }} aria-hidden>
          {avatar}
        </span>
        <div className="max-w-[85%] rounded-3xl rounded-bl-md border border-line bg-surface p-4 shadow-card">
          <p className="mb-1 text-xs font-semibold text-muted">{scene.character.name}</p>
          <div className="flex items-start gap-3">
            <LineText kn={msg.line.kn} en={msg.line.en} translit={msg.line.translit} className="min-w-0 flex-1" />
          </div>
          {streaming ? (
            <span className="caret mt-1 inline-block h-4 w-1.5 rounded-full bg-brand" aria-hidden />
          ) : (
            <div className="mt-3 flex justify-end">
              <HearButtons text={msg.line.kn} scene={scene.id} live={live} compact />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Learner turn: always show exactly what was heard.
  const notScored = msg.kind === "unclear" || msg.kind === "not_kannada";
  return (
    <div className="rise flex flex-col items-end gap-1.5">
      <div className="max-w-[85%] rounded-3xl rounded-br-md bg-brand p-4 text-on-brand">
        <p className="mb-1 flex items-center gap-1 text-xs font-semibold opacity-85">
          <EarIcon size={14} /> {msg.typed ? "You typed" : msg.demo ? "Demo: sample learner speech" : "I heard"}
        </p>
        <p className="kn text-lg font-medium" lang="kn">
          {msg.heard || "…"}
        </p>
        {msg.meaningEn && <p className="mt-1 text-sm opacity-85">“{msg.meaningEn}”</p>}
      </div>
      <div className="flex max-w-[85%] flex-col items-end gap-1.5">
        {notScored && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted">Not scored · {msg.kind === "not_kannada" ? "not Kannada" : "unclear"}</span>}
        {msg.match && !msg.typed && <ScorePill m={msg.match} />}
        {msg.match && !msg.typed && msg.match.flagged.length > 0 && (
          <p className="rounded-2xl bg-surface px-3 py-2 text-right text-sm shadow-card">
            <span className="text-muted">Target: </span>
            <Highlighted aks={msg.match.targetAks} flagged={msg.match.flagged} className="text-base" />
          </p>
        )}
        {msg.match && !msg.typed && msg.match.issues[0] && <p className="rounded-2xl bg-surface px-3 py-2 text-sm text-muted shadow-card">{msg.match.issues[0].tip}</p>}
        {msg.tip && <p className="rounded-2xl bg-accent-soft px-3 py-2 text-sm">💡 {msg.tip}</p>}
        {msg.better && (
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2 shadow-card">
            <div>
              <p className="text-xs font-semibold text-muted">In Kannada you could say</p>
              <LineText kn={msg.better.kn} en={msg.better.en} translit={msg.better.translit} size="sm" />
            </div>
            <HearButtons text={msg.better.kn} scene={scene.id} live={live} compact slowToo={false} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Typing({ scene }: { scene: Scene }) {
  return (
    <div className="flex items-end gap-2" aria-label={`${scene.character.name} is replying`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg" style={{ background: `var(--tint-${scene.tint})` }} aria-hidden>
        {scene.icon}
      </span>
      <div className="flex gap-1 rounded-3xl rounded-bl-md border border-line bg-surface px-4 py-4 text-muted">
        <span className="dot h-2 w-2 rounded-full bg-current" />
        <span className="dot h-2 w-2 rounded-full bg-current" />
        <span className="dot h-2 w-2 rounded-full bg-current" />
      </div>
    </div>
  );
}
