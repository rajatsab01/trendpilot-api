import fetch from "node-fetch";
import { z } from "zod";
import { getPromptLang } from "./translations";
import { getOfflineExplanatoryNotes } from "./standardDisclaimer";
import { getOfflineNarratives } from "./offlineNarratives";
import { fetchExchangeRates, convertCurrencyWithRate } from "./currencyConverter";
import { getExchangeCurrency, isForexPair } from "./symbolValidator";
import { computeIndicatorsFromCandles } from "./technicalIndicators";
import { AnalysisUnavailableError } from "./analysisErrors";

/** Deterministic small spread per symbol (not security-sensitive). */
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Probability/confidence for offline / quota-exhausted analysis.
 * The previous formula used `macd * 80`, which dominated and often forced
 * `Math.max(42, raw)` — so many instruments showed the same ~42% "success" bar.
 */
function inferOfflineRecommendation(
  rsiN: number,
  macdN: number,
  stochN: number,
): { recommendation: "BUY" | "SELL"; sentiment: "Bullish" | "Bearish" } {
  if (rsiN > 58 && macdN <= 0 && stochN > 55) {
    return { recommendation: "SELL", sentiment: "Bearish" };
  }
  if (rsiN < 42 && macdN >= 0 && stochN < 45) {
    return { recommendation: "BUY", sentiment: "Bullish" };
  }
  if (rsiN > 55 && macdN < 0) {
    return { recommendation: "SELL", sentiment: "Bearish" };
  }
  if (rsiN < 48 && macdN > 0) {
    return { recommendation: "BUY", sentiment: "Bullish" };
  }
  // Avoid defaulting everything to BUY when indicators are neutral
  if (macdN < 0 && rsiN >= 50) {
    return { recommendation: "SELL", sentiment: "Bearish" };
  }
  if (macdN > 0 && rsiN <= 50) {
    return { recommendation: "BUY", sentiment: "Bullish" };
  }
  return rsiN >= 50
    ? { recommendation: "SELL", sentiment: "Bearish" }
    : { recommendation: "BUY", sentiment: "Bullish" };
}

function offlineProbabilityAndConfidence(
  recommendation: "BUY" | "SELL",
  rsiN: number,
  macdN: number,
  stochN: number,
  bbN: number,
  livePrice: number,
  symbol: string,
): { probabilityScore: number; confidence: number } {
  const lp = Math.abs(livePrice) > 0 ? Math.abs(livePrice) : 1;
  const macdDenom = lp * 0.0002 + Math.abs(macdN) * 0.15 + 1e-9;
  const macdScaled = Math.tanh(macdN / macdDenom);

  const rsiEdge = recommendation === "BUY" ? 50 - rsiN : rsiN - 50;
  const bbEdge = recommendation === "BUY" ? 50 - bbN : bbN - 50;
  const stochEdge = recommendation === "BUY" ? 50 - stochN : stochN - 50;

  const macdEdge = recommendation === "BUY" ? macdScaled : -macdScaled;

  const raw =
    52 +
    rsiEdge * 0.32 +
    bbEdge * 0.14 +
    stochEdge * 0.12 +
    macdEdge * 16 +
    ((hashSeed(symbol.toUpperCase()) % 11) - 5);

  const probabilityScore = Math.round(Math.min(88, Math.max(36, raw)));
  const jitter = (hashSeed(`${symbol}:conf`) % 9) - 4;
  const confidence = Math.min(90, Math.max(48, probabilityScore + jitter));
  return { probabilityScore, confidence };
}

/** Remove legacy "(Analysis in English)" / "(Analysis in …)" prefixes models or fallbacks may emit */
function stripAnalysisMetaPrefix(s: unknown): string {
  if (s == null || typeof s !== "string") return "";
  let t = s.trim();
  for (let i = 0; i < 4; i++) {
    const next = t.replace(/^\(Analysis in [^)]+\)\s*/i, "").replace(/^\(English\)\s*/i, "").trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/** Widen/narrow bracket distances by trade horizon so scalping ≠ daily (LLMs often repeat similar % moves). */
function scaleBracketLevelsForDuration(
  data: any,
  duration: "scalping" | "swing" | "short_term" | "long_term",
  side: "BUY" | "SELL"
) {
  const e = Number(data.entry);
  const sl = Number(data.stopLoss);
  const tp3 = Number(data.tp3);
  const tp1 = Number(data.tp1);
  const tp2 = Number(data.tp2);
  const tp = Number(data.takeProfit);
  if (!Number.isFinite(e) || !Number.isFinite(sl)) return;

  const rewardRef = Number.isFinite(tp3) && Math.abs(tp3 - e) > 1e-12 ? tp3 : Number.isFinite(tp) ? tp : NaN;
  if (!Number.isFinite(rewardRef)) return;

  const riskDist = side === "BUY" ? Math.abs(e - sl) : Math.abs(sl - e);
  const rewardDist = side === "BUY" ? Math.abs(rewardRef - e) : Math.abs(e - rewardRef);
  if (riskDist < 1e-12 || rewardDist < 1e-12) return;

  const riskMult: Record<string, number> = {
    scalping: 0.42,
    swing: 0.66,
    short_term: 1.0,
    long_term: 1.52,
  };
  const rewardMult: Record<string, number> = {
    scalping: 0.5,
    swing: 0.74,
    short_term: 1.0,
    long_term: 1.68,
  };

  const rm = riskMult[duration] ?? 1;
  const tm = rewardMult[duration] ?? 1;

  const newRisk = riskDist * rm;
  const newReward = rewardDist * tm;

  if (side === "BUY") {
    data.stopLoss = e - newRisk;
    const tBase = e + newReward;
    data.tp3 = tBase;
    data.takeProfit = tBase;
    const f1 = (tp1 - e) / rewardDist;
    const f2 = (tp2 - e) / rewardDist;
    data.tp1 = e + newReward * (Number.isFinite(f1) ? Math.min(Math.max(f1, 0.08), 0.92) : 1 / 3);
    data.tp2 = e + newReward * (Number.isFinite(f2) ? Math.min(Math.max(f2, 0.12), 0.96) : 2 / 3);
  } else {
    data.stopLoss = e + newRisk;
    const tBase = e - newReward;
    data.tp3 = tBase;
    data.takeProfit = tBase;
    const f1 = (e - tp1) / rewardDist;
    const f2 = (e - tp2) / rewardDist;
    data.tp1 = e - newReward * (Number.isFinite(f1) ? Math.min(Math.max(f1, 0.08), 0.92) : 1 / 3);
    data.tp2 = e - newReward * (Number.isFinite(f2) ? Math.min(Math.max(f2, 0.12), 0.96) : 2 / 3);
  }
}

/** After RR boost moves takeProfit, keep tp1–tp3 on the same ray from entry. */
function syncTakeProfitLevelsWithPrimaryTakeProfit(
  data: any,
  previousTakeProfit: number,
  side: "BUY" | "SELL"
) {
  const e = Number(data.entry);
  const newTp = Number(data.takeProfit);
  if (
    !Number.isFinite(e) ||
    !Number.isFinite(newTp) ||
    !Number.isFinite(previousTakeProfit) ||
    Math.abs(newTp - previousTakeProfit) < 1e-9
  ) {
    return;
  }

  const ratio =
    side === "BUY"
      ? previousTakeProfit - e !== 0
        ? (newTp - e) / (previousTakeProfit - e)
        : 1
      : e - previousTakeProfit !== 0
        ? (e - newTp) / (e - previousTakeProfit)
        : 1;

  if (!Number.isFinite(ratio) || ratio <= 0) return;

  const t1 = Number(data.tp1);
  const t2 = Number(data.tp2);
  const t3 = Number(data.tp3);

  if (side === "BUY") {
    data.tp1 = e + (t1 - e) * ratio;
    data.tp2 = e + (t2 - e) * ratio;
    data.tp3 = e + (t3 - e) * ratio;
  } else {
    data.tp1 = e - (e - t1) * ratio;
    data.tp2 = e - (e - t2) * ratio;
    data.tp3 = e - (e - t3) * ratio;
  }
}

function recomputeSupportResistanceLevelsFromBrackets(data: any) {
  const e = Number(data.entry);
  const sl = Number(data.stopLoss);
  const tp = Number(data.takeProfit);
  if (!Number.isFinite(e) || !Number.isFinite(sl) || !Number.isFinite(tp)) return;
  if (data.recommendation !== "BUY" && data.recommendation !== "SELL") return;

  const isBuy = data.recommendation === "BUY";
  const riskDist = isBuy ? e - sl : sl - e; // positive
  const rewardDist = isBuy ? tp - e : e - tp; // positive

  if (riskDist <= 0 || rewardDist <= 0) return;

  if (isBuy) {
    // s1..s3 bracket the risk distance; r1..r3 bracket the reward distance.
    data.s1 = e - riskDist * 0.5;
    data.s2 = e - riskDist * 1.0;
    data.s3 = e - riskDist * 1.5;
    data.r1 = e + rewardDist * (1 / 6);
    data.r2 = e + rewardDist * (1 / 3);
    data.r3 = e + rewardDist * (1 / 2);
  } else {
    // For SELL, levels invert around the entry.
    data.s1 = e + riskDist * 0.5;
    data.s2 = e + riskDist * 1.0;
    data.s3 = e + riskDist * 1.5;
    data.r1 = e - rewardDist * (1 / 6);
    data.r2 = e - rewardDist * (1 / 3);
    data.r3 = e - rewardDist * (1 / 2);
  }
}

const aiNumber = z.preprocess(
  (v) => (typeof v === "string" ? Number(v) : v),
  z.number().finite(),
);

const aiResponseSchema = z.object({
  correctedSymbol: z.string().min(1),
  assetName: z.string().min(1),
  marketType: z.string().min(1),
  livePrice: aiNumber,
  candleClosePrice: aiNumber,
  recommendation: z.enum(["BUY", "SELL"]),
  confidence: aiNumber,
  sentiment: z.enum(["Bullish", "Bearish"]),
  marketSentiment: z.string(),
  newsHighlights: z.string(),
  deepAnalysis: z.string(),
  analysis: z.string(),
  rsi: aiNumber,
  macd: aiNumber,
  stochastic: aiNumber,
  bollingerBands: aiNumber,
  entry: aiNumber,
  takeProfit: aiNumber,
  stopLoss: aiNumber,
  tp1: aiNumber,
  tp2: aiNumber,
  tp3: aiNumber,
  s1: aiNumber,
  s2: aiNumber,
  s3: aiNumber,
  r1: aiNumber,
  r2: aiNumber,
  r3: aiNumber,
  trailingStopStrategy: z.string(),
  probabilityScore: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().min(0).max(100),
  ),
  explanatoryNotes: z.string(),
});

function buildOfflineAiPayload(
  symbol: string,
  market: "stock" | "commodity" | "forex" | "cryptocurrency",
  priceData: OHLCVData,
  langCode: string,
) {
  const ci = computeIndicatorsFromCandles(priceData.historicalCandles);
  const rsiN = ci?.rsi ? parseFloat(ci.rsi) : 50;
  const macdN = ci?.macd ? parseFloat(ci.macd) : 0;
  const stochN = ci?.stochastic ? parseFloat(ci.stochastic) : 50;
  const bbPct = ci?.bollingerBands?.match(/^%B ([\d.-]+)/)?.[1];
  const bbN = bbPct ? parseFloat(bbPct) : 50;
  const { recommendation, sentiment } = inferOfflineRecommendation(rsiN, macdN, stochN);
  const lp = priceData.livePrice;
  const mult = recommendation === "BUY" ? 1 : -1;
  const { probabilityScore: prob, confidence: conf } = offlineProbabilityAndConfidence(
    recommendation,
    rsiN,
    macdN,
    stochN,
    bbN,
    lp,
    symbol,
  );
  const offline = getOfflineNarratives(langCode, {
    timeframe: priceData.timeframe,
    symbol,
    recommendation,
    sentiment,
    bbN,
    macdN,
    mult,
  } as any);

  return aiResponseSchema.parse({
    correctedSymbol: symbol,
    assetName: symbol,
    marketType: market,
    livePrice: priceData.livePrice,
    candleClosePrice: priceData.candleClosePrice,
    recommendation,
    confidence: conf,
    sentiment,
    marketSentiment: offline.marketSentiment,
    newsHighlights: offline.newsHighlights,
    deepAnalysis: offline.deepAnalysis,
    analysis: offline.analysis,
    rsi: rsiN,
    macd: macdN,
    stochastic: stochN,
    bollingerBands: bbN,
    entry: lp * (1 + mult * 0.005),
    takeProfit: lp * (1 + mult * 0.12),
    stopLoss: lp * (1 - mult * 0.04),
    tp1: lp * (1 + mult * 0.04),
    tp2: lp * (1 + mult * 0.08),
    tp3: lp * (1 + mult * 0.12),
    s1: lp * (1 - mult * 0.02),
    s2: lp * (1 - mult * 0.04),
    s3: lp * (1 - mult * 0.06),
    r1: lp * (1 + mult * 0.02),
    r2: lp * (1 + mult * 0.04),
    r3: lp * (1 + mult * 0.06),
    trailingStopStrategy: offline.trailingStopStrategy,
    probabilityScore: prob,
    explanatoryNotes: getOfflineExplanatoryNotes(langCode),
  });
}

function wrapOfflineRawChoiceJson(payload: z.infer<typeof aiResponseSchema>) {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify(payload),
        },
      },
    ],
  };
}

export interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVData {
  symbol: string;
  livePrice: number;
  candleClosePrice: number;
  candleCloseTime: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  dataSource: string;
  historicalCandles: CandleData[];
  /** Minutes per bar (5, 15, 240, 1440) — aligns UI + AI with fetched data */
  candleIntervalMinutes: number;
  /** Number of closed candles used for indicators */
  analysisBarCount: number;
  /** Next bar close in same format as candleCloseTime */
  nextCandleCloseTime: string;
}

export interface MarketAnalysisResult {
  recommendation: "BUY" | "SELL";
  confidence: number;
  sentiment: "Bullish" | "Bearish";
  marketSentiment: string;
  deepAnalysis: string;
  analysis: string;
  correctedSymbol: string;
  assetName: string;
  marketType: string;
  currentPrice: string;
  livePrice: string;
  candleClosePrice: string;
  priceSource: string;
  sourceCurrency: string;
  exchangeRate: string | null;
  candleCloseTime?: string;
  timeframe?: string;
  nextCandleCloseTime?: string;
  instrumentName: string | null;
  indicators: { rsi: string; macd: string; stochastic: string; bollingerBands: string };
  bracketOrder: { entry: string; takeProfit: string; stopLoss: string };
  takeProfitLevels: { tp1: string; tp2: string; tp3: string };
  supportLevels: { s1: string; s2: string; s3: string };
  resistanceLevels: { r1: string; r2: string; r3: string };
  trailingStopStrategy: string;
  probabilityScore: number;
  explanatoryNotes: string;
  /** Recent news / macro / sentiment (web-backed when API available) */
  newsHighlights: string;
}

export async function analyzeMarketWithPerplexity(
  symbol: string,
  duration: "scalping" | "swing" | "short_term" | "long_term",
  market: "stock" | "commodity" | "forex" | "cryptocurrency",
  language: string,
  priceData: OHLCVData,
  currency = "USD",
  exchange?: string
): Promise<MarketAnalysisResult> {
  const allowOffline = process.env.PERPLEXITY_ALLOW_OFFLINE_FALLBACK === "true";

  const { code: langCode, name: langName } = getPromptLang(language);
  const promptLanguageName = langName || "English";

  const dec = market === "forex" ? 4 : 2;
  const nextClose = priceData.nextCandleCloseTime;

  const durationDesc = {
    scalping: "5-minute (scalping)",
    swing: "15-minute (swing)",
    short_term: "4-hour (short-term)",
    long_term: "daily (long-term)",
  }[duration];

  const curSymbol =
    currency === "USD" ? "$" :
    currency === "INR" ? "₹" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    currency === "JPY" ? "¥" : currency;

  // ✅ Debug trace
  console.log(`🌍 [Perplexity] Received language for analysis: ${promptLanguageName}`);

  // Specialized context for different markets and durations
  const marketSpecifics = {
    stock: "Focus on sector trends, earnings impact, and institutional volume.",
    commodity: "Analyze global supply-demand, geopolitical risks, and storage reports.",
    forex: "Consider interest rate differentials, inflation data, and central bank sentiment.",
    cryptocurrency: "Examine on-chain volume, liquidity pools, and whale movements.",
  }[market] || "";

  const durationSpecifics = {
    scalping: "Focus on 5-minute structure. Momentum, micro support/resistance. Targets: 0.5-1.5% moves; tight stops.",
    short_term: "Focus on 4-hour trends and swing points within the multi-week window. Targets: roughly 2-6% moves.",
    swing: "Focus on 15-minute structure for multi-day swings. Targets: roughly 3-8% moves.",
    long_term: "Focus on daily regime, major levels, and fundamentals/news backdrop. Targets: roughly 10-25% moves.",
  }[duration] || "";

  const computedInd = computeIndicatorsFromCandles(priceData.historicalCandles);
  const bollingerPctForModel =
    computedInd?.bollingerBands.match(/^%B ([\d.-]+)/)?.[1] ?? "";
  const indicatorBlock =
    computedInd && computedInd.rsi
      ? `
PRECOMPUTED INDICATORS from the candle series — copy these EXACT numbers into JSON fields rsi, macd, stochastic, bollingerBands:
rsi=${computedInd.rsi}, macd=${computedInd.macd}, stochastic=${computedInd.stochastic}, bollingerBands=${bollingerPctForModel || "50"}

Narrative fields must agree with these values. recommendation, sentiment, confidence, and probabilityScore must reflect this specific symbol and these numbers — avoid generic templates that repeat across different tickers.
`.trim()
      : "";

  // Prompt to Perplexity
  const prompt = `
You are TrendPilot Analyzer — an expert quantitative analyst.
Analyze ${symbol} (${market}) for ${durationDesc} horizon.

MARKET CONTEXT: ${marketSpecifics}
STRATEGY GUIDELINE: ${durationSpecifics}

DATA BASIS: ${priceData.analysisBarCount} closed ${priceData.timeframe} candles from ${priceData.dataSource}. Last bar aligns with the OHLC below — use these prices for levels; do not replace them with web quotes.

All prices in ${currency}. Express every output field in ${promptLanguageName} language only — do not use English or mixed text.

NEWS & SENTIMENT: Use web search for recent headlines, flows, or events affecting this symbol or issuer (last day to week). Summarize in "newsHighlights". Keep tone factual and concise. Do not tell users to leave the app or use other websites for news — the product already shows a legal disclaimer elsewhere.

REWARD-TO-RISK (BRACKET MATH):
- Set entry, stopLoss, takeProfit, tp1, tp2, tp3 so the plan is coherent for ${duration}.
- Prefer reward:risk to the primary target (takeProfit / tp3) of at least 1:3 when structure allows.
- If momentum, volatility, or levels justify a larger extension, use a higher RR (e.g. 1:4 to 1:10+); do not artificially cap at 1:3 when the chart clearly supports a wider target — the app only widens targets that fall below 1:3, never shrinks a stronger plan.
For ${duration}, ${duration === "scalping" ? "keep stops tight; partials at tp1/tp2 should match realistic micro swings." : "allow room for volatility; partials should ladder toward the main thesis."}

DATA SNAPSHOT:
Live: ${curSymbol}${priceData.livePrice.toFixed(dec)} | Close: ${curSymbol}${priceData.candleClosePrice.toFixed(dec)}
O:${priceData.open}  H:${priceData.high}  L:${priceData.low}  C:${priceData.close}  V:${priceData.volume}
Close Time: ${priceData.candleCloseTime}  |  Next bar closes: ${nextClose}
${indicatorBlock ? `\n${indicatorBlock}\n` : ""}

VOICE & STRUCTURE (critical):
- Style: professional desk research note — concrete prices in ${currency}, no markdown, no raw URLs, no filler clichés.
- Ban vague one-liners (e.g. "structure favors buyers" with no level). Every paragraph must cite specific prices, zones, or indicator readings from the snapshot or precomputed values.
- FORMAT: In marketSentiment, newsHighlights, deepAnalysis, and analysis, use two newline characters between paragraphs (blank line) so the UI can show readable blocks. Each field should contain multiple paragraphs, not a single wall of text.
- marketSentiment: 5–8 sentences in 2–3 paragraphs — trend vs range, where price sits vs snapshot high/low/close, what would shift bias; use DATA SNAPSHOT numbers. No generic disclaimer tone.
- newsHighlights: 5–9 sentences in 2–3 paragraphs — recent drivers, flows, scheduled events, what traders are watching; factual. No "check other websites" language.
- deepAnalysis: 8–14 sentences in 3–4 paragraphs — (1) structure & key levels from OHLC, (2) momentum & indicator story: quote PRECOMPUTED rsi, macd, stochastic, bollingerBands exactly and tie to bias + failure modes, (3) how tp1/tp2/tp3 ladder relates to partial profit-taking, (4) invalidation vs entry/stop in ${promptLanguageName}.
- analysis: 6–10 sentences in 3–4 paragraphs — (1) clear thesis and time horizon, (2) evidence chain linking price + indicators + news context, (3) bull vs bear scenario with triggers, (4) explicit invalidation: which level breaks the trade and why, referencing entry/stop/tp3. Must be substantive, not a summary of deepAnalysis.
- trailingStopStrategy: 4–7 sentences — after TP1 (breakeven rule), how to trail (structure-based), when to tighten vs when to hold, optional partial at TP2.
- explanatoryNotes: 3–5 sentences — execution realism only (spreads, gaps, session liquidity, event risk). No legal boilerplate.
- NEVER start any string with "(Analysis in …)", "(English)", language names in parentheses, or JSON schema hints — only trader-facing prose in ${promptLanguageName}.

Return strictly JSON (no markdown, no explanation). All narrative strings must be fully in ${promptLanguageName}:
{
 "correctedSymbol": "...",
 "assetName": "...",
 "marketType": "${market}",
 "livePrice": "${priceData.livePrice.toFixed(dec)}",
 "candleClosePrice": "${priceData.candleClosePrice.toFixed(dec)}",
 "recommendation": "BUY" | "SELL",
 "confidence": 1-100,
 "sentiment": "Bullish" | "Bearish",
 "marketSentiment": "string: 5–8 sentences, 2–3 paragraphs (use \\n\\n between paragraphs)",
 "newsHighlights": "string: 5–9 sentences, 2–3 paragraphs; drivers, flows, catalysts; no URLs",
 "deepAnalysis": "string: 8–14 sentences, 3–4 paragraphs; structure, indicators (exact precomputed rsi/macd/stochastic/%B), laddering, invalidation",
 "analysis": "string: 6–10 sentences, 3–4 paragraphs; thesis, evidence, scenarios, explicit invalidation vs brackets",
 "rsi": number, "macd": number, "stochastic": number, "bollingerBands": number,
 "entry": number, "takeProfit": number, "stopLoss": number,
 "tp1": number, "tp2": number, "tp3": number,
 "s1": number, "s2": number, "s3": number,
 "r1": number, "r2": number, "r3": number,
 "trailingStopStrategy": "string: 4–7 sentences — breakeven after TP1, trail logic, when to tighten",
 "probabilityScore": 1-100,
 "explanatoryNotes": "string: 3–5 sentences — execution only (liquidity, gaps, events); no legal boilerplate"
}
`.trim();

  const searchRecency =
    duration === "scalping" || duration === "short_term" ? "day" : "week";

  let raw: any;
  if (!process.env.PERPLEXITY_API_KEY) {
    if (!allowOffline) {
      throw new AnalysisUnavailableError();
    }
    console.log("🛠️ [Perplexity] PERPLEXITY_ALLOW_OFFLINE_FALLBACK: missing API key — dev offline payload");
    const payload = buildOfflineAiPayload(symbol, market, priceData, langCode);
    raw = wrapOfflineRawChoiceJson(payload);
  } else {
    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          temperature: 0.25,
          top_p: 0.9,
          search_recency_filter: searchRecency,
          messages: [
            {
              role: "system",
              content: `
You are TrendPilot Analyzer.

LANGUAGE RULES:
- Write all analysis text (marketSentiment, newsHighlights, deepAnalysis, analysis, trailingStopStrategy, explanatoryNotes)
  fully in ${promptLanguageName}.
- Do NOT include English translations or mixed text (unless ${promptLanguageName} is English).
- Never prefix those fields with "(Analysis in …)", "(English)", or similar — output only trader-facing sentences.
- Use natural sentence/paragraph structure for that locale; keep numbers and instrument codes readable (thin spaces or locale conventions OK).

RESPONSE RULES:
- Return ONLY one valid JSON object.
- Do not include markdown, explanations, or code fences.
- Numeric fields (rsi, macd, stochastic, bollingerBands, entry, stops, targets) must match the precomputed + snapshot data; narratives must not contradict those numbers.
- In narrative fields, use literal newline pairs between paragraphs (encode as \\n in JSON if needed) so multi-paragraph text displays clearly.
          `.trim(),
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`❌ [Perplexity] API Error ${response.status}: ${errorText}`);
        if (
          allowOffline &&
          (response.status === 401 || response.status === 403 || response.status === 429)
        ) {
          console.log(
            `⚠️ [Perplexity] Quota/Auth (${response.status}) — PERPLEXITY_ALLOW_OFFLINE_FALLBACK dev offline payload`,
          );
          const payload = buildOfflineAiPayload(symbol, market, priceData, langCode);
          raw = wrapOfflineRawChoiceJson(payload);
        } else {
          throw new AnalysisUnavailableError();
        }
      } else {
        raw = await response.json();
      }
    } catch (err: unknown) {
      if (err instanceof AnalysisUnavailableError) throw err;
      console.error("❌ [Perplexity] Request failed:", err);
      if (allowOffline) {
        console.log("🛠️ [Perplexity] PERPLEXITY_ALLOW_OFFLINE_FALLBACK: network/error — dev offline payload");
        const payload = buildOfflineAiPayload(symbol, market, priceData, langCode);
        raw = wrapOfflineRawChoiceJson(payload);
      } else {
        throw new AnalysisUnavailableError();
      }
    }
  }

  let data: any;
  try {
    const txt = String(raw?.choices?.[0]?.message?.content ?? "").trim();

    // Extract the first JSON object from the response.
    const s = txt.indexOf("{"),
      e = txt.lastIndexOf("}");
    if (s === -1 || e === -1) throw new Error("JSON_NOT_FOUND");

    const jsonText = txt.slice(s, e + 1);
    const parsed = JSON.parse(jsonText);
    data = aiResponseSchema.parse(parsed);
  } catch (parseErr: any) {
    console.error(
      "❌ [Perplexity] JSON Parse/Schema Error:",
      parseErr?.message,
      raw?.choices?.[0]?.message?.content,
    );
    if (!allowOffline) {
      throw new AnalysisUnavailableError();
    }
    console.log("🛠️ [Perplexity] PERPLEXITY_ALLOW_OFFLINE_FALLBACK: parse/schema — dev offline payload");
    data = buildOfflineAiPayload(symbol, market, priceData, langCode);
  }

  const narrativeKeys = [
    "marketSentiment",
    "newsHighlights",
    "deepAnalysis",
    "analysis",
    "trailingStopStrategy",
    "explanatoryNotes",
  ] as const;
  for (const k of narrativeKeys) {
    if (typeof (data as any)[k] === "string") {
      (data as any)[k] = stripAnalysisMetaPrefix((data as any)[k]);
    }
  }

  if (data.recommendation === "BUY" || data.recommendation === "SELL") {
    scaleBracketLevelsForDuration(data, duration, data.recommendation);
  }

  // Authoritative indicators from real candles (LLMs often repeat generic values)
  if (computedInd && computedInd.rsi) {
    data.rsi = parseFloat(computedInd.rsi);
    if (computedInd.macd) data.macd = parseFloat(computedInd.macd);
    if (computedInd.stochastic) data.stochastic = parseFloat(computedInd.stochastic);
    if (bollingerPctForModel) data.bollingerBands = parseFloat(bollingerPctForModel);
  }

  // RR: enforce minimum 1:3 reward:risk to primary TP only when the model proposed weaker math.
  // If the model already targets ≥1:3, levels are left as-is so the UI shows the actual (often higher) ratio.
  const rr = (entry: number, tp: number, sl: number, side: "BUY" | "SELL") => {
    const risk = side === "BUY" ? entry - sl : sl - entry;
    const reward = side === "BUY" ? tp - entry : entry - tp;
    return risk > 0 ? reward / risk : 0;
  };
  const tpBeforeRrBoost = Number(data.takeProfit);
  let rrVal = rr(Number(data.entry), Number(data.takeProfit), Number(data.stopLoss), data.recommendation);

  if (rrVal < 3) {
    const factor = 3 / rrVal;
    if (data.recommendation === "BUY") data.takeProfit = Number(data.entry) + (Number(data.takeProfit) - Number(data.entry)) * factor;
    else data.takeProfit = Number(data.entry) - (Number(data.entry) - Number(data.takeProfit)) * factor;
    rrVal = rr(Number(data.entry), Number(data.takeProfit), Number(data.stopLoss), data.recommendation);
    if (Math.abs(Number(data.takeProfit) - tpBeforeRrBoost) > 1e-9) {
      syncTakeProfitLevelsWithPrimaryTakeProfit(data, tpBeforeRrBoost, data.recommendation);
    }
  }

  // Ensure support/resistance levels follow the same final duration-adjusted brackets.
  // This prevents mismatches where s/r look inconsistent for scalping vs long-term.
  recomputeSupportResistanceLevelsFromBrackets(data);

  // currency conversion
  const detected = data.marketType;
  const srcCur = getExchangeCurrency(data.correctedSymbol, detected);
  const isFx = detected === "forex" || isForexPair(data.correctedSymbol);
  const sameCur = !isFx && srcCur === currency;

  const fx = (v: any) => Number(v).toFixed(4);
  const fi = (v: any) => Number(v).toFixed(2);
  let rateShow: string | null = null;
  let conv = (v: any) => fi(v);

  if (isFx) conv = fx;
  else if (!sameCur) {
    const rates = await fetchExchangeRates(srcCur);
    const r = rates?.rates?.[currency] ?? 1;
    rateShow = r.toFixed(2);
    conv = (v: any) => fi(convertCurrencyWithRate(Number(v), r));
  }

  const fmt = (v: any) => (isFx ? fx(v) : conv(v));

  return {
    recommendation: data.recommendation,
    confidence: Number(data.confidence) || 0,
    sentiment: data.sentiment,
    marketSentiment: stripAnalysisMetaPrefix(data.marketSentiment),
    newsHighlights: stripAnalysisMetaPrefix(data.newsHighlights),
    deepAnalysis: stripAnalysisMetaPrefix(data.deepAnalysis),
    analysis: stripAnalysisMetaPrefix(data.analysis),
    correctedSymbol: data.correctedSymbol,
    assetName: data.assetName,
    marketType: detected,
    currentPrice: fmt(data.candleClosePrice),
    livePrice: fmt(data.livePrice),
    candleClosePrice: fmt(data.candleClosePrice),
    priceSource: priceData.dataSource,
    sourceCurrency: srcCur,
    exchangeRate: isFx || sameCur ? null : rateShow,
    candleCloseTime: priceData.candleCloseTime,
    timeframe: priceData.timeframe,
    nextCandleCloseTime: nextClose,
    instrumentName: data.assetName,
    indicators: {
      rsi: computedInd?.rsi || String(data.rsi ?? ""),
      macd: computedInd?.macd || String(data.macd ?? ""),
      stochastic: computedInd?.stochastic || String(data.stochastic ?? ""),
      bollingerBands: computedInd?.bollingerBands || String(data.bollingerBands ?? ""),
    },
    bracketOrder: {
      entry: fmt(data.entry),
      takeProfit: fmt(data.takeProfit),
      stopLoss: fmt(data.stopLoss),
    },
    takeProfitLevels: {
      tp1: fmt(data.tp1),
      tp2: fmt(data.tp2),
      tp3: fmt(data.tp3),
    },
    supportLevels: {
      s1: fmt(data.s1),
      s2: fmt(data.s2),
      s3: fmt(data.s3),
    },
    resistanceLevels: {
      r1: fmt(data.r1),
      r2: fmt(data.r2),
      r3: fmt(data.r3),
    },
    trailingStopStrategy: stripAnalysisMetaPrefix(data.trailingStopStrategy),
    probabilityScore: Number(data.probabilityScore) || 0,
    explanatoryNotes: stripAnalysisMetaPrefix(data.explanatoryNotes),
  };
}
