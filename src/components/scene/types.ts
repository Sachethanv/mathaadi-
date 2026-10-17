import type { PhraseScore } from "@/lib/score";
import type { Line, TurnKind } from "@/lib/types";

export type ScoredPhrase = PhraseScore & { phraseId: string; kn: string; en: string };

export type Msg =
  | { id: string; who: "character"; line: Line; scripted?: boolean }
  | {
      id: string;
      who: "learner";
      heard: string;
      kind: TurnKind;
      typed?: boolean;
      demo?: boolean;
      meaningEn?: string | null;
      tip?: string | null;
      better?: Line | null;
      match?: ScoredPhrase | null;
    }
  | { id: string; who: "notice"; text: string; tone: "info" | "warn" | "good" };

export type Convo = {
  stage: "brief" | "talk" | "report";
  msgs: Msg[];
  doneSteps: number[]; // demo step indexes
  stepsDone: number; // live: goal steps reported done
  goalComplete: boolean;
};

export const uid = () => Math.random().toString(36).slice(2, 10);
