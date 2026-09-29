import "server-only";
import { db } from "@/lib/db/supabase";

type Profile = { career_stage?: string; location?: string; interests?: string[] };
type LinkedPerson = {
  id: string;
  name: string;
  status: string;
  linkedin_url: string;
  instagram_url: string;
  profiles?: { profile: Profile } | Array<{ profile: Profile }>;
};

export type LiveAgent = {
  runId: string;
  personId: string;
  name: string;
  role: string;
  location: string;
  interests: string[];
  dates: number;
  linkedinUrl: string;
  instagramUrl: string;
};

const identityKey = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return value.trim().toLowerCase().replace(/\/+$/, "");
  }
};

export async function getCompletedLiveAgents(
  existingPeople: Array<{ linkedin: string; instagram: string }> = [],
): Promise<LiveAgent[]> {
  const supabase = db();
  const { data: runs, error: runError } = await supabase
    .from("runs")
    .select("id,created_at")
    .eq("is_demo", false)
    .order("created_at", { ascending: false });
  if (runError || !runs?.length) return [];

  const runIds = runs.map((run) => run.id);
  const [{ data: links }, { data: dates }] = await Promise.all([
    supabase
      .from("run_people")
      .select("run_id,person_id,people(id,name,status,linkedin_url,instagram_url,profiles(profile))")
      .in("run_id", runIds),
    supabase.from("dates").select("run_id").in("run_id", runIds),
  ]);

  const dateCounts = new Map<string, number>();
  for (const date of dates || []) dateCounts.set(date.run_id, (dateCounts.get(date.run_id) || 0) + 1);
  const order = new Map(runs.map((run, index) => [run.id, index]));

  const agents = (links || []).flatMap((link) => {
    const person = link.people as unknown as LinkedPerson | null;
    const relatedProfile = person?.profiles;
    const profile = Array.isArray(relatedProfile)
      ? relatedProfile[0]?.profile
      : relatedProfile?.profile;
    if (!person || person.status !== "complete" || !profile) return [];
    return [{
      runId: link.run_id,
      personId: link.person_id,
      name: person.name,
      role: profile.career_stage || "Completed live agent",
      location: profile.location || "Location not stated",
      interests: profile.interests || [],
      dates: dateCounts.get(link.run_id) || 0,
      linkedinUrl: person.linkedin_url,
      instagramUrl: person.instagram_url,
    }];
  }).sort((a, b) => (order.get(a.runId) || 0) - (order.get(b.runId) || 0));

  const seen = new Set(existingPeople.flatMap((person) => [
    identityKey(person.linkedin),
    identityKey(person.instagram),
  ]));
  return agents.filter((agent) => {
    const keys = [identityKey(agent.linkedinUrl), identityKey(agent.instagramUrl)];
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}
