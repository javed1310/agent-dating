"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { browserDb } from "@/lib/db/browser";

type Turn = { speaker: "a" | "b"; text: string };
type Stages = { scraping: boolean; analyzing: boolean; dating: { complete: number; total: number; currentTurns?: number }; ranking: boolean };

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [personId, setPersonId] = useState("");
  const [stages, setStages] = useState<Stages>({ scraping: false, analyzing: false, dating: { complete: 0, total: 0 }, ranking: false });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState("queued");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [realtime, setRealtime] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(`proxy:${id}`);
    if (saved) setPersonId(JSON.parse(saved).personId || "");
    else fetch(`/api/runs/${id}/progress`, { cache: "no-store" }).then(async response => {
      const progress = await response.json();
      if (!response.ok) throw new Error(progress.error || "Saved run not found");
      setPersonId(progress.personId || "");
      setStages(progress.stages);
      setTurns(progress.latestTranscript || []);
      setStatus(progress.status);
      if (progress.status === "complete") router.replace(`/p/${progress.personId}`);
    }).catch(cause => setError(cause instanceof Error ? cause.message : "Saved run not found"));
  }, [id, router]);

  useEffect(() => {
    if (!personId) return;
    const client = browserDb();
    if (!client) return;
    const channel = client.channel(`run:${id}`).on("broadcast", { event: "progress" }, async () => {
      const response = await fetch(`/api/runs/${id}/progress`, { cache: "no-store" }), progress = await response.json();
      if (!response.ok) return;
      setStages(progress.stages); setTurns(progress.latestTranscript || []); setStatus(progress.status);
      if (progress.status === "complete") { sessionStorage.removeItem(`proxy:${id}`); router.replace(`/p/${personId}`); }
    }).subscribe(subscription => setRealtime(subscription === "SUBSCRIBED"));
    return () => { setRealtime(false); void client.removeChannel(channel); };
  }, [id, personId, router]);

  useEffect(() => {
    if (!personId || status === "complete" || status === "needs_attention") return;
    let stopped = false, timer: ReturnType<typeof setTimeout>;
    async function cycle() {
      try {
        await fetch("/api/jobs/tick", { method: "POST" });
        const response = await fetch(`/api/runs/${id}/progress`, { cache: "no-store" }), progress = await response.json();
        if (!response.ok) throw new Error(progress.error);
        if (stopped) return;
        setStages(progress.stages); setTurns(progress.latestTranscript || []); setStatus(progress.status);
        if (progress.errors?.length) setError(progress.errors.map((item: { type: string; message: string }) => `${item.type}: ${item.message}`).join("; "));
        if (progress.status === "complete") { sessionStorage.removeItem(`proxy:${id}`); router.replace(`/p/${personId}`); return; }
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Progress check failed"); }
      timer = setTimeout(cycle, 900);
    }
    cycle();
    return () => { stopped = true; clearTimeout(timer); };
  }, [id, personId, router, status]);

  async function retry() {
    setRecovering(true); setError("");
    const response = await fetch(`/api/runs/${id}/retry`, { method: "POST" }), result = await response.json();
    if (response.ok && result.retried) setStatus("processing"); else setError(result.error || "No failed job was available to retry");
    setRecovering(false);
  }

  async function paste() {
    if (manual.trim().length < 40) { setError("Paste at least 40 characters of public profile text."); return; }
    setRecovering(true); setError("");
    const response = await fetch(`/api/people/${personId}/paste`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: manual, runId: id }) }), result = await response.json();
    if (response.ok) { setStatus("processing"); setManual(""); } else setError(result.error || "Could not accept profile text");
    setRecovering(false);
  }

  const completed = [stages.scraping, stages.analyzing, stages.dating.total > 0 && stages.dating.complete === stages.dating.total, stages.ranking];
  const cards = ["Scraping both sources", "Building your profile", `Dating ${stages.dating.complete}/${stages.dating.total || 6} · turn ${stages.dating.currentTurns || 0}/8`, "Computing rankings"];
  return <div className="page">
    <span className="eyebrow">Live agent run · {realtime ? "Realtime connected" : "Secure polling"}</span>
    <h1 style={{ font: "500 64px Georgia" }}>{status === "needs_attention" ? "This run needs your help." : "Your agents are working…"}</h1>
    <p className="lede">When the run finishes, your complete evidence-backed profile opens first. Rankings are one step after that.</p>
    <div className="progress">{completed.map((done, index) => <i className={`step ${done ? "done" : ""}`} key={index} />)}</div>
    <div className="grid" style={{ marginBottom: 35 }}>{cards.map((label, index) => <div className="person" key={label}><span className="eyebrow">{completed[index] ? "Complete" : "Waiting"}</span><h3>{label}</h3></div>)}</div>
    {turns.length > 0 && <section className="transcript"><span className="eyebrow">Live transcript</span>{turns.map((turn, index) => <div className={`bubble ${turn.speaker === "b" ? "b" : ""}`} key={index}><strong>Agent {turn.speaker.toUpperCase()}</strong>{turn.text}</div>)}</section>}
    {error && <div className="error">{error}</div>}
    {status === "needs_attention" && <div className="card" style={{ marginTop: 25 }}><h2>Recover this run</h2><p className="note">Retry the failed job, or paste public LinkedIn profile text if scraping was blocked.</p><button className="button" disabled={recovering} onClick={retry}>Retry failed step</button><label style={{ display: "block", marginTop: 20 }} className="eyebrow">Public profile text fallback</label><textarea value={manual} onChange={event => setManual(event.target.value)} placeholder="Paste the public profile headline, about, experience, and skills…" style={{ width: "100%", minHeight: 130, padding: 14, margin: "10px 0", borderRadius: 10 }} /><button className="button acid" disabled={recovering} onClick={paste}>Use pasted text and continue</button></div>}
  </div>;
}
