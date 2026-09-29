import { NextResponse } from "next/server";
import { db } from "@/lib/db/supabase";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params, s = db();
    const { data: links } = await s.from("run_people").select("person_id,people(status,interested_in)").eq("run_id", id);
    const ids = (links || []).map(link => link.person_id);
    if (!ids.length) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    const [{ count: profiles }, { data: dates }, { data: rankings }, { data: jobs }] = await Promise.all([
      s.from("profiles").select("person_id", { count: "exact", head: true }).in("person_id", ids), s.from("dates").select("id,status,transcript,a_id,b_id").eq("run_id", id), s.from("rankings").select("person_id,rank").eq("run_id", id), s.from("jobs").select("id,type,status,error,attempts").contains("payload", { runId: id }),
    ]);
    const related = links?.[0]?.people, primary = Array.isArray(related) ? related[0] : related;
    let matchSummary: { requested: number; available: number; reason?: string } | undefined;
    try { matchSummary = JSON.parse(String(primary?.interested_in || "{}")).matchSummary; } catch {}
    const judged = (dates || []).filter(date => date.status === "judged").length, failed = (jobs || []).filter(job => job.status === "failed"), latest = [...(dates || [])].sort((a, b) => (b.transcript?.length || 0) - (a.transcript?.length || 0))[0], selectionFinished = (jobs || []).some(job => job.type === "select_pairs" && job.status === "complete"), complete = Boolean((rankings || []).length) || (primary?.status === "complete" && selectionFinished && !(dates || []).length);
    return NextResponse.json({ status: complete ? "complete" : failed.length ? "needs_attention" : "processing", personId: ids[0], matchSummary, stages: { scraping: (jobs || []).some(job => job.type === "scrape_person" && job.status === "complete"), analyzing: (profiles || 0) > 0, dating: { complete: judged, total: (dates || []).length, currentTurns: latest?.transcript?.length || 0 }, ranking: complete }, latestTranscript: latest?.transcript || [], errors: failed.map(job => ({ jobId: job.id, type: job.type, message: job.error, attempts: job.attempts })) });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Progress unavailable" }, { status: 500 }); }
}
