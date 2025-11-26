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
  mtfCandles?: CandleData[]; // 4H data (optional)
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
  riskMeter: number;              // 🔥 New risk meter
  explanatoryNotes: string;
  marketSentimentReport: string;  // 🔥 Detailed sentiment
}

export async function analyzeMarketWithPerplexity(
  symbol: string,
  duration: "scalping" | "swing" | "short_term" | "long_term",
  market: "stock" | "commodity" | "forex" | "cryptocurrency",
  language: string,
  priceData: OHLCVData,
  currency = "USD",
): Promise<MarketAnalysisResult> {

  if (!process.env.PERPLEXITY_API_KEY)
    throw new Error("Perplexity API key not configured");

  const { name: langName } = getPromptLang(language);
  const promptLanguageName = langName || "English";
  const dec = market === "forex" ? 4 : 2;

  const base = new Date(priceData.candleCloseTime);
  const next = new Date(base);
  if (duration === "scalping") next.setMinutes(next.getMinutes() + 5);
  else if (duration === "short_term") next.setHours(next.getHours() + 1);
  else if (duration === "swing") next.setHours(next.getHours() + 4);
  else next.setDate(next.getDate() + 1);
  const nextClose = next.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");

  // --- ATR & volatility computation
  const candles = priceData.historicalCandles.slice(-14);
  const atr = candles.map(c => c.high - c.low).reduce((a, b) => a + b, 0) / candles.length;
  const volatilityIndex = (atr / priceData.close) * 100;

  // --- Market structure summary for MTF
  const mtfSummary = priceData.mtfCandles
    ? summarizeMTF(priceData.mtfCandles)
    : "No 4H data provided.";

  const curSymbol = currency === "USD" ? "$" :
    currency === "INR" ? "₹" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    currency === "JPY" ? "¥" : currency;

  // --- Build prompt
  const prompt = `
You are TrendPilot Precision Engine v2.5 — a disciplined institutional analyst.
Analyze ${symbol} (${market}) using ${duration} timeframe with 4H context below.

All outputs must be in ${promptLanguageName}. 
Always produce Reward-to-Risk >= 1:3 and apply adaptive ATR-based stop losses.

VOLATILITY SNAPSHOT:
ATR(14): ${atr.toFixed(2)} | Volatility Index: ${volatilityIndex.toFixed(2)}%
${mtfSummary}

DATA SNAPSHOT:
Live: ${curSymbol}${priceData.livePrice.toFixed(dec)} | Close: ${curSymbol}${priceData.candleClosePrice.toFixed(dec)}
O:${priceData.open}  H:${priceData.high}  L:${priceData.low}  C:${priceData.close}  V:${priceData.volume}
Close Time: ${priceData.candleCloseTime}  |  Next Close: ${nextClose}

Return JSON:
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
 "trailingStopStrategy": "(${promptLanguageName}) details",
 "marketSentimentReport": "(${promptLanguageName}) extended global report"
}`.trim();

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
      messages: [{ role: "system", content: "Return valid JSON only." }, { role: "user", content: prompt }],
    }),
  });

  const raw = await res.json();
  const txt = (raw?.choices?.[0]?.message?.content ?? "").trim();
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  const data = JSON.parse(txt.slice(s, e + 1));

  // --- RR + ATR optimizer
  const rr = (entry: number, tp: number, sl: number, side: "BUY" | "SELL") => {
    const risk = side === "BUY" ? entry - sl : sl - entry;
    const reward = side === "BUY" ? tp - entry : entry - tp;
    return risk > 0 ? reward / risk : 0;
  };

  let rrVal = rr(Number(data.entry), Number(data.takeProfit), Number(data.stopLoss), data.recommendation);
  if (rrVal < 3) {
    const factor = 3 / rrVal;
    if (data.recommendation === "BUY")
      data.takeProfit = Number(data.entry) + (Number(data.takeProfit) - Number(data.entry)) * factor;
    else
      data.takeProfit = Number(data.entry) - (Number(data.entry) - Number(data.takeProfit)) * factor;
  }

  // --- Risk Meter (0-100)
  const riskMeter = Math.min(
    100,
    ((volatilityIndex / (rrVal * 3)) * (100 - (data.confidence || 50))) / 2
  );

  // --- Flip supports/resistances for SELL
  let support = { s1: data.s1, s2: data.s2, s3: data.s3 };
  let resistance = { r1: data.r1, r2: data.r2, r3: data.r3 };
  if (data.recommendation === "SELL") {
    support = { s1: data.r1, s2: data.r2, s3: data.r3 };
    resistance = { r1: data.s1, r2: data.s2, r3: data.s3 };
  }

  const fmt = (v: any) => Number(v).toFixed(dec);

  return {
    recommendation: data.recommendation,
    confidence: Number(data.confidence) || 0,
    sentiment: data.sentiment,
    marketSentiment: data.marketSentiment || "",
    deepAnalysis: data.deepAnalysis || "",
    analysis: data.analysis || "",
    correctedSymbol: data.correctedSymbol,
    assetName: data.assetName,
    marketType: data.marketType,
    currentPrice: fmt(data.candleClosePrice),
    livePrice: fmt(data.livePrice),
    candleClosePrice: fmt(data.candleClosePrice),
    priceSource: priceData.dataSource,
    sourceCurrency: currency,
    exchangeRate: null,
    candleCloseTime: priceData.candleCloseTime,
    timeframe: priceData.timeframe,
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
    supportLevels: support,
    resistanceLevels: resistance,
    trailingStopStrategy: String(data.trailingStopStrategy || ""),
    riskMeter: Math.round(riskMeter),
    explanatoryNotes: data.explanatoryNotes || "",
    marketSentimentReport: data.marketSentimentReport || "",
  };
}

/* -----------------------------------------------------
   Summarize 4H MTF data for context
----------------------------------------------------- */
function summarizeMTF(candles: CandleData[]): string {
  const closes = candles.map(c => c.close);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const trend = ema20 > ema50 ? "Bullish" : "Bearish";
  const rsi = calcRSI(closes);
  return `4H Context → Trend: ${trend}, RSI: ${rsi.toFixed(1)}, EMA20:${ema20.toFixed(2)} EMA50:${ema50.toFixed(2)}`;
}

function ema(values: number[], period: number) {
  const k = 2 / (period + 1);
  return values.reduce((prev, cur, i) => i === 0 ? cur : cur * k + prev * (1 - k), 0);
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
