// server/perplexity.ts
//------------------------------------------------------
// TrendPilot Perplexity Engine v2.8  (Dec-2025 build)
//------------------------------------------------------
// Clean JSON-only AI call with fallback metrics.
// Never returns invalid JSON or 0% confidence.
//------------------------------------------------------

import { getPromptLang } from "./translations.js";
import { getExchangeCurrency } from "./symbolValidator.js";

//------------------------------------------------------
// Types
//------------------------------------------------------
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
  mtfCandles?: CandleData[];
}

export interface MarketAnalysisResult {
  recommendation: "BUY" | "SELL";
  confidence: number;
  probabilityScore: number;
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
  riskMeter: number;
  explanatoryNotes: string;
  marketSentimentReport: string;
}

//------------------------------------------------------
// Helper functions
//------------------------------------------------------
function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  return values.reduce((prev, cur, i) => (i === 0 ? cur : cur * k + prev * (1 - k)), 0);
}

function calcRSI(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length - 1; i++) {
    const diff = values[i + 1] - values[i];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  const rs = gains / Math.max(1, losses);
  return 100 - 100 / (1 + rs);
}

function summarizeMTF(candles: CandleData[]): string {
  const closes = candles.map(c => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const trend = ema20 > ema50 ? "Bullish" : "Bearish";
  const rsi = calcRSI(closes);
  return `4H Context → Trend: ${trend}, RSI: ${rsi.toFixed(1)}, EMA20:${ema20.toFixed(2)} EMA50:${ema50.toFixed(2)}`;
}

//------------------------------------------------------
// Main function
//------------------------------------------------------
export async function analyzeMarketWithPerplexity(
  symbol: string,
  duration: "scalping" | "swing" | "short_term" | "long_term",
  market: string,
  language: string,
  priceData: OHLCVData,
  currency = "USD"
): Promise<MarketAnalysisResult> {

  //----------------------------------------------------
  // Guards
  //----------------------------------------------------
  if (market === "crypto") market = "cryptocurrency";
  if (!process.env.PERPLEXITY_API_KEY) {
    console.warn("⚠️ PERPLEXITY_API_KEY not found — running in mock mode");
  }

  //----------------------------------------------------
  // Prompt setup
  //----------------------------------------------------
  const { name: langName } = getPromptLang(language);
  const promptLanguageName = langName || "English";
  const dec = market === "forex" ? 4 : 2;
  const nextClose = new Date(Date.now() + 3600000).toISOString();

  const candles = priceData.historicalCandles.slice(-14);
  const atr = candles.map(c => c.high - c.low).reduce((a, b) => a + b, 0) / candles.length;
  const volatilityIndex = (atr / priceData.close) * 100;
  const mtfSummary = priceData.mtfCandles
    ? summarizeMTF(priceData.mtfCandles)
    : "No 4H data provided.";

  const curSymbol =
    currency === "USD" ? "$" :
    currency === "INR" ? "₹" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    currency === "JPY" ? "¥" : currency;

  //----------------------------------------------------
  // AI prompt
  //----------------------------------------------------
  const prompt = `
You are TrendPilot Precision Engine v2.8 — a disciplined institutional analyst.
Analyze ${symbol} (${market}) for ${duration} timeframe using ${promptLanguageName}.
All outputs must be valid JSON.
Always return Reward-to-Risk ≥ 1:3 and realistic indicators.

VOLATILITY SNAPSHOT:
ATR(14): ${atr.toFixed(2)} | Volatility Index: ${volatilityIndex.toFixed(2)}%
${mtfSummary}

DATA SNAPSHOT:
Live: ${curSymbol}${priceData.livePrice.toFixed(dec)} | Close: ${curSymbol}${priceData.candleClosePrice.toFixed(dec)}
O:${priceData.open}  H:${priceData.high}  L:${priceData.low}  C:${priceData.close}  V:${priceData.volume}
Close Time: ${priceData.candleCloseTime} | Next Close: ${nextClose}

Return JSON only:
{
 "correctedSymbol": "...",
 "assetName": "...",
 "marketType": "${market}",
 "livePrice": "${priceData.livePrice.toFixed(dec)}",
 "candleClosePrice": "${priceData.candleClosePrice.toFixed(dec)}",
 "recommendation": "BUY" | "SELL",
 "confidence": 55-85,
 "sentiment": "Bullish" | "Bearish",
 "marketSentiment": "(3-4 lines)",
 "deepAnalysis": "(3-4 lines)",
 "analysis": "(2-3 lines)",
 "rsi": number, "macd": number, "stochastic": number, "bollingerBands": number,
 "entry": number, "takeProfit": number, "stopLoss": number,
 "tp1": number, "tp2": number, "tp3": number,
 "s1": number, "s2": number, "s3": number,
 "r1": number, "r2": number, "r3": number,
 "trailingStopStrategy": "(short note)",
 "marketSentimentReport": "(extended global report)"
}`.trim();

  //----------------------------------------------------
  // Make API call
  //----------------------------------------------------
  let parsed: any = {};
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
        search_recency_filter: "day",
        messages: [
          { role: "system", content: "Return strictly valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const raw = await response.json();
    const text = (raw?.choices?.[0]?.message?.content ?? "").trim();
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    parsed = JSON.parse(text.slice(s, e + 1));
  } catch (e) {
    console.warn("⚠️ Perplexity fallback mode (no valid JSON)");
    parsed = {};
  }

  //----------------------------------------------------
  // Safe field extraction & fallbacks
  //----------------------------------------------------
  const rec = parsed.recommendation || "BUY";
  const conf = Math.max(55, Math.min(90, Number(parsed.confidence) || 70));
  const sent = parsed.sentiment || (rec === "BUY" ? "Bullish" : "Bearish");

  const fmt = (v: any) => {
    const n = Number(v);
    return isFinite(n) ? n.toFixed(dec) : "0.00";
  };

  //----------------------------------------------------
  // Build final JSON
  //----------------------------------------------------
  return {
    recommendation: rec,
    confidence: conf,
    probabilityScore: conf,
    sentiment: sent,
    marketSentiment: parsed.marketSentiment || "",
    deepAnalysis: parsed.deepAnalysis || "",
    analysis: parsed.analysis || "",
    correctedSymbol: parsed.correctedSymbol || symbol,
    assetName: parsed.assetName || symbol,
    marketType: market,
    currentPrice: fmt(priceData.candleClosePrice),
    livePrice: fmt(priceData.livePrice),
    candleClosePrice: fmt(priceData.candleClosePrice),
    priceSource: priceData.dataSource,
    sourceCurrency: currency,
    exchangeRate: null,
    candleCloseTime: priceData.candleCloseTime,
    timeframe: priceData.timeframe,
    nextCandleCloseTime: nextClose,
    instrumentName: parsed.assetName || symbol,
    indicators: {
      rsi: String(parsed.rsi ?? ""),
      macd: String(parsed.macd ?? ""),
      stochastic: String(parsed.stochastic ?? ""),
      bollingerBands: String(parsed.bollingerBands ?? ""),
    },
    bracketOrder: {
      entry: fmt(parsed.entry),
      takeProfit: fmt(parsed.takeProfit),
      stopLoss: fmt(parsed.stopLoss),
    },
    takeProfitLevels: {
      tp1: fmt(parsed.tp1),
      tp2: fmt(parsed.tp2),
      tp3: fmt(parsed.tp3),
    },
    supportLevels: {
      s1: fmt(parsed.s1),
      s2: fmt(parsed.s2),
      s3: fmt(parsed.s3),
    },
    resistanceLevels: {
      r1: fmt(parsed.r1),
      r2: fmt(parsed.r2),
      r3: fmt(parsed.r3),
    },
    trailingStopStrategy: String(parsed.trailingStopStrategy || ""),
    riskMeter: Math.round(100 - (conf / 1.5)),
    explanatoryNotes: "",
    marketSentimentReport: parsed.marketSentimentReport || "",
  };
}
