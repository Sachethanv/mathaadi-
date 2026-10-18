"use client";
// Loads one of the learner's own planned scenes (kept on this phone) by the
// ?id= in the address, for the play and pocket-card pages.
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { registerSceneVoice } from "@/lib/audio";
import type { CustomPlan } from "@/lib/custom";
import { useMine } from "@/lib/store";

export function MinePlan({ children }: { children: (plan: CustomPlan) => ReactNode }) {
  const id = useSearchParams().get("id") ?? "";
  const plans = useMine();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const plan = plans.find((p) => p.scene.id === id);
  if (plan) registerSceneVoice(plan.scene.id, plan.scene.character.voice, plan.lineSigs);
  if (!mounted) return null;
  if (!plan) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-6 text-center">
        <div>
          <p className="text-4xl">🗒️</p>
          <p className="mt-3 text-lg font-bold">That scene isn&apos;t on this phone</p>
          <p className="mt-1 text-muted">Your own scenes are saved on the phone you made them on.</p>
          <Link href="/mine" className="mt-5 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-on-brand">
            Plan a new one
          </Link>
        </div>
      </main>
    );
  }
  return <>{children(plan)}</>;
}
