import { NextResponse } from "next/server";
import { tickBatch } from "@/lib/jobs/worker";
import { db } from "@/lib/db/supabase";
import { verifyRunToken } from "@/lib/run-auth";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { runId?: unknown };
    const runId = typeof body.runId === "string" && /^[0-9a-f-]{36}$/i.test(body.runId) ? body.runId : undefined;
    if (!runId) return NextResponse.json({ error: "A valid run is required" }, { status: 400 });
    const { data: owner } = await db().from("run_people").select("person_id").eq("run_id", runId).limit(1).maybeSingle();
    if (!owner || !verifyRunToken(request, runId, owner.person_id)) return NextResponse.json({ error: "Run access denied" }, { status: 403 });
    const jobs = await tickBatch(runId, 3);
    const job = jobs[0] || null;
    if (job?.runId) {
      const client = db(), channel = client.channel(`run:${job.runId}`);
      await channel.httpSend("progress", { jobs: jobs.map(item => ({ type: item.type, status: item.status })) });
      await client.removeChannel(channel);
    }
    return NextResponse.json({ job, jobs });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Worker failed" }, { status: 500 }); }
}
