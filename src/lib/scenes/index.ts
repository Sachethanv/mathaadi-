import type { Category, CategoryId, Phrase, Scene, SceneDef } from "../types";
import { ERRANDS } from "./errands";
import { FOOD } from "./food";
import { HEALTH } from "./health";
import { HOME } from "./home";
import { SOCIAL } from "./social";
import { TRAVEL } from "./travel";

// Colloquial Bengaluru Kannada. Have a native speaker review these lines before
// the demo; the LLM follows their register.

export const CATEGORIES: Category[] = [
  { id: "travel", title: "Getting around", titleKn: "ಓಡಾಟ", icon: "🛺", blurb: "Autos, buses, metro and directions" },
  { id: "food", title: "Food & shopping", titleKn: "ಊಟ, ಶಾಪಿಂಗ್", icon: "🍅", blurb: "Markets, darshinis and the corner shop" },
  { id: "home", title: "Home", titleKn: "ಮನೆ", icon: "🏠", blurb: "Renting, house help, repairs, deliveries" },
  { id: "errands", title: "Errands", titleKn: "ಕೆಲಸಗಳು", icon: "🧾", blurb: "Bank, recharge and the tailor" },
  { id: "health", title: "Health & help", titleKn: "ಆರೋಗ್ಯ, ಸಹಾಯ", icon: "🩺", blurb: "Clinic, pharmacy and the police desk" },
  { id: "social", title: "People & festivals", titleKn: "ಜನ, ಹಬ್ಬ", icon: "🪔", blurb: "Neighbours, colleagues, chai and Ugadi" },
];

const define = (d: SceneDef): Scene => ({ minutes: 3, maxTurns: 6, ...d, tint: d.category });

export const SCENES: Scene[] = [...TRAVEL, ...FOOD, ...HOME, ...ERRANDS, ...HEALTH, ...SOCIAL].map(define);

export const LEVELS: Record<Scene["level"], string> = { 1: "Starter", 2: "Everyday", 3: "Confident" };

/** Survival lines that help in every scene; offered as hints too. */
export const LIFESAVERS: Phrase[] = [
  { id: "ls-1", kn: "ಸ್ವಲ್ಪ ನಿಧಾನವಾಗಿ ಹೇಳಿ", en: "Please say it a little slowly" },
  { id: "ls-2", kn: "ಕನ್ನಡ ಸ್ವಲ್ಪ ಸ್ವಲ್ಪ ಬರುತ್ತೆ", en: "I know a little Kannada" },
  { id: "ls-3", kn: "ಇನ್ನೊಂದ್ಸಲ ಹೇಳಿ", en: "Say it once more" },
  { id: "ls-4", kn: "ಗೊತ್ತಾಗ್ಲಿಲ್ಲ", en: "I didn't understand" },
  { id: "ls-5", kn: "ಧನ್ಯವಾದಗಳು", en: "Thank you" },
  { id: "ls-6", kn: "ಊಟ ಆಯ್ತಾ?", en: "Have you eaten? (a warm hello)" },
];

export function getScene(id: string) {
  return SCENES.find((s) => s.id === id);
}

export function getCategory(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}

export function scenesIn(category: CategoryId) {
  return SCENES.filter((s) => s.category === category);
}

/** The next scene to suggest after this one: an unfinished one in the same category first. */
export function nextScene(current: Scene, isDone: (id: string) => boolean) {
  const same = scenesIn(current.category).filter((s) => s.id !== current.id && !isDone(s.id));
  if (same.length) return same[0];
  const any = SCENES.filter((s) => s.id !== current.id && !isDone(s.id)).sort((a, b) => a.level - b.level);
  return any[0] ?? SCENES[(SCENES.indexOf(current) + 1) % SCENES.length];
}

/** One phrase a day, the same for everyone on a given date. */
export function phraseOfTheDay(date = new Date()): { phrase: Phrase; sceneId?: string } {
  const all: { phrase: Phrase; sceneId?: string }[] = [
    ...LIFESAVERS.map((p) => ({ phrase: p })),
    ...SCENES.flatMap((s) => s.phrases.map((p) => ({ phrase: p, sceneId: s.id }))),
  ];
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return all[(day * 7) % all.length];
}

export const REPEAT_LINE = { kn: "ಏನು? ಇನ್ನೊಂದ್ಸಲ ಹೇಳಿ.", en: "Sorry? Say that once more." };
export const ONLY_KANNADA_LINE = { kn: "ನಂಗೆ ಕನ್ನಡ ಮಾತ್ರ ಬರೋದು. ಕನ್ನಡದಲ್ಲಿ ಹೇಳಿ.", en: "I only speak Kannada. Say it in Kannada." };
export const HOLD_ON_LINE = { kn: "ಸ್ವಲ್ಪ ಇರಿ...", en: "One moment..." };
