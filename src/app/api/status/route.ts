import { NextResponse } from "next/server";
import { sarvamConfigured } from "@/lib/server/sarvam";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ live: sarvamConfigured() });
}
