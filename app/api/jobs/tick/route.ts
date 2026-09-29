import { NextResponse } from "next/server";
import { tick } from "@/lib/jobs/worker";
import { db } from "@/lib/db/supabase";

export const maxDuration = 30;
export async function POST() {
  try {
    const job = await tick();
    if (job?.runId) {
      const client = db(), channel = client.channel(`run:${job.runId}`);
      await channel.httpSend("progress", { job: job.type, status: job.status });
      await client.removeChannel(channel);
    }
    return NextResponse.json({ job });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Worker failed" }, { status: 500 }); }
}
