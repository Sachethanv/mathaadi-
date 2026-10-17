"use client";
// Settings and progress live in localStorage: no login, nothing leaves the phone.
import { useSyncExternalStore } from "react";

export type Settings = {
  showKn: boolean;
  showTranslit: boolean;
  showEn: boolean;
  slowVoice: boolean;
  demo: boolean;
  onboarded: boolean;
};

export type SceneRecord = { plays: number; best: number; lastScore: number; goalMet: boolean; lastPlayed: string; confidence?: number };

export type Progress = {
  days: string[]; // YYYY-MM-DD days with practice
  scenes: Record<string, SceneRecord>;
  turns: number;
};

const DEFAULT_SETTINGS: Settings = { showKn: true, showTranslit: true, showEn: true, slowVoice: false, demo: false, onboarded: false };
const DEFAULT_PROGRESS: Progress = { days: [], scenes: {}, turns: 0 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function createStore<T>(key: string, fallback: T) {
  let value: T | null = null;
  const listeners = new Set<() => void>();
  const get = () => (value ??= typeof window === "undefined" ? fallback : read(key, fallback));
  return {
    get,
    set(update: Partial<T> | ((v: T) => T)) {
      const cur = get();
      value = typeof update === "function" ? update(cur) : { ...cur, ...update };
      write(key, value);
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    fallback,
  };
}

export const settingsStore = createStore<Settings>("maathaadi:settings", DEFAULT_SETTINGS);
export const progressStore = createStore<Progress>("maathaadi:progress", DEFAULT_PROGRESS);

export function useSettings() {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, () => settingsStore.fallback);
}

export function useProgress() {
  return useSyncExternalStore(progressStore.subscribe, progressStore.get, () => progressStore.fallback);
}

export function today(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function markPracticed() {
  progressStore.set((p) => {
    const t = today();
    return { ...p, turns: p.turns + 1, days: p.days.includes(t) ? p.days : [...p.days, t].slice(-400) };
  });
}

/** Consecutive days ending today (or yesterday, so the streak survives until tonight). */
export function streak(days: string[]) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(today(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(today(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function last7(days: string[]) {
  const set = new Set(days);
  const out: { label: string; done: boolean; isToday: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ label: d.toLocaleDateString("en-IN", { weekday: "narrow" }), done: set.has(today(d)), isToday: i === 0 });
  }
  return out;
}

export function saveSceneResult(id: string, score: number, goalMet: boolean, confidence?: number) {
  progressStore.set((p) => {
    const prev = p.scenes[id];
    return {
      ...p,
      scenes: {
        ...p.scenes,
        [id]: {
          plays: (prev?.plays ?? 0) + 1,
          best: Math.max(prev?.best ?? 0, score),
          lastScore: score,
          goalMet: goalMet || !!prev?.goalMet,
          lastPlayed: today(),
          confidence: confidence ?? prev?.confidence,
        },
      },
    };
  });
}

export function setSceneConfidence(id: string, confidence: number) {
  progressStore.set((p) => (p.scenes[id] ? { ...p, scenes: { ...p.scenes, [id]: { ...p.scenes[id], confidence } } } : p));
}

// Conversation snapshot, so a reload mid-scene doesn't lose the chat.
export function saveConversation(id: string, data: unknown) {
  try {
    sessionStorage.setItem(`maathaadi:convo:${id}`, JSON.stringify(data));
  } catch {}
}
export function loadConversation<T>(id: string): T | null {
  try {
    const raw = sessionStorage.getItem(`maathaadi:convo:${id}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export function clearConversation(id: string) {
  try {
    sessionStorage.removeItem(`maathaadi:convo:${id}`);
  } catch {}
}
