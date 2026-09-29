"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IntakeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/people", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start analysis");
      sessionStorage.setItem(`proxy:${data.id}`, JSON.stringify(data));
      router.push(`/run/${data.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong"); setBusy(false); }
  }

  return <form className="intake" onSubmit={submit}>
    <span className="eyebrow">Build your proxy</span>
    <label>LinkedIn profile</label><input name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/you" required />
    <label>Public Instagram</label><input name="instagramUrl" type="url" placeholder="https://instagram.com/you" required />
    <div className="preference-grid">
      <div><label htmlFor="gender">I identify as <span className="note">(optional)</span></label><select id="gender" name="gender" defaultValue=""><option value="">Prefer not to specify</option><option value="woman">Woman</option><option value="man">Man</option><option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option></select></div>
      <div><label htmlFor="interestedIn">Interested in <span className="note">(optional)</span></label><select id="interestedIn" name="interestedIn" defaultValue=""><option value="">Preference-neutral</option><option value="women">Women</option><option value="men">Men</option><option value="non_binary">Non-binary people</option><option value="everyone">Everyone</option></select></div>
    </div>
    <p className="note preference-note">Gender is self-declared and never inferred from LinkedIn or Instagram.</p>
    {fallback&&<><label>Profile text fallback</label><textarea name="fallbackText" placeholder="Paste public LinkedIn or Instagram profile text here…" /></>}
    <button type="button" className="note" style={{border:0,background:"none",cursor:"pointer",marginTop:14}} onClick={()=>setFallback(value=>!value)}>{fallback?"Hide":"Scraper blocked? Paste profile text instead"}</button>
    <button className="button" disabled={busy}>{busy?"Reading the signals…":"Create my dating agent →"}</button>
    {error&&<div className="error">{error}</div>}<p className="note">Only the two links above are used. No sensitive traits are inferred.</p>
  </form>;
}
