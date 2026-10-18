// "My situation" scenes: written for one learner from what they typed, kept
// on their phone, and signed by the server so they can't be edited into
// something else before being sent back to the character.
import { CATEGORIES } from "./scenes";
import type { CategoryId, Scene } from "./types";

export type CustomPlan = {
  scene: Scene;
  /** Server signature over JSON.stringify(scene). Absent for demo plans. */
  sig?: string;
  /** Per-line signatures that let /api/tts speak this plan's lines. */
  lineSigs?: Record<string, string>;
  situation: string;
  demo?: boolean;
  created: string;
};

export const FEMALE_VOICES = ["ishita", "priya", "kavya", "shruti", "roopa", "suhani", "kavitha"];
export const MALE_VOICES = ["aditya", "rahul", "kabir", "vijay", "anand", "mohit", "ratan"];
export const VOICES = new Set([...FEMALE_VOICES, ...MALE_VOICES]);

export const isCustomId = (id: string) => id.startsWith("my-");
export const playHref = (scene: Scene) => (isCustomId(scene.id) ? `/mine/play?id=${scene.id}` : `/scene/${scene.id}`);
export const cardHref = (scene: Scene) => (isCustomId(scene.id) ? `/mine/card?id=${scene.id}` : `/scene/${scene.id}/card`);

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() && v.length <= max ? v : null);

/** Shape and size check for a custom scene sent back by the browser. */
export function checkScene(raw: unknown): Scene | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Scene;
  const okLine = (l: unknown) => !!l && !!str((l as { kn: unknown }).kn, 200) && typeof (l as { en: unknown }).en === "string";
  if (!str(s.id, 40) || !isCustomId(s.id)) return null;
  if (!CATEGORIES.some((c) => c.id === (s.category as CategoryId))) return null;
  if (![s.title, s.place, s.goal, s.regionalNote, s.mission].every((v) => str(v, 300))) return null;
  if (!s.character || !VOICES.has(s.character.voice) || !str(s.character.persona, 600) || !str(s.character.role, 80) || !str(s.character.name, 40)) return null;
  if (!Array.isArray(s.goalSteps) || s.goalSteps.length > 4 || !s.goalSteps.every((g) => str(g, 120))) return null;
  if (!okLine(s.opening) || !Array.isArray(s.phrases) || s.phrases.length < 2 || s.phrases.length > 6 || !s.phrases.every(okLine)) return null;
  if (!Array.isArray(s.demo) || s.demo.length > 8 || !Array.isArray(s.keyterms) || s.keyterms.length > 20) return null;
  return s;
}

/** Every line of a plan that may be spoken aloud. */
export function speakableLines(scene: Scene) {
  return [...new Set([scene.opening.kn, ...scene.phrases.map((p) => p.kn), ...scene.demo.map((d) => d.reply.kn)])];
}
