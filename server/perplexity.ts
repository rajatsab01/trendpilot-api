// server/perplexity.ts
// Uses global fetch (Node 18+). No node-fetch import needed.

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
  indicators: {
    rsi: string;
    macd: string;
    stochastic: string;
    bollingerBands: string;
  };
  bracketOrder: {
    entry: string;
    takeProfit: string;
    stopLoss: string;
  };
  takeProfitLevels: { tp1: string; tp2: string; tp3: string };
  supportLevels: { s1: string; s2: string; s3: string };
  resistanceLevels: { r1: string; r2: string; r3: string };
  trailingStopStrategy: string;
  probabilityScore: number;
  explanatoryNotes: string;
}

// Lightweight helpers we rely on (implemented below)
import { fetchExchangeRates, convertCurrencyWithRate } from "./currencyConverter";
import { getExchangeCurrency, isForexPair } from "./symbolValidator";

const languageMap: Record<string, string> = {
  en: "English", hi: "Hindi (हिन्दी)", es: "Spanish (Español)", zh: "Chinese (中文)",
  de: "German (Deutsch)", fr: "French (Français)", ar: "Arabic (العربية)",
  pt: "Portuguese (Português)", ru: "Russian (Русский)", ja: "Japanese (日本語)",
  ko: "Korean (한국어)", it: "Italian (Italiano)",
};

export async function analyzeMarketWithPerplexity(
  symbol: string,
  duration: "scalping" | "swing" | "short_term" | "long_term",
  market: "stock" | "commodity" | "forex" | "cryptocurrency",
  language: string,
  priceData: OHLCVData,
  currency = "USD",
  exchange?: string
): Promise<MarketAnalysisResult> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }

  const timeframeMap = {
    scalping: { tf: "5min", desc: "5-minute", variants: ["5m", "5min", "5-min", "5 min"] },
    swing: { tf: "15min", desc: "15-minute", variants: ["15m", "15min", "15-min", "15 min"] },
    short_term: { tf: "1hr", desc: "1-hour", variants: ["1h", "1hr", "1 hour"] },
    long_term: { tf: "1day", desc: "1-day", variants: ["1d", "1day", "daily"] },
  } as const;

  const cfg = timeframeMap[duration];
  const languageName = languageMap[language] || "English";
  const marketName = market.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const isScalping = duration === "scalping";
  const currencySymbol =
    currency === "USD" ? "$" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    currency === "JPY" ? "¥" :
    currency === "INR" ? "₹" : currency;

  // Compute next-candle time (for UX)
  const baseClose = new Date(priceData.candleCloseTime);
  const next = new Date(baseClose);
  if (cfg.tf === "5min") next.setMinutes(next.getMinutes() + 5);
  else if (cfg.tf === "15min") next.setMinutes(next.getMinutes() + 15);
  else if (cfg.tf === "1hr") next.setHours(next.getHours() + 1);
  else next.setDate(next.getDate() + 1);
  const nextCandleCloseTime = next.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

  const decimalPlaces = market === "forex" ? 4 : 2;
  const exchangeContext = exchange
    ? ` User prefers ${exchange}. Use correct suffixes (e.g., India .NS/.BO; Japan .T; UK .L).`
    : "";

  // ————————————————————————————————————————————————————————————
  // GIANT PROMPT — keep the opening and closing back-ticks intact
  // ————————————————————————————————————————————————————————————
  const prompt = `
You are an expert financial analyst. Analyze "${symbol}" (${marketName}) for ${duration}.
User currency: ${currency}. Express ALL prices in ${currency}.${exchangeContext}

PRICE DATA (from ${priceData.dataSource}):
- Symbol: ${priceData.symbol}
- Live: ${currencySymbol}${(priceData.livePrice ?? 0).toFixed(decimalPlaces)}
- Candle Close (${priceData.timeframe}): ${currencySymbol}${(priceData.candleClosePrice ?? 0).toFixed(decimalPlaces)}
- Close Time: ${priceData.candleCloseTime}
- Next Candle Close: ${nextCandleCloseTime}
- Latest OHLCV: O ${currencySymbol}${(priceData.open ?? 0).toFixed(decimalPlaces)}, H ${currencySymbol}${(priceData.high ?? 0).toFixed(decimalPlaces)}, L ${currencySymbol}${(priceData.low ?? 0).toFixed(decimalPlaces)}, C ${currencySymbol}${(priceData.close ?? 0).toFixed(decimalPlaces)}, V ${(priceData.volume ?? 0).toLocaleString()}

HISTORICAL (${priceData.historicalCandles?.length || 0} ${priceData.timeframe} candles):
${priceData.historicalCandles?.length
    ? priceData.historicalCandles.slice(-10).map((c,i)=>`${i+1}. ${c.timestamp.split(" ")[1]}: O:${currencySymbol}${c.open.toFixed(decimalPlaces)} H:${currencySymbol}${c.high.toFixed(decimalPlaces)} L:${currencySymbol}${c.low.toFixed(decimalPlaces)} C:${currencySymbol}${c.close.toFixed(decimalPlaces)} Vol:${c.volume.toLocaleString()}`).join("\n")
    : "No historical candles – use last candle carefully."}

REQUIREMENTS:
1) Use EXACT prices above (no fresh fetching). ${isScalping ? "For scalping use LIVE price for entry/TP/SL." : "For this horizon use CANDLE CLOSE price for entry/TP/SL."}
2) Validate/correct the symbol via web search; keep forex pair DIRECTION.
3) Compute numeric RSI/MACD/Stochastic/BB width (no zeros/text).
4) Risk–Reward: TP3 must be >= 1:3 when possible; never < 1:2.5.
5) Return valid JSON ONLY in this schema.

JSON SHAPE:
{
  "correctedSymbol": "...",
  "assetName": "...",
  "marketType": "${market}",
  "currentPrice": "DEPRECATED",
  "livePrice": "${(priceData.livePrice ?? 0).toFixed(decimalPlaces)}",
  "candleClosePrice": "${(priceData.candleClosePrice ?? 0).toFixed(decimalPlaces)}",
  "priceSource": "${priceData.dataSource}",
  "candleCloseTime": "${priceData.candleCloseTime}",
  "timeframe": "${priceData.timeframe}",
  "nextCandleCloseTime": "${nextCandleCloseTime}",
  "recommendation": "BUY" | "SELL",
  "confidence": 1-100,
  "sentiment": "Bullish" | "Bearish",
  "marketSentiment": "(${languageName}) 3–4 sentences",
  "deepAnalysis": "(${languageName}) 3–4 sentences",
  "analysis": "(${languageName}) 2–3 sentences",
  "rsi": number,
  "macd": number,
  "stochastic": number,
  "bollingerBands": number,
  "entry": "${isScalping ? (priceData.livePrice ?? 0).toFixed(decimalPlaces) : (priceData.candleClosePrice ?? 0).toFixed(decimalPlaces)}",
  "takeProfit": "number as string",
  "stopLoss": "number as string",
  "tp1": "number as string",
  "tp2": "number as string",
  "tp3": "number as string",
  "s1": "number as string", "s2": "number as string", "s3": "number as string",
  "r1": "number as string", "r2": "number as string", "r3": "number as string",
  "trailingStopStrategy": "(${languageName})",
  "probabilityScore": 1-100,
  "explanatoryNotes": "(${languageName})"
}
`.trim();

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      temperature: 0.2,
      top_p: 0.9,
      search_recency_filter: "day",
      return_related_questions: false,
      stream: false,
      messages: [
        {
          role: "system",
          content: `Return ONLY valid JSON. Use the EXACT prices supplied. ${
            isScalping
              ? `For scalping, use LIVE price for bracket levels.`
              : `For ${duration}, use CANDLE CLOSE price for bracket levels.`
          }`,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${text}`);
  }

  const result: any = await response.json();
  let raw = (result?.choices?.[0]?.message?.content ?? "").trim();
  // Robust JSON extraction (Perplexity occasionally wraps content)
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);

  const data: any = JSON.parse(raw);

  // ——— Basic field sanity ———
  if (!data.correctedSymbol || !data.assetName || !data.marketType || !data.priceSource) {
    throw new Error("Perplexity response missing required fields");
  }
  if (!data.livePrice && !data.candleClosePrice && !data.currentPrice) {
    throw new Error("Perplexity response missing price data");
  }
  if (!data.livePrice) data.livePrice = data.candleClosePrice ?? data.currentPrice;
  if (!data.candleClosePrice) data.candleClosePrice = data.livePrice ?? data.currentPrice;
  if (!data.currentPrice) data.currentPrice = data.candleClosePrice;

  // Defensive number cleanup
  const safePrice = (v: any, fallbackMul = 1): string => {
    const base =
      (priceData.livePrice ?? 0) ||
      (priceData.candleClosePrice ?? 0) ||
      (priceData.close ?? 0) ||
      100;
    const n = Number(v);
    if (!isFinite(n) || n <= 0) return (base * fallbackMul).toFixed(decimalPlaces);
    return n.toFixed(decimalPlaces);
  };

  data.entry = safePrice(data.entry, 1);
  data.takeProfit = safePrice(data.takeProfit, 1.01);
  data.stopLoss = safePrice(data.stopLoss, 0.995);
  data.tp1 = safePrice(data.tp1, 1.003);
  data.tp2 = safePrice(data.tp2, 1.006);
  data.tp3 = safePrice(data.tp3, 1.012);

  // SELL inversion guard
  if (data.recommendation === "SELL") {
    const e = Number(data.entry), tp = Number(data.takeProfit), sl = Number(data.stopLoss);
    if (tp > e || sl < e) {
      [data.takeProfit, data.stopLoss] = [data.stopLoss, data.takeProfit];
    }
  }

  // RR check (warn/lenient)
  const rr = (entry: number, target: number, sl: number, side: "BUY" | "SELL") => {
    if (side === "BUY") {
      const risk = entry - sl, reward = target - entry;
      return risk > 0 ? reward / risk : 0;
    }
    const risk = sl - entry, reward = entry - target;
    return risk > 0 ? reward / risk : 0;
  };
  const eN = Number(data.entry), t3N = Number(data.tp3), slN = Number(data.stopLoss);
  const rr3 = rr(eN, t3N, slN, data.recommendation);
  if (rr3 < 0.9) throw new Error(`Risk–reward too low: 1:${rr3.toFixed(2)}`);

  // Currency conversion rules
  const detectedMarket: string = data.marketType;
  const sourceCurrency = getExchangeCurrency(data.correctedSymbol, detectedMarket);
  const isFx = detectedMarket === "forex" || isForexPair(data.correctedSymbol);
  const sameCurrency = !isFx && sourceCurrency === currency;

  const formatFx = (v: any) => {
    const n = Number(v);
    return isFinite(n) ? n.toFixed(4) : "0.0000";
  };
  const formatFiat = (v: any) => {
    const n = Number(v);
    return isFinite(n) ? n.toFixed(2) : "0.00";
  };

  let rateShow: string | null = null;
  let convert = (v: any) => (sameCurrency ? formatFiat(v) : formatFiat(v));

  if (isFx) {
    // Never convert forex; keep 4dp
    convert = formatFx;
  } else if (!sameCurrency) {
    const rates = await fetchExchangeRates(sourceCurrency);
    const rate = rates?.rates?.[currency] ?? 1;
    rateShow = rate.toFixed(2);
    convert = (v: any) => {
      const n = Number(v);
      return isFinite(n) ? convertCurrencyWithRate(n, rate).toFixed(2) : "0.00";
    };
  }

  const out: MarketAnalysisResult = {
    recommendation: data.recommendation,
    confidence: Number(data.confidence) || 0,
    sentiment: data.sentiment,
    marketSentiment: data.marketSentiment || "",
    deepAnalysis: data.deepAnalysis || "",
    analysis: data.analysis || "",

    correctedSymbol: data.correctedSymbol,
    assetName: data.assetName,
    marketType: detectedMarket,

    currentPrice: isFx ? formatFx(data.currentPrice) : convert(data.currentPrice),
    livePrice: isFx ? formatFx(data.livePrice) : convert(data.livePrice),
    candleClosePrice: isFx ? formatFx(data.candleClosePrice) : convert(data.candleClosePrice),
    priceSource: data.priceSource,
    sourceCurrency,
    exchangeRate: isFx || sameCurrency ? null : rateShow,
    candleCloseTime: data.candleCloseTime,
    timeframe: data.timeframe,
    nextCandleCloseTime,

    instrumentName: data.assetName,
    indicators: {
      rsi: String(data.rsi ?? "N/A"),
      macd: String(data.macd ?? "N/A"),
      stochastic: String(data.stochastic ?? "N/A"),
      bollingerBands: String(data.bollingerBands ?? "N/A"),
    },
    bracketOrder: {
      entry: isFx ? formatFx(data.entry) : convert(data.entry),
      takeProfit: isFx ? formatFx(data.takeProfit) : convert(data.takeProfit),
      stopLoss: isFx ? formatFx(data.stopLoss) : convert(data.stopLoss),
    },
    takeProfitLevels: {
      tp1: isFx ? formatFx(data.tp1) : convert(data.tp1),
      tp2: isFx ? formatFx(data.tp2) : convert(data.tp2),
      tp3: isFx ? formatFx(data.tp3) : convert(data.tp3),
    },
    supportLevels: {
      s1: isFx ? formatFx(data.s1) : convert(data.s1),
      s2: isFx ? formatFx(data.s2) : convert(data.s2),
      s3: isFx ? formatFx(data.s3) : convert(data.s3),
    },
    resistanceLevels: {
      r1: isFx ? formatFx(data.r1) : convert(data.r1),
      r2: isFx ? formatFx(data.r2) : convert(data.r2),
      r3: isFx ? formatFx(data.r3) : convert(data.r3),
    },
    trailingStopStrategy: String(data.trailingStopStrategy ?? ""),
    probabilityScore: Number(data.probabilityScore) || 0,
    explanatoryNotes: String(data.explanatoryNotes ?? ""),
  };

  return out;
}
