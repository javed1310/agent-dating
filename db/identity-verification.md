# Seed identity verification

Verified on 2026-09-29 using the returned identity fields from both configured Apify actors, followed by manual web review of every mismatch.

- 26/26 LinkedIn responses match the expected person name.
- 26/26 Instagram responses match the same expected person name.
- 26/26 Instagram accounts report `verified: true`.
- Six stale LinkedIn URLs were replaced and re-scraped: Reshma Saujani, Bozoma Saint John, Mindy Kaling, Emma Grede, Elaine Welteroth, and Hasan Minhaj.
- The previous six profiles and their affected dates were preserved in `.data/archive-identity-refresh` for recovery/audit.

The canonical pairs are maintained in `db/seed_people.csv`. Source content is cached separately by normalized URL hash in `.data/cache`; generated profiles and dates are never treated as identity-verification evidence.
