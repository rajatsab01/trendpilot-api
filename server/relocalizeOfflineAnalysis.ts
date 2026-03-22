/**
 * When a user opens a saved analysis in a non-English UI, English offline-template
 * text persisted earlier should be rewritten using the same numbers (GET-time relocalization).
 */
import type { Analysis } from "@shared/schema";
import { getOfflineNarratives, type OfflineNarrativeCtx } from "./offlineNarratives";
import { normalizeLangCode } from "./translations";

export function isLikelyEnglishOfflineTemplate(
  a: Pick<Analysis, "marketSentiment" | "newsHighlights" | "deepAnalysis" | "analysis" | "trailingStopStrategy">,
): boolean {
  const ms = a.marketSentiment ?? "";
  const nh = a.newsHighlights ?? "";
  const da = a.deepAnalysis ?? "";
  const an = a.analysis ?? "";
  const tr = a.trailingStopStrategy ?? "";

  if (nh.includes("Headline feed offline")) return true;
  if (nh.includes("Headlines are not available while the live research service")) return true;
  if (nh.includes("Live headline search is unavailable in offline mode")) return true;
  if (nh.includes("live AI research service (Perplexity)")) return true;
  if (ms.includes("Bids leaning on tape")) return true;
  if (ms.includes("Offers leaning on this") && ms.includes("chart")) return true;
  if (nh.includes("trade off prints") || nh.includes("live wire")) return true;
  if (ms.includes("On this") && ms.includes("short-term tone looks mildly supportive")) return true;
  if (ms.includes("tone is cautious: Bollinger")) return true;
  if (da.includes("Using the") && da.includes("structure, Bollinger %B is about")) return true;
  if (an.includes("The model leans") && an.includes("using the bracket")) return true;
  if (tr.includes("After the first target, consider moving the stop toward breakeven")) return true;

  return false;
}

function parsePctBFromStored(bb: string | null | undefined, ms: string): number {
  const fromBb = bb?.match(/%B\s*[≈≃~]?\s*([\d.-]+)/i);
  if (fromBb) return parseFloat(fromBb[1]);
  const fromBb2 = bb?.match(/%B\s+([\d.-]+)/);
  if (fromBb2) return parseFloat(fromBb2[1]);
  const fromMs = ms.match(/%B\s*[≈≃~]?\s*([\d.-]+)/i);
  if (fromMs) return parseFloat(fromMs[1]);
  return 50;
}

function parseMacdFromStored(macd: string | null | undefined): number {
  const s = macd || "";
  const m = s.match(/-?\d+\.?\d*(?:e[+-]?\d+)?/i);
  return m ? parseFloat(m[0]) : 0;
}

function buildCtxFromAnalysis(a: Analysis): OfflineNarrativeCtx | null {
  const rec = a.recommendation?.toUpperCase();
  if (rec !== "BUY" && rec !== "SELL") return null;
  const sent = a.sentiment;
  if (sent !== "Bullish" && sent !== "Bearish") return null;

  const ms = a.marketSentiment ?? "";
  const bbN = parsePctBFromStored(a.bollingerBands, ms);
  const macdN = parseMacdFromStored(a.macd);
  const mult = rec === "BUY" ? 1 : -1;

  return {
    timeframe: a.timeframe || "15min",
    symbol: String(a.correctedSymbol || a.symbol || "").trim() || "?",
    recommendation: rec,
    sentiment: sent,
    bbN,
    macdN,
    mult,
  };
}

export function maybeRelocalizeStoredAnalysis(analysis: Analysis, rawLang: string | undefined): Analysis {
  if (!rawLang?.trim()) return analysis;
  const code = normalizeLangCode(rawLang);
  if (code === "en") return analysis;
  if (!isLikelyEnglishOfflineTemplate(analysis)) return analysis;
  const ctx = buildCtxFromAnalysis(analysis);
  if (!ctx) return analysis;
  const n = getOfflineNarratives(rawLang, ctx);
  return {
    ...analysis,
    marketSentiment: n.marketSentiment,
    newsHighlights: n.newsHighlights,
    deepAnalysis: n.deepAnalysis,
    analysis: n.analysis,
    trailingStopStrategy: n.trailingStopStrategy,
  };
}
