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

export type CategoryId = "travel" | "food" | "home" | "errands" | "health" | "social";

export type Category = { id: CategoryId; title: string; titleKn: string; icon: string; blurb: string };

export type Scene = {
  id: string;
  category: CategoryId;
  /** 1 starter, 2 everyday, 3 confident */
  level: 1 | 2 | 3;
  title: string;
  titleKn: string;
  icon: string;
  tint: string; // css colour token name, from the category
  place: string;
  minutes: number;
  /** A phone call rather than face to face. */
  phone?: boolean;
  goal: string;
  goalSteps: string[];
  character: { name: string; role: string; voice: string; persona: string };
  opening: { kn: string; en: string };
  phrases: Phrase[];
  keyterms: string[];
  regionalNote: string;
  /** "Next time you ..." for the report's real-world mission. */
  mission: string;
  /** Extra rule for the character, e.g. never give medical advice. */
  guardrail?: string;
  maxTurns: number;
  inferred?: boolean;
  demo: DemoStep[];
};

export type SceneDef = Omit<Scene, "tint" | "minutes" | "maxTurns"> & Partial<Pick<Scene, "minutes" | "maxTurns">>;

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

/** One line of the streamed /api/turn response (NDJSON). */
export type StreamEvent =
  | { t: "heard"; heard: string; typed?: boolean; demo?: boolean }
  | { t: "reply"; kn: string } // the character's line so far
  | { t: "audio"; audio: string; mime: string } // one spoken sentence, in order
  | { t: "done"; result: TurnResult };
