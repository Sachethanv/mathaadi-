import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SceneFlow } from "@/components/scene/SceneFlow";
import { getScene, SCENES } from "@/lib/scenes";

export function generateStaticParams() {
  return SCENES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const scene = getScene((await params).id);
  return { title: scene ? `${scene.title} · Maathaadi` : "Maathaadi" };
}

export default async function ScenePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getScene(id)) notFound();
  return <SceneFlow key={id} sceneId={id} />;
}
