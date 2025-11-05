// server/pplx.ts
import fetch from "node-fetch";

export type PplxOptions = {
  apiKey?: string;
  model?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  /** set true to allow web browsing on pplx-*-online models */
  web?: boolean;
};

export async function askPerplexity(
  userPrompt: string,
  opts: PplxOptions = {}
): Promise<string> {
  const apiKey = opts.apiKey || process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("Missing PERPLEXITY_API_KEY");

  const model = opts.model || process.env.PERPLEXITY_MODEL || "pplx-70b-online";

  const body = {
    model,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1200,
    messages: [
      { role: "system", content: opts.system ?? "You are a concise market analyst. Use up-to-date web results if the model supports it. Give practical, bullet-point outputs first, then a short narrative. Keep numbers with units." },
      { role: "user", content: userPrompt }
    ],
    // For online models, this toggles web browsing (Perplexity enables it by default for *-online)
    // Some SDKs name this differently; the HTTP API accept this shape.
    // If Perplexity ignores it, it still works on *-online models.
    internet: opts.web ?? true
  };

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Perplexity ${res.status}: ${text || res.statusText}`);
  }

  const json = await res.json() as any;
  const content = json?.choices?.[0]?.message?.content?.trim?.();
  if (!content) throw new Error("Perplexity returned no content");
  return content;
}
