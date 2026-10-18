import { NextResponse } from "next/server";
import { textGate } from "@/lib/server/gates";
import { demoPlan, type LlmPlan, PLAN_SCHEMA, planPrompt, sceneFromLlm, signPlan } from "@/lib/server/plan";
import { clientIp, rateLimit } from "@/lib/server/ratelimit";
import { chatJson, SarvamError, sarvamConfigured } from "@/lib/server/sarvam";

export const runtime = "nodejs";
export const maxDuration = 60;

function parse(s: string): LlmPlan | null {
  const cleaned = s.replace(/<think>[\s\S]*?<\/think>/g, "");
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(cleaned.slice(a, b + 1));
    return typeof v.ok === "boolean" && Array.isArray(v.phrases) && v.opening ? (v as LlmPlan) : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { situation?: unknown; demo?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
  }
  const situation = String(body.situation ?? "").trim().slice(0, 240);
  if (situation.length < 8) return NextResponse.json({ ok: false, message: "Say a bit more about what you need to do." });
  if (!textGate(situation).ok) return NextResponse.json({ ok: false, message: "Describe it in English (or Kannada)." });

  if (!sarvamConfigured() || body.demo === true) {
    return NextResponse.json({ ok: true, plan: signPlan(demoPlan(situation), situation, true) });
  }

  const rl = rateLimit(clientIp(req), "plan", Number(process.env.PLANS_PER_HOUR || 10));
  if (!rl.ok) return NextResponse.json({ ok: false, message: "You've planned a lot of scenes this hour. Try again a little later." }, { status: 429 });

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { content, finish } = await chatJson(planPrompt(), `<situation>\n${situation.replace(/<\/?situation>/gi, "")}\n</situation>`, PLAN_SCHEMA, 2500);
      if (finish === "length") continue;
      const p = parse(content);
      if (!p) continue;
      if (!p.ok) return NextResponse.json({ ok: false, message: p.refusal || "That isn't something Maathaadi can help you rehearse." });
      const scene = sceneFromLlm(p);
      if (scene) return NextResponse.json({ ok: true, plan: signPlan(scene, situation, false) });
    }
    return NextResponse.json({ ok: false, message: "Couldn't write that scene. Try describing it another way." });
  } catch (e) {
    console.error("[plan]", e);
    const code = e instanceof SarvamError ? e.code : "upstream";
    return NextResponse.json({ ok: false, message: code === "quota" ? "The live service has run out of credit. Switch on demo mode in Settings." : "Couldn't reach the service. Check your data and try again." });
  }
}
