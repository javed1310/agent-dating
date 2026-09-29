import { NextResponse } from "next/server";
import { intakeSchema } from "@/lib/schema";
import { db, enqueue } from "@/lib/db/supabase";

export async function POST(req: Request) {
  try {
    const input = intakeSchema.parse(await req.json()), s = db();
    const canonical = (value: string) => { const url = new URL(value); url.hash = ""; url.search = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); url.pathname = `/${url.pathname.split("/").filter(Boolean).join("/")}`; return url.toString(); };
    const linkedinUrl = canonical(input.linkedinUrl), instagramUrl = canonical(input.instagramUrl);
    const handle = new URL(instagramUrl).pathname.split("/").filter(Boolean)[0];
    const preference = JSON.stringify({
      gender: input.gender || null,
      genderStatus: input.gender ? "self_declared" : "unknown",
      interestedIn: input.interestedIn || null,
      interestStatus: input.interestedIn ? "self_declared" : "unknown",
    });
    const { data: person, error } = await s.from("people").insert({ name: handle, linkedin_url: linkedinUrl, instagram_url: instagramUrl, interested_in: preference, status: "queued" }).select("id").single();
    if (error) throw error;
    const { data: run, error: runError } = await s.from("runs").insert({ is_demo: false }).select("id").single();
    if (runError) throw runError;
    const { error: linkError } = await s.from("run_people").insert({ run_id: run.id, person_id: person.id });
    if (linkError) throw linkError;
    await enqueue("scrape_person", { personId: person.id, runId: run.id });
    return NextResponse.json({ id: run.id, personId: person.id, status: "queued", mode: "live" }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to queue this person" }, { status: 400 }); }
}
