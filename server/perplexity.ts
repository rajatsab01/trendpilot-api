import { getPromptLang } from "./translations";
import { fetchExchangeRates, convertCurrencyWithRate } from "./currencyConverter";
import { getExchangeCurrency, isForexPair } from "./symbolValidator";

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
  if (!process.env.PERPLEXITY_API_KEY)
    throw new Error("Perplexity API key not configured");

  const { code: langCode, name: langName } = getPromptLang(language);
  const promptLanguageName = langName || "English";

  const timeframeMap = {
    scalping: { tf: "5min", desc: "5-minute" },
    short_term: { tf: "1hr", desc: "1-hour" },
    swing: { tf: "4hr", desc: "4-hour" },
    long_term: { tf: "1day", desc: "daily" },
  } as const;
  const cfg = timeframeMap[duration];
  const dec = market === "forex" ? 4 : 2;

  // next candle timing
  const base = new Date(priceData.candleCloseTime);
  const next = new Date(base);
  if (cfg.tf === "5min") next.setMinutes(next.getMinutes() + 5);
  else if (cfg.tf === "4hr") next.setHours(next.getHours() + 4);
  else if (cfg.tf === "1hr") next.setHours(next.getHours() + 1);
  else next.setDate(next.getDate() + 1);
  const nextClose = next.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

  const curSymbol =
    currency === "USD" ? "$" :
    currency === "INR" ? "₹" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    currency === "JPY" ? "¥" : currency;

  // ✅ Debug trace
  console.log(`🌍 [Perplexity] Received language for analysis: ${promptLanguageName}`);

  // Prompt to Perplexity
  const prompt = `
You are TrendPilot Analyzer — an expert quantitative analyst.
Analyze ${symbol} (${market}) for ${duration} horizon.

All prices in ${currency}. Express every output field in ${promptLanguageName} language only — do not use English or mixed text.

Aim for very high Reward-to-Risk trades.
Base requirement RR ≥ 1:3. If volatility, momentum, or breakout probability justify,
you may expand target RR up to 1:50+ and describe trailing strategy for scaling out profits.

Use ONLY given candle data; do not fetch new prices.

DATA SNAPSHOT:
Live: ${curSymbol}${priceData.livePrice.toFixed(dec)} | Close: ${curSymbol}${priceData.candleClosePrice.toFixed(dec)}
O:${priceData.open}  H:${priceData.high}  L:${priceData.low}  C:${priceData.close}  V:${priceData.volume}
Close Time: ${priceData.candleCloseTime}  |  Next Close: ${nextClose}

Return strictly JSON (no markdown, no explanation) with these fields translated in ${promptLanguageName}:
{
 "correctedSymbol": "...",
 "assetName": "...",
 "marketType": "${market}",
 "livePrice": "${priceData.livePrice.toFixed(dec)}",
 "candleClosePrice": "${priceData.candleClosePrice.toFixed(dec)}",
 "recommendation": "BUY" | "SELL",
 "confidence": 1-100,
 "sentiment": "Bullish" | "Bearish",
 "marketSentiment": "(${promptLanguageName}) 3-4 lines",
 "deepAnalysis": "(${promptLanguageName}) 3-4 lines",
 "analysis": "(${promptLanguageName}) 2-3 lines",
 "rsi": number, "macd": number, "stochastic": number, "bollingerBands": number,
 "entry": number, "takeProfit": number, "stopLoss": number,
 "tp1": number, "tp2": number, "tp3": number,
 "s1": number, "s2": number, "s3": number,
 "r1": number, "r2": number, "r3": number,
 "trailingStopStrategy": "(${promptLanguageName}) detailed description",
 "probabilityScore": 1-100,
 "explanatoryNotes": "(${promptLanguageName}) brief reasoning"
}
`.trim();

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
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
        {
          role: "system",
          content: `
You are TrendPilot Analyzer.

LANGUAGE RULES:
- Write all analysis text (marketSentiment, deepAnalysis, analysis, trailingStopStrategy, explanatoryNotes)
  fully in ${promptLanguageName}.
- Do NOT include English translations or mixed text.
- The JSON itself must still be valid and follow the schema exactly.

RESPONSE RULES:
- Return ONLY one valid JSON object.
- Do not include markdown, explanations, or code fences.
          `.trim(),
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  
  if (!res.ok) throw new Error(`Perplexity API error ${res.status}: ${await res.text()}`);
  const raw = await res.json();
  let txt = (raw?.choices?.[0]?.message?.content ?? "").trim();
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  const data = JSON.parse(txt.slice(s, e + 1));

  // RR computation + auto boost
  const rr = (entry: number, tp: number, sl: number, side: "BUY" | "SELL") => {
    const risk = side === "BUY" ? entry - sl : sl - entry;
    const reward = side === "BUY" ? tp - entry : entry - tp;
    return risk > 0 ? reward / risk : 0;
  };
  let rrVal = rr(Number(data.entry), Number(data.takeProfit), Number(data.stopLoss), data.recommendation);

  if (rrVal < 3) {
    const factor = 3 / rrVal;
    if (data.recommendation === "BUY") data.takeProfit = Number(data.entry) + (Number(data.takeProfit) - Number(data.entry)) * factor;
    else data.takeProfit = Number(data.entry) - (Number(data.entry) - Number(data.takeProfit)) * factor;
    rrVal = rr(Number(data.entry), Number(data.takeProfit), Number(data.stopLoss), data.recommendation);
  }

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
    marketSentiment: data.marketSentiment || "",
    deepAnalysis: data.deepAnalysis || "",
    analysis: data.analysis || "",
    correctedSymbol: data.correctedSymbol,
    assetName: data.assetName,
    marketType: detected,
    currentPrice: fmt(data.candleClosePrice),
    livePrice: fmt(data.livePrice),
    candleClosePrice: fmt(data.candleClosePrice),
    priceSource: priceData.dataSource,
    sourceCurrency: srcCur,
    exchangeRate: isFx || sameCur ? null : rateShow,
    candleCloseTime: data.candleCloseTime,
    timeframe: data.timeframe,
    nextCandleCloseTime: nextClose,
    instrumentName: data.assetName,
    indicators: {
      rsi: String(data.rsi ?? ""),
      macd: String(data.macd ?? ""),
      stochastic: String(data.stochastic ?? ""),
      bollingerBands: String(data.bollingerBands ?? ""),
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
    trailingStopStrategy: String(data.trailingStopStrategy || ""),
    probabilityScore: Number(data.probabilityScore) || 0,
    explanatoryNotes: String(data.explanatoryNotes || ""),
  };
}
