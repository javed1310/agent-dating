import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.RUN_ACCESS_SECRET || process.env.SUPABASE_SERVICE_KEY;
  if (!value) throw new Error("Run access signing is not configured");
  return value;
}

export function createRunToken(runId: string, personId: string) {
  return createHmac("sha256", secret()).update(`${runId}:${personId}`).digest("base64url");
}

export function verifyRunToken(request: Request, runId: string, personId: string) {
  const supplied = request.headers.get("x-run-token") || "";
  const expected = createRunToken(runId, personId);
  const left = Buffer.from(supplied), right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}
