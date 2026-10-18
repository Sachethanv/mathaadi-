"use client";
import { Suspense } from "react";
import { MinePlan } from "@/components/MinePlan";
import { SceneFlow } from "@/components/scene/SceneFlow";

export default function MinePlayPage() {
  return (
    <Suspense>
      <MinePlan>{(plan) => <SceneFlow key={plan.scene.id} scene={plan.scene} plan={plan} />}</MinePlan>
    </Suspense>
  );
}
