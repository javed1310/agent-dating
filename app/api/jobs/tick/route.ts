import { NextResponse } from "next/server";
import { tick } from "@/lib/jobs/worker";
import { db } from "@/lib/db/supabase";

export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { runId?: unknown };
    const runId = typeof body.runId === "string" && /^[0-9a-f-]{36}$/i.test(body.runId) ? body.runId : undefined;
    const job = await tick(runId);
    if (job?.runId) {
      const client = db(), channel = client.channel(`run:${job.runId}`);
      await channel.httpSend("progress", { job: job.type, status: job.status });
      await client.removeChannel(channel);
    }
    return NextResponse.json({ job });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Worker failed" }, { status: 500 }); }
}
