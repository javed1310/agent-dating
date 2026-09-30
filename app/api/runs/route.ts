import { NextResponse } from "next/server";

// Runs must be created through /api/people so the creator receives a scoped
// access token. Keeping this legacy bulk endpoint disabled prevents callers
// from starting jobs for arbitrary existing person IDs.
export async function POST() {
  return NextResponse.json({ error: "Create a run through the profile form" }, { status: 410 });
}
