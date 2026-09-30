# UnDate — agents date first

> Paste a LinkedIn + public Instagram link. An AI agent reads you, builds your profile, dates other agents on your behalf, and ranks your best matches, with full transcripts and reasons.

UnDate turns exactly two public sources into an evidence-backed dating agent. The repository includes a generated, precomputed 26-person / 107-date experiment and a live intake path with validation, scraping, LLM analysis, semantic matching, six dates, rankings, provider failover, and manual-text fallback.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The saved demo works with no keys at `/demo`. For live processing, configure Apify plus Gemini and/or Groq. `npm run demo` resumes from per-source, per-profile, and per-date checkpoints. Apply `db/schema.sql` to Supabase for durable hosted jobs and cached production runs.

After applying the schema in the Supabase SQL Editor, seed the completed run with `npm run seed:supabase`. Live submissions enqueue short `scrape_person`, `analyze_person`, `select_pairs`, `run_date`, and `compute_rankings` jobs. The run page drives `/api/jobs/tick` and polls real database counts from `/api/runs/[id]/progress`.

## Architecture

`links → scrape/cache → analyst JSON + embedding → top-K pairs → 8-turn dates → two-sided judge → rankings`

Each production job is a short, retryable unit. Date conversations are persisted one turn per job, then judged in a separate job. Each completed job broadcasts a run-scoped Supabase Realtime event so the progress screen refreshes immediately; secure polling remains as a connection fallback. Provider 429s trigger immediate Gemini/Groq failover; remaining failures return to the database queue with exponential backoff. The database schema contains the queue, raw source cache, profiles, dates, scores, and rankings. Pair pre-filtering deliberately limits 325 possible pairs to roughly 100 useful conversations.

## Scraping details

- Instagram: Apify public profile scraper using the username, collecting bio and up to 12 recent public posts/captions. An optional second public-profile actor (`APIFY_INSTAGRAM_FALLBACK_ACTOR`) provides free-tier failover. Private, missing, and empty results produce a clear failure.
- LinkedIn: `data-slayer/linkedin-profile-scraper`, a low-cost Apify profile actor that accepts `linkedin_urls` without login cookies and returns public headline, about, experience, education, and skills.
- The same two sources are the only inputs. URLs are canonicalized, `raw_data` stores each source, and repeat submissions copy an existing matching pair from Supabase instead of spending scraper credits again.
- If LinkedIn blocks a request, `/api/people/[id]/paste` accepts public profile text and queues analysis. Gemini is primary; Groq is automatic fallback.

## Matching and judgment

Profiles include needs, hobbies, interests, values, voice, lifestyle, deal breakers, confidence, and mandatory source evidence for all 12 major field groups. Agents stay within known facts during a 12-turn date that includes follow-ups, a genuine trade-off, respectful repair, and independent private reflections. The judge cites transcript turns while scoring interest, chemistry, values, lifestyle and red flags from both sides; the overall judgment is derived deterministically from those components. Rankings use 55% confidence-adjusted personal judgment, 25% confidence-adjusted mutual judgment and 20% profile similarity, with red flags subtracting up to 10 points gradually. When both free LLM providers rate-limit, deterministic evidence-grounded profile, embedding, conversation and judgment fallbacks keep the run moving; completed work remains cached.

`final = .55 × confidence-adjusted self judgment + .25 × confidence-adjusted mutual judgment + .20 × similarity − the larger 0–10 red-flag score`.

## Safety and privacy

Public data only. The analyst is prohibited from inferring sexual orientation, religion, health, or politics. Dating preference is optional and absence is treated as preference-neutral. All analysis is AI-generated and may be wrong. Configure `REMOVAL_CONTACT` for removal requests.

## Verification

```bash
npm test
npm run build
```

The seed URLs require manual re-verification immediately before a public launch because social handles and profile URLs change.
