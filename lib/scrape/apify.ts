import { cached } from "@/lib/store/cache";

export type Sources = { linkedin: unknown; instagram: unknown };

async function actor(actorId: string, input: unknown) {
  const token = process.env.APIFY_TOKEN;
  if (!token || !actorId) throw new Error("Scraper is not configured");
  // Stay below the 30-second Vercel function limit so failures can be persisted
  // and presented to the user instead of leaving the job lease in `running`.
  const url = `https://api.apify.com/v2/acts/${actorId.replace("/", "~")}/run-sync-get-dataset-items?token=${token}&timeout=12`;
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: AbortSignal.timeout(14000) });
  if (!response.ok) throw new Error(`Scraper returned ${response.status}`);
  return response.json();
}

const first = (result: unknown) => Array.isArray(result) ? result[0] : result;
const missing = (result: unknown) => !first(result) || (typeof first(result) === "object" && Object.keys(first(result) as object).length === 0);
const privateInstagram = (result: unknown) => { const value = first(result) as { private?: boolean; isPrivate?: boolean } | undefined; return value?.private === true || value?.isPrivate === true; };

async function instagramProfile(url: string, username: string) {
  const primary = process.env.APIFY_INSTAGRAM_ACTOR || "apify/instagram-profile-scraper";
  try {
    const result = await actor(primary, { usernames: [username], resultsLimit: 12 });
    if (!missing(result) && !privateInstagram(result)) return result;
    if (privateInstagram(result)) throw new Error("This Instagram is private or not found");
  } catch (error) {
    const fallback = process.env.APIFY_INSTAGRAM_FALLBACK_ACTOR || "apify/instagram-scraper";
    if (!fallback || fallback === primary) throw error;
    const result = await actor(fallback, { usernames: [username], resultsLimit: 12, directUrls: [url] });
    if (!missing(result) && !privateInstagram(result)) return result;
  }
  throw new Error("This Instagram is private or not found");
}

export async function scrapeBoth(linkedinUrl: string, instagramUrl: string): Promise<Sources> {
  const username = new URL(instagramUrl).pathname.split("/").filter(Boolean)[0];
  if (!username) throw new Error("This Instagram is private or not found");
  const linkedinActor = process.env.APIFY_LINKEDIN_ACTOR || "data-slayer/linkedin-profile-scraper";
  const linkedinInput = linkedinActor.startsWith("data-slayer/") ? { linkedin_urls: [linkedinUrl] } : { profileUrls: [linkedinUrl] };
  const [instagram, linkedin] = await Promise.all([
    cached("instagram", instagramUrl, () => instagramProfile(instagramUrl, username)),
    cached("linkedin", linkedinUrl, () => actor(linkedinActor, linkedinInput)),
  ]);
  if (missing(instagram) || privateInstagram(instagram)) throw new Error("This Instagram is private or not found");
  if (missing(linkedin)) throw new Error("LinkedIn returned no public profile data. Paste the public profile text to continue.");
  return { instagram, linkedin };
}
