import { NextResponse } from "next/server";
import { getScene } from "@/lib/scenes";
import { sttGate } from "@/lib/server/gates";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { SarvamError, sarvamConfigured, transcribe } from "@/lib/server/sarvam";

export const runtime = "nodejs";

// "Say it again" drill on the report card: speech-to-text plus the clarity
// gate, no character. Scoring happens in the browser against the target phrase.
export async function POST(req: Request) {
  const form = await req.formData();
  const scene = getScene(String(form.get("sceneId") ?? ""));
  const audio = form.get("audio");
  const target = String(form.get("target") ?? "");
  const durationMs = Number(form.get("durationMs") ?? 0);
  if (!(audio instanceof Blob)) return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });

  if (!sarvamConfigured() || form.get("demo") === "1") {
    return NextResponse.json({ ok: true, heard: target, demo: true });
  }
  const rl = rateLimit(clientIp(req), "turn", Number(process.env.TURNS_PER_HOUR || 30));
  if (!rl.ok) return NextResponse.json({ ok: false, message: "You've practised a lot this hour. Take a short break." }, { status: 429 });
  if (audio.size < 1000) return NextResponse.json({ ok: false, message: "Hold the button while you speak." });

  try {
    const ext = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
    const stt = await transcribe(audio, `drill.${ext}`, scene?.keyterms ?? []);
    const verdict = sttGate(stt, durationMs);
    if (!verdict.ok) return NextResponse.json({ ok: false, heard: stt.transcript || undefined, message: verdict.message });
    return NextResponse.json({ ok: true, heard: stt.transcript.trim() });
  } catch (e) {
    console.error("[transcribe]", e);
    const quota = e instanceof SarvamError && e.code === "quota";
    return NextResponse.json({ ok: false, message: quota ? "The live voice service has run out of credit. Turn on demo mode in Settings." : "Couldn't reach the speech service. Try again." });
  }
}
