"use client";
import { useEffect, useRef, useState } from "react";
import { MicIcon, StopIcon } from "./icons";

type Props = {
  recording: boolean;
  level: number;
  elapsed: number;
  maxMs: number;
  busy: boolean;
  /** Hands-free: recording started on its own and ends when the learner pauses. */
  auto?: boolean;
  onStart: () => void;
  onStop: () => void;
  size?: "lg" | "md";
};

/**
 * Hold to talk, release to send. A quick tap switches to tap-to-stop, which is
 * easier for some people (and for one-handed use on a bus).
 */
export function MicButton({ recording, level, elapsed, maxMs, busy, auto = false, onStart, onStop, size = "lg" }: Props) {
  const downAt = useRef(0);
  const [latched, setLatched] = useState(false);
  useEffect(() => {
    if (!recording) setLatched(false);
  }, [recording]);
  const dim = size === "lg" ? "h-20 w-20" : "h-16 w-16";

  const down = (e: React.PointerEvent) => {
    if (busy) return;
    e.preventDefault();
    if (recording) {
      setLatched(false);
      onStop();
      return;
    }
    downAt.current = Date.now();
    onStart();
  };
  const up = () => {
    if (!downAt.current) return; // this press stopped a recording
    const held = Date.now() - downAt.current;
    downAt.current = 0;
    if (held < 350) {
      setLatched(true); // quick tap: keep listening until the next tap
      return;
    }
    if (!latched) onStop();
  };
  const cancel = () => {
    if (downAt.current && !latched) {
      downAt.current = 0;
      onStop();
    }
  };

  const secs = Math.floor(elapsed / 1000);
  const nearEnd = recording && maxMs - elapsed < 4000;
  const label = busy ? "Thinking…" : recording ? (auto ? "Listening… pause to send" : latched ? "Listening… tap to send" : "Listening… release to send") : auto ? "Tap to talk" : "Hold to talk";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative grid place-items-center">
        {recording && <span className="pulse-ring absolute inset-0 rounded-full bg-brand" aria-hidden />}
        {recording && (
          <span
            className="absolute inset-0 rounded-full bg-brand/25 transition-transform duration-75"
            style={{ transform: `scale(${1 + level * 0.55})` }}
            aria-hidden
          />
        )}
        <button
          type="button"
          onPointerDown={down}
          onPointerUp={up}
          onPointerLeave={cancel}
          onPointerCancel={cancel}
          onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              if (busy) return;
              if (recording) {
                setLatched(false);
                onStop();
              } else {
                setLatched(true);
                onStart();
              }
            }
          }}
          disabled={busy}
          aria-label={recording ? "Stop and send" : "Hold to talk"}
          aria-pressed={recording}
          className={`relative grid ${dim} select-none place-items-center rounded-full shadow-card transition active:scale-95 disabled:opacity-60 ${
            recording ? "bg-work text-white" : "bg-brand text-on-brand"
          }`}
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
        >
          {busy ? (
            <span className="flex gap-1" aria-hidden>
              <span className="dot h-2 w-2 rounded-full bg-current" />
              <span className="dot h-2 w-2 rounded-full bg-current" />
              <span className="dot h-2 w-2 rounded-full bg-current" />
            </span>
          ) : recording ? (
            <StopIcon size={28} />
          ) : (
            <MicIcon size={30} />
          )}
        </button>
      </div>
      <p className={`text-sm font-medium ${nearEnd ? "text-work" : "text-muted"}`} aria-live="polite">
        {recording ? `${label} · 0:${String(secs).padStart(2, "0")}` : label}
      </p>
    </div>
  );
}
