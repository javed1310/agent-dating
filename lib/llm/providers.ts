type Message = { role: "user" | "assistant"; content: string };
type Input = { system: string; messages: Message[] };

class ProviderError extends Error {
  constructor(public provider: string, public status: number, message: string, public retryAfter = 0) {
    super(message);
  }
}

const cooldown: Record<string, number> = { gemini: 0, groq: 0 };
const lastCall: Record<string, number> = { gemini: 0, groq: 0 };
const buckets: Record<string, { tokens: number; capacity: number; refillPerMs: number; updated: number }> = {
  gemini: { tokens: 2, capacity: 2, refillPerMs: 1 / 1500, updated: Date.now() },
  groq: { tokens: 2, capacity: 2, refillPerMs: 1 / 1200, updated: Date.now() },
};
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pace(provider: string, minGap = 350) {
  const bucket = buckets[provider], now = Date.now();
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + (now - bucket.updated) * bucket.refillPerMs);
  bucket.updated = now;
  const tokenDelay = bucket.tokens >= 1 ? 0 : (1 - bucket.tokens) / bucket.refillPerMs;
  const delay = Math.max(0, lastCall[provider] + minGap - now, cooldown[provider] - now, tokenDelay);
  if (delay) await wait(Math.min(delay, 1500));
  const after = Date.now();
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + (after - bucket.updated) * bucket.refillPerMs);
  bucket.updated = after;
  bucket.tokens = Math.max(0, bucket.tokens - 1);
  lastCall[provider] = after;
}

async function apiError(response: Response, label: string) {
  try {
    const body = await response.json() as { error?: { message?: string }; message?: string };
    const detail = body.error?.message || body.message;
    return detail ? `${label} ${response.status}: ${detail.slice(0, 240)}` : `${label} ${response.status}`;
  } catch {
    return `${label} ${response.status}`;
  }
}

async function gemini(input: Input) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ProviderError("gemini", 503, "Gemini not configured");
  await pace("gemini");
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: input.system }] },
      contents: input.messages.map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    const retry = Number(response.headers.get("retry-after") || 0);
    if (response.status === 429) cooldown.gemini = Date.now() + Math.max(2000, retry * 1000);
    throw new ProviderError("gemini", response.status, await apiError(response, "Gemini"), retry);
  }
  const json = await response.json(), text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ProviderError("gemini", 502, "Gemini returned no content");
  return text as string;
}

async function groq(input: Input) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new ProviderError("groq", 503, "Groq not configured");
  await pace("groq");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      max_completion_tokens: 3000,
      messages: [{ role: "system", content: input.system }, ...input.messages],
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    const retry = Number(response.headers.get("retry-after") || 0);
    if (response.status === 429) cooldown.groq = Date.now() + Math.max(2000, retry * 1000);
    throw new ProviderError("groq", response.status, await apiError(response, "Groq"), retry);
  }
  const json = await response.json(), text = json.choices?.[0]?.message?.content;
  if (!text) throw new ProviderError("groq", 502, "Groq returned no content");
  return text as string;
}

export async function generate(input: Input) {
  const providers = Date.now() < cooldown.gemini ? [groq, gemini] : [gemini, groq];
  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return await provider(input);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Unknown provider error");
    }
  }
  throw new Error(`All LLM providers failed: ${errors.join(" | ")}`);
}
