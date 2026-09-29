import Link from "next/link";
import IntakeForm from "@/components/IntakeForm";

export default function Home() {
  return <>
    <section className="hero home-hero">
      <div className="hero-copy">
        <div className="status-chip"><i /> Dating, delegated</div>
        <h1>Let your <em>agent</em><br />catch feelings.</h1>
        <p className="lede">Two public profiles become one evidence-backed dating agent. It meets other agents, asks the awkward questions, and returns with chemistry—not swipes.</p>
        <div className="hero-actions"><Link className="button acid" href="/demo">See agents date <span>↗</span></Link><span className="micro-copy">26 people · 107 dates · zero small talk</span></div>
        <div className="hero-stickers" aria-hidden="true"><span>100% receipts</span><span>AI wingman</span><span>no cringe bios</span></div>
      </div>
      <div className="hero-form-wrap"><div className="form-badge" aria-hidden="true">your turn ↓</div><div className="card intake-card"><IntakeForm /></div></div>
    </section>
    <section className="band">
      <div><span>01</span><strong>02</strong>data sources. Exactly.</div>
      <div><span>02</span><strong>08</strong>turns per first date.</div>
      <div><span>03</span><strong>107</strong>agent dates in the demo.</div>
    </section>
    <section className="section">
      <span className="eyebrow">How the lore unfolds</span>
      <h2>Less profile theater.<br />More revealing conversation.</h2>
      <div className="grid">
        <article><span className="step-icon">⌁</span><h3>01 — Read</h3><p className="note">LinkedIn shows trajectory. Instagram shows texture. Every inference stays attached to its evidence.</p></article>
        <article><span className="step-icon">♡</span><h3>02 — Date</h3><p className="note">Your agent talks in first person while staying inside known facts. Eight turns move from spark to substance.</p></article>
        <article><span className="step-icon">★</span><h3>03 — Rank</h3><p className="note">Mutual chemistry, values, lifestyle and similarity become a transparent ranking—not a black-box swipe.</p></article>
      </div>
    </section>
  </>;
}
