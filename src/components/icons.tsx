import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...p }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...p,
  };
}

export const MicIcon = (p: P) => (
  <svg {...base(p)}><rect x="9" y="2.5" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" /></svg>
);
export const StopIcon = (p: P) => (
  <svg {...base(p)}><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" /></svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base(p)}><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l12-7.2a1 1 0 0 0 0-1.72l-12-7.2A1 1 0 0 0 7 4.8z" fill="currentColor" stroke="none" /></svg>
);
export const SpeakerIcon = (p: P) => (
  <svg {...base(p)}><path d="M11 5 6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></svg>
);
export const SlowIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 17h13a4 4 0 0 0 4-4 5 5 0 0 0-10 0" /><path d="M20 13h1.5M6 17v2M14 17v2M10 13a3 3 0 0 0-6 0v4" /></svg>
);
export const KeyboardIcon = (p: P) => (
  <svg {...base(p)}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></svg>
);
export const BulbIcon = (p: P) => (
  <svg {...base(p)}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z" /></svg>
);
export const GearIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
export const BackIcon = (p: P) => (
  <svg {...base(p)}><path d="M15 5l-7 7 7 7" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const FlameIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 22c4 0 7-2.7 7-6.8 0-3.7-2.6-6.2-4.3-8.4-.4 2-1.4 3.3-2.7 4C12 7.6 10.8 4.7 8.5 2 8.6 5.7 5 8.6 5 14.6 5 19 8 22 12 22z" fill="currentColor" stroke="none" /></svg>
);
export const RetryIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
);
export const SendIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 12 20 4l-6 16-3-7-7-1z" /></svg>
);
export const ArrowIcon = (p: P) => (
  <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const EarIcon = (p: P) => (
  <svg {...base(p)}><path d="M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5.5s-1 4.5-4 4.5a3 3 0 0 1-3-3" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0" /></svg>
);
