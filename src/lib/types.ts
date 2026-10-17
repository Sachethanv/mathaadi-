export type Phrase = {
  id: string;
  kn: string;
  en: string;
  /** Accepted spoken variants (colloquial contractions, spelling variants). */
  variants?: string[];
  note?: string;
};

export type DemoStep = {
  /** Lower-case keywords in Kannada script or romanised Kannada. */
  match: string[];
  /** What the demo "hears" when the learner speaks at this step. Some include
   *  typical learner slips (short for long vowels, ಲ for ಳ) so the scorer shows. */
  say: string;
  reply: { kn: string; en: string };
  tip?: string;
  /** Steps marked required must all be done for the goal. */
  required?: boolean;
};

export type Scene = {
  id: string;
  title: string;
  titleKn: string;
  icon: string;
  tint: string; // css colour token name
  place: string;
  minutes: number;
  goal: string;
  goalSteps: string[];
  character: { name: string; role: string; voice: string; persona: string };
  opening: { kn: string; en: string };
  phrases: Phrase[];
  keyterms: string[];
  regionalNote: string;
  maxTurns: number;
  inferred?: boolean;
  demo: DemoStep[];
};

export type Line = { kn: string; en: string; translit: string };

export type TurnKind = "clear" | "partial" | "unclear" | "no_speech" | "not_kannada" | "error";

export type TurnResult = {
  kind: TurnKind;
  /** Exactly what the speech system heard (or what was typed). Never edited. */
  heard?: string;
  detectedLanguage?: string | null;
  /** Plain-English notice for the learner (no speech, errors). */
  message?: string;
  reply?: Line & { scripted: boolean };
  audio?: string; // base64
  audioMime?: string;
  meaningEn?: string | null;
  tip?: string | null;
  better?: Line | null;
  stepDone?: boolean;
  goalComplete?: boolean;
  scored: boolean;
  demo?: boolean;
  typed?: boolean;
};

export type HistoryItem = { who: "character" | "learner"; kn: string };
