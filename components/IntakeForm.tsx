"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IntakeForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const response = await fetch("/api/people", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start analysis");
      sessionStorage.setItem(`undate:${data.id}`, JSON.stringify(data));
      router.push(`/run/${data.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong"); setBusy(false); }
  }

  return <form className="intake" onSubmit={submit}>
    <div className="intake-heading">
      <span className="eyebrow">Build your dating agent</span>
      <p>Paste the two public profiles you want the agent to understand.</p>
    </div>

    <div className="field-group">
      <label htmlFor="linkedinUrl">LinkedIn profile</label>
      <input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="linkedin.com/in/your-name" required />
    </div>
    <div className="field-group">
      <label htmlFor="instagramUrl">Public Instagram</label>
      <input id="instagramUrl" name="instagramUrl" type="url" placeholder="instagram.com/your-name" required />
    </div>

    <details className="form-disclosure">
      <summary><span>Match preferences</span><small>Optional</small></summary>
      <div className="preference-grid">
        <div><label htmlFor="gender">I identify as</label><select id="gender" name="gender" defaultValue=""><option value="">Not specified</option><option value="woman">Woman</option><option value="man">Man</option><option value="non_binary">Non-binary</option><option value="prefer_not_to_say">Prefer not to say</option></select></div>
        <div><label htmlFor="interestedIn">Interested in</label><select id="interestedIn" name="interestedIn" defaultValue=""><option value="">Preference-neutral</option><option value="women">Women</option><option value="men">Men</option><option value="non_binary">Non-binary people</option><option value="everyone">Everyone</option></select></div>
      </div>
      <p className="note">Self-declared only. Gender is never inferred from either profile.</p>
    </details>

    <button className="button intake-submit" disabled={busy}>{busy?"Building your agent…":"Create my dating agent"}<span aria-hidden="true">→</span></button>
    {error&&<div className="error">{error}</div>}
    <p className="privacy-note"><span aria-hidden="true">◇</span> Public data only · no sensitive-trait inference</p>
  </form>;
}
