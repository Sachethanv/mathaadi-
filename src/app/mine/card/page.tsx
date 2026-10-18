"use client";
import { Suspense } from "react";
import { MinePlan } from "@/components/MinePlan";
import { PocketCard } from "@/components/PocketCard";

export default function MineCardPage() {
  return (
    <Suspense>
      <MinePlan>{(plan) => <PocketCard key={plan.scene.id} scene={plan.scene} plan={plan} />}</MinePlan>
    </Suspense>
  );
}
