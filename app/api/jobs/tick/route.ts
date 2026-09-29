import { NextResponse } from "next/server";
import { tick, tickBatch } from "@/lib/jobs/worker";
import { db } from "@/lib/db/supabase";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { runId?: unknown };
    const runId = typeof body.runId === "string" && /^[0-9a-f-]{36}$/i.test(body.runId) ? body.runId : undefined;
    const jobs = runId ? await tickBatch(runId, 3) : [await tick()].filter((job): job is NonNullable<typeof job> => Boolean(job));
    const job = jobs[0] || null;
    if (job?.runId) {
      const client = db(), channel = client.channel(`run:${job.runId}`);
      await channel.httpSend("progress", { jobs: jobs.map(item => ({ type: item.type, status: item.status })) });
      await client.removeChannel(channel);
    }
    return NextResponse.json({ job, jobs });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Worker failed" }, { status: 500 }); }
}
