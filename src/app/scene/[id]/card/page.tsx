import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PocketCard } from "@/components/PocketCard";
import { getScene, SCENES } from "@/lib/scenes";

export function generateStaticParams() {
  return SCENES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const scene = getScene((await params).id);
  return { title: scene ? `${scene.title} pocket card · Maathaadi` : "Maathaadi" };
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const scene = getScene((await params).id);
  if (!scene) notFound();
  return <PocketCard scene={scene} />;
}
