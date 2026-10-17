"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { isFail, useRecorder } from "@/hooks/useRecorder";
import { playBase64, playLine, stopAudio, unlockAudio } from "@/lib/audio";
import { transliterate } from "@/lib/kannada";
import { getScene, LIFESAVERS } from "@/lib/scenes";
import { scoreBest } from "@/lib/score";
import { clearConversation, loadConversation, markPracticed, saveConversation, useSettings } from "@/lib/store";
import type { HistoryItem, TurnResult } from "@/lib/types";
import { BackIcon, BulbIcon, KeyboardIcon, MicIcon, RetryIcon, SendIcon } from "../icons";
import { MicButton } from "../MicButton";
import { HearButtons, InAppBrowserBanner, LineText, Sheet, useLive, usePlaying } from "../ui";
import { Brief } from "./Brief";
import { Bubble, Typing } from "./Bubbles";
import { Report } from "./Report";
import { type Convo, type Msg, type ScoredPhrase, uid } from "./types";

const fresh = (): Convo => ({ stage: "brief", msgs: [], doneSteps: [], stepsDone: 0, goalComplete: false });

export function SceneFlow({ sceneId }: { sceneId: string }) {
  const scene = getScene(sceneId)!;
  const settings = useSettings();
  const { live, ready } = useLive();
  const recorder = useRecorder();
  const playing = usePlaying();

  const [convo, setConvo] = useState<Convo>(fresh);
  const [thinking, setThinking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [stuck, setStuck] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const startingRec = useRef(false);
  const stopWanted = useRef(false);
  const convoRef = useRef(convo);
  convoRef.current = convo;

  // Restore a conversation after a reload.
  useEffect(() => {
    const saved = loadConversation<Convo>(sceneId);
    if (saved && saved.stage !== "brief") setConvo(saved);
  }, [sceneId]);
  useEffect(() => {
    if (convo.stage !== "brief") saveConversation(sceneId, convo);
  }, [convo, sceneId]);

  useEffect(() => {
    listRef.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [convo.msgs.length, thinking]);

  const push = (...msgs: Msg[]) => setConvo((c) => ({ ...c, msgs: [...c.msgs, ...msgs] }));
  const notice = (t: string, tone: "info" | "warn" | "good" = "info") => push({ id: uid(), who: "notice", text: t, tone });

  const slow = settings.slowVoice;

  const start = async () => {
    unlockAudio();
    setStarting(true);
    const fail = await recorder.prepare();
    setStarting(false);
    const opening: Msg = { id: uid(), who: "character", line: { ...scene.opening, translit: transliterate(scene.opening.kn) } };
    setConvo({ ...fresh(), stage: "talk", msgs: [opening] });
    if (fail) {
      setTyping(true);
      setTimeout(() => notice(fail.message, "warn"), 50);
    }
    playLine(scene.opening.kn, { scene: scene.id, slow, live });
  };

  const restart = () => {
    stopAudio();
    clearConversation(sceneId);
    setStuck(0);
    setConvo(fresh());
    window.scrollTo({ top: 0 });
  };

  const bestMatch = (heard: string): ScoredPhrase | null => {
    let best: ScoredPhrase | null = null;
    for (const p of [...scene.phrases, ...LIFESAVERS]) {
      const s = scoreBest([p.kn, ...(p.variants ?? [])], heard);
      if (!best || s.score > best.score) best = { ...s, phraseId: p.id, kn: p.kn, en: p.en };
    }
    return best && best.score >= 60 ? best : null;
  };

  const handleResult = async (r: TurnResult) => {
    const c = convoRef.current;
    if (r.kind === "no_speech" || (r.kind === "error" && !r.heard)) {
      notice(r.message ?? "Try again.", r.kind === "error" ? "warn" : "info");
      bumpStuck();
      if (r.reply) push({ id: uid(), who: "character", line: r.reply, scripted: true });
      return;
    }

    const match = r.scored && r.heard ? bestMatch(r.heard) : null;
    const learner: Msg = {
      id: uid(),
      who: "learner",
      heard: r.heard ?? "",
      kind: r.kind,
      typed: r.typed,
      demo: r.demo,
      meaningEn: r.meaningEn,
      tip: r.tip,
      better: r.better,
      match,
    };
    const replyMsg: Msg | null = r.reply ? { id: uid(), who: "character", line: r.reply, scripted: r.reply.scripted } : null;
    const demoStep = (r as TurnResult & { stepIndex?: number }).stepIndex;

    setConvo({
      ...c,
      msgs: [...c.msgs, learner, ...(replyMsg ? [replyMsg] : [])],
      doneSteps: demoStep !== undefined && !c.doneSteps.includes(demoStep) ? [...c.doneSteps, demoStep] : c.doneSteps,
      stepsDone: r.stepDone ? Math.min(scene.goalSteps.length, c.stepsDone + 1) : c.stepsDone,
      goalComplete: c.goalComplete || !!r.goalComplete,
    });

    if (r.scored) {
      markPracticed();
      setStuck(0);
    } else {
      bumpStuck();
    }
    if (r.kind === "error" && r.message) notice(r.message, "warn");

    if (r.reply) {
      if (r.audio) await playBase64(r.audio, r.audioMime);
      else await playLine(r.reply.kn, { scene: scene.id, slow, live });
    }
  };

  const bumpStuck = () =>
    setStuck((n) => {
      // After two unclear tries in a row, stop asking them to repeat: offer help.
      if (n + 1 >= 2) setTimeout(() => setHintOpen(true), 700);
      return n + 1;
    });

  const send = async (payload: { audio?: Blob; mime?: string; durationMs?: number; text?: string }) => {
    const c = convoRef.current;
    const history: HistoryItem[] = c.msgs
      .filter((m) => m.who !== "notice")
      .map((m) => (m.who === "character" ? { who: "character", kn: m.line.kn } : { who: "learner", kn: (m as Extract<Msg, { who: "learner" }>).heard }));
    const fd = new FormData();
    fd.append("sceneId", scene.id);
    fd.append("history", JSON.stringify(history));
    fd.append("done", JSON.stringify(c.doneSteps));
    if (!live) fd.append("demo", "1");
    if (slow) fd.append("slow", "1");
    if (payload.audio) {
      fd.append("audio", payload.audio, "turn");
      fd.append("durationMs", String(payload.durationMs ?? 0));
    } else fd.append("text", payload.text ?? "");

    setThinking(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch("/api/turn", { method: "POST", body: fd, signal: ctrl.signal });
      clearTimeout(t);
      const r = (await res.json()) as TurnResult;
      setThinking(false);
      await handleResult(r);
    } catch {
      setThinking(false);
      notice("The connection dropped. Check your data and try again.", "warn");
    }
  };

  const onMicStart = useCallback(async () => {
    unlockAudio();
    stopAudio(); // never record the character's own voice
    startingRec.current = true;
    stopWanted.current = false;
    const fail = await recorder.start();
    startingRec.current = false;
    if (fail) {
      notice(fail.message, "warn");
      if (fail.reason === "denied" || fail.reason === "unsupported") setTyping(true);
      return;
    }
    if (stopWanted.current) recorder.abort("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder]);

  const onMicStop = async () => {
    if (startingRec.current) {
      stopWanted.current = true;
      return;
    }
    const r = await recorder.stop();
    if (isFail(r)) {
      if (r.message) notice(r.message, r.reason === "loud" ? "warn" : "info");
      if (r.reason === "silent" || r.reason === "short") bumpStuck();
      return;
    }
    send({ audio: r.blob, mime: r.mime, durationMs: r.durationMs });
  };

  const onType = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || thinking) return;
    setText("");
    send({ text: t });
  };

  const learnerTurns = convo.msgs.filter((m) => m.who === "learner").length;
  const stepsShown = live ? convo.stepsDone : convo.doneSteps.filter((i) => scene.demo[i]?.required).length;
  const totalSteps = live ? scene.goalSteps.length : scene.demo.filter((d) => d.required).length;
  const canWrapUp = convo.goalComplete || learnerTurns >= scene.maxTurns;
  const usedIds = new Set(convo.msgs.flatMap((m) => (m.who === "learner" && m.match ? [m.match.phraseId] : [])));
  const hintPhrases = [...scene.phrases.filter((p) => !usedIds.has(p.id)), ...scene.phrases.filter((p) => usedIds.has(p.id))];

  const header = (
    <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2.5">
        <Link href="/" className="grid h-11 w-11 place-items-center rounded-full bg-surface-2" aria-label="Back to scenes">
          <BackIcon size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold leading-tight">
            {scene.title} <span className="kn font-medium text-muted">{scene.titleKn}</span>
          </p>
          {convo.stage === "talk" ? (
            <div className="mt-1 flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-label={`Goal ${stepsShown} of ${totalSteps}`}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < stepsShown || convo.goalComplete ? "bg-brand" : "bg-line"}`} />
                ))}
              </div>
              <span className="text-xs text-muted">{convo.goalComplete ? "Goal reached" : `Goal ${stepsShown}/${totalSteps}`}</span>
            </div>
          ) : (
            <p className="text-xs text-muted">
              {convo.stage === "brief" ? `About ${scene.minutes} minutes` : "Scene report"}
              {ready && !live ? " · Demo mode" : ""}
            </p>
          )}
        </div>
        {convo.stage === "talk" && (
          <button type="button" onClick={restart} className="grid h-11 w-11 place-items-center rounded-full bg-surface-2" aria-label="Start the scene again">
            <RetryIcon size={18} />
          </button>
        )}
      </div>
    </header>
  );

  if (convo.stage === "brief") {
    return (
      <main className="mx-auto min-h-dvh max-w-lg">
        {header}
        <InAppBrowserBanner />
        <div className="pt-4">
          <Brief scene={scene} live={live} onStart={start} starting={starting} />
        </div>
      </main>
    );
  }

  if (convo.stage === "report") {
    return (
      <main className="mx-auto min-h-dvh max-w-lg">
        {header}
        <div className="pt-4">
          <Report scene={scene} msgs={convo.msgs} goalComplete={convo.goalComplete} recorder={recorder} live={live} onRestart={restart} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-dvh max-w-lg flex-col">
      {header}
      <div className="flex-1 overflow-y-auto px-3 pb-4 pt-3">
        <p className="mx-auto mb-4 max-w-[90%] rounded-2xl bg-surface-2 px-4 py-2 text-center text-sm text-muted">🎯 {scene.goal}</p>
        <div ref={listRef} className="space-y-4" aria-live="polite">
          {convo.msgs.map((m) => (
            <Bubble key={m.id} msg={m} scene={scene} live={live} avatar={scene.icon} />
          ))}
          {thinking && <Typing scene={scene} />}
          {canWrapUp && !thinking && (
            <div className="rise rounded-3xl border border-brand bg-brand-soft p-4 text-center">
              <p className="font-bold">{convo.goalComplete ? "🎉 You did it!" : "Good session!"}</p>
              <p className="mt-1 text-sm text-muted">{convo.goalComplete ? "Keep chatting, or see how clearly you came across." : "See how clearly you came across."}</p>
              <button type="button" onClick={() => { stopAudio(); setConvo((c) => ({ ...c, stage: "report" })); }} className="mt-3 rounded-full bg-brand px-6 py-3 font-semibold text-on-brand">
                See my report
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="safe-bottom border-t border-line bg-surface/95 px-4 pt-3 backdrop-blur">
        {typing ? (
          <form onSubmit={onType} className="flex items-center gap-2 pb-1">
            <button type="button" onClick={() => setTyping(false)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface-2" aria-label="Switch to voice">
              <MicIcon size={20} />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type in Kannada or English letters…"
              className="kn h-12 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 text-base outline-none focus:border-brand"
              aria-label="Your reply"
              maxLength={200}
              autoComplete="off"
              enterKeyHint="send"
            />
            <button type="submit" disabled={!text.trim() || thinking} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-on-brand disabled:opacity-50" aria-label="Send">
              <SendIcon size={20} />
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between pb-1">
            <button type="button" onClick={() => setHintOpen(true)} className={`flex w-20 flex-col items-center gap-1 text-xs font-medium ${stuck >= 2 ? "text-accent" : "text-muted"}`} aria-label="Show hint phrases">
              <span className={`grid h-12 w-12 place-items-center rounded-full ${stuck >= 2 ? "bg-accent-soft" : "bg-surface-2"}`}>
                <BulbIcon size={20} />
              </span>
              Hints
            </button>
            <MicButton recording={recorder.recording} level={recorder.level} elapsed={recorder.elapsed} maxMs={recorder.maxMs} busy={thinking} onStart={onMicStart} onStop={onMicStop} />
            <button type="button" onClick={() => setTyping(true)} className="flex w-20 flex-col items-center gap-1 text-xs font-medium text-muted" aria-label="Type instead">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-2">
                <KeyboardIcon size={20} />
              </span>
              Type
            </button>
          </div>
        )}
        {playing && !recorder.recording && <p className="pb-1 text-center text-xs text-muted">{scene.character.name} is speaking · tap the mic to interrupt</p>}
      </div>

      <Sheet open={hintOpen} onClose={() => setHintOpen(false)} title={stuck >= 2 ? "Try one of these" : "Hint phrases"}>
        {stuck >= 2 && <p className="mb-3 rounded-2xl bg-accent-soft p-3 text-sm">No worries, this happens to everyone. Listen to a phrase slowly, then say it, or switch to typing.</p>}
        <ul className="space-y-2 pb-4">
          {[...hintPhrases.slice(0, 4), ...LIFESAVERS.slice(0, 2)].map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3">
              <LineText kn={p.kn} en={p.en} size="sm" />
              <div className="flex items-center gap-1.5">
                <HearButtons text={p.kn} scene={scene.id} live={live} compact />
                {typing && (
                  <button type="button" onClick={() => { setText(p.kn); setHintOpen(false); }} className="h-9 rounded-full bg-brand-soft px-3 text-xs font-semibold text-brand">
                    Use
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {!typing && (
          <button type="button" onClick={() => { setTyping(true); setHintOpen(false); }} className="mb-4 w-full rounded-full border border-line py-3 font-semibold">
            Type instead
          </button>
        )}
      </Sheet>
    </main>
  );
}
