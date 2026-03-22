// server/priceData.ts
// Fetches OHLCV candle data for analysis across all market types.
// Unified duration policy: crypto (Binance) and stocks/FX/commodities (Yahoo) use the same bar size + depth.

import type { OHLCVData } from "./perplexity";
import { normalizeSymbolForAPI, type MarketType } from "./symbolRegistry.js";

const PRICE_FETCH_UA =
  "Mozilla/5.0 (compatible; TrendPilot/1.0; +https://trendpilot.in)";

export type AnalysisDurationKey = "scalping" | "short_term" | "swing" | "long_term";

/** Single source of truth: bar interval, depth, and labels (Binance + Yahoo aligned). */
export const ANALYSIS_DURATION_SPECS: Record<
  AnalysisDurationKey,
  {
    binanceInterval: string;
    binanceLimit: number;
    yahooInterval: string;
    yahooRange: string;
    maxBars: number;
    label: string;
    intervalMinutes: number;
  }
> = {
  scalping: {
    binanceInterval: "5m",
    binanceLimit: 200,
    yahooInterval: "5m",
    yahooRange: "7d",
    maxBars: 200,
    label: "5min",
    intervalMinutes: 5,
  },
  swing: {
    binanceInterval: "15m",
    binanceLimit: 200,
    yahooInterval: "15m",
    yahooRange: "30d",
    maxBars: 200,
    label: "15min",
    intervalMinutes: 15,
  },
  short_term: {
    binanceInterval: "4h",
    binanceLimit: 200,
    yahooInterval: "4h",
    yahooRange: "6mo",
    maxBars: 200,
    label: "4hr",
    intervalMinutes: 240,
  },
  long_term: {
    binanceInterval: "1d",
    binanceLimit: 100,
    yahooInterval: "1d",
    yahooRange: "2y",
    maxBars: 100,
    label: "1day",
    intervalMinutes: 1440,
  },
};

function getSpec(duration: string) {
  const key = duration as AnalysisDurationKey;
  return ANALYSIS_DURATION_SPECS[key] ?? ANALYSIS_DURATION_SPECS.short_term;
}

function formatUtcClose(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

function nextCloseFromLastBarMs(lastCloseMs: number, intervalMinutes: number): string {
  return formatUtcClose(lastCloseMs + intervalMinutes * 60 * 1000);
}

/**
 * Fetch OHLCV data for crypto from Binance klines API, with Binance.US + Yahoo fallbacks.
 * (Render / US cloud IPs often cannot reach api.binance.com — same as symbol validation.)
 */
async function fetchCryptoOHLCV(symbol: string, duration: string): Promise<OHLCVData> {
  const sym = symbol.toUpperCase().trim();
  const binanceSymbol = sym.endsWith("USDT") ? sym : `${sym}USDT`;
  const spec = getSpec(duration);
  const { binanceInterval, binanceLimit, label, intervalMinutes, maxBars } = spec;

  const klinesUrls = [
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${binanceInterval}&limit=${binanceLimit}`,
    `https://api1.binance.com/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${binanceInterval}&limit=${binanceLimit}`,
    `https://api.binance.us/api/v3/klines?symbol=${encodeURIComponent(binanceSymbol)}&interval=${binanceInterval}&limit=${binanceLimit}`,
  ];

  const fetchOpts: RequestInit = {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json", "User-Agent": PRICE_FETCH_UA },
  };

  let klines: any[] | null = null;
  for (const klinesUrl of klinesUrls) {
    try {
      const klinesResp = await fetch(klinesUrl, fetchOpts);
      if (!klinesResp.ok) continue;
      const parsed = await klinesResp.json();
      if (Array.isArray(parsed) && parsed.length > 0) {
        klines = parsed;
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!klines) {
    console.warn(
      `[priceData] Binance klines unavailable for ${binanceSymbol}; using Yahoo chart (e.g. BASE-USD)`,
    );
    return await fetchCryptoOHLCVFromYahoo(binanceSymbol, duration);
  }

  const tickerUrls = [
    `https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(binanceSymbol)}`,
    `https://api.binance.us/api/v3/ticker/price?symbol=${encodeURIComponent(binanceSymbol)}`,
  ];
  let livePrice = 0;
  for (const tickerUrl of tickerUrls) {
    try {
      const tickerResp = await fetch(tickerUrl, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json", "User-Agent": PRICE_FETCH_UA },
      });
      if (tickerResp.ok) {
        const tickerData = await tickerResp.json();
        livePrice = Number(tickerData?.price) || 0;
        if (livePrice > 0) break;
      }
    } catch {
      /* use last close */
    }
  }

  if (livePrice === 0) {
    const lastK = klines[klines.length - 1];
    livePrice = Number(lastK[4]) || 0;
  }

  const historicalCandles = klines.map((k: any) => ({
    timestamp: new Date(k[0]).toISOString(),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));

  const sliceStart = Math.max(0, historicalCandles.length - maxBars);
  const trimmed = historicalCandles.slice(sliceStart);
  const lastBar = trimmed[trimmed.length - 1];
  const lastTs = new Date(lastBar.timestamp).getTime();

  return {
    symbol: binanceSymbol,
    livePrice,
    candleClosePrice: lastBar.close,
    candleCloseTime: formatUtcClose(lastTs),
    timeframe: label,
    open: lastBar.open,
    high: lastBar.high,
    low: lastBar.low,
    close: lastBar.close,
    volume: lastBar.volume,
    dataSource: "Binance",
    historicalCandles: trimmed,
    candleIntervalMinutes: intervalMinutes,
    analysisBarCount: trimmed.length,
    nextCandleCloseTime: nextCloseFromLastBarMs(lastTs, intervalMinutes),
  };
}

/**
 * Fetch OHLCV data for stocks/forex/commodities from Yahoo Finance
 */
async function fetchYahooOHLCV(symbol: string, duration: string, market: string): Promise<OHLCVData> {
  let yahooSymbol = symbol.toUpperCase().trim();

  if (market === "forex") {
    if (!yahooSymbol.includes("=")) {
      yahooSymbol = `${yahooSymbol}=X`;
    }
  } else if (market === "commodity") {
    if (!yahooSymbol.includes("=")) {
      const commodityMap: Record<string, string> = {
        GOLD: "GC=F",
        SILVER: "SI=F",
        OIL: "CL=F",
        CRUDE: "CL=F",
        CRUDEOIL: "CL=F",
        NATURALGAS: "NG=F",
        COPPER: "HG=F",
        CORN: "ZC=F",
        WHEAT: "ZW=F",
        PLATINUM: "PL=F",
        PALLADIUM: "PA=F",
      };
      yahooSymbol = commodityMap[yahooSymbol] || `${yahooSymbol}=F`;
    }
  }

  const spec = getSpec(duration);
  const { yahooInterval, yahooRange, maxBars, label, intervalMinutes } = spec;

  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yahooInterval}&range=${yahooRange}`;
  const resp = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36" },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) throw new Error(`Yahoo Finance error ${resp.status} for ${yahooSymbol}`);
  const data = await resp.json();

  if (data.chart?.error) {
    throw new Error(data.chart.error.description || `Yahoo error for ${yahooSymbol}`);
  }

  const result = data.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${yahooSymbol}`);

  const meta = result.meta;
  const quotes = result.indicators?.quote?.[0] || {};
  const timestamps = result.timestamp || [];

  const len = timestamps.length;
  if (len === 0) throw new Error(`No candle data for ${yahooSymbol}`);

  const historicalCandles: import("./perplexity").CandleData[] = [];
  for (let i = 0; i < len; i++) {
    if (quotes.close?.[i] != null) {
      historicalCandles.push({
        timestamp: new Date(timestamps[i] * 1000).toISOString(),
        open: quotes.open?.[i] || 0,
        high: quotes.high?.[i] || 0,
        low: quotes.low?.[i] || 0,
        close: quotes.close?.[i] || 0,
        volume: quotes.volume?.[i] || 0,
      });
    }
  }

  if (historicalCandles.length === 0) throw new Error(`No valid candles for ${yahooSymbol}`);

  const trimmed =
    historicalCandles.length > maxBars
      ? historicalCandles.slice(-maxBars)
      : historicalCandles;

  const last = trimmed[trimmed.length - 1];
  const lastBarMs = new Date(last.timestamp).getTime();
  const livePrice = meta.regularMarketPrice || last.close;

  return {
    symbol: yahooSymbol,
    livePrice,
    candleClosePrice: last.close,
    candleCloseTime: formatUtcClose(lastBarMs),
    timeframe: label,
    open: last.open,
    high: last.high,
    low: last.low,
    close: last.close,
    volume: last.volume,
    dataSource: "Yahoo Finance",
    historicalCandles: trimmed,
    candleIntervalMinutes: intervalMinutes,
    analysisBarCount: trimmed.length,
    nextCandleCloseTime: nextCloseFromLastBarMs(lastBarMs, intervalMinutes),
  };
}

/** When Binance klines are unreachable (e.g. US cloud IPs), use Yahoo chart for BASE-USD. */
async function fetchCryptoOHLCVFromYahoo(binanceSymbol: string, duration: string): Promise<OHLCVData> {
  const base = binanceSymbol.replace(/USDT$/i, "").replace(/BUSD$/i, "").replace(/USD$/i, "");
  if (!/^[A-Z0-9]{1,14}$/i.test(base)) {
    throw new Error(`Cannot map ${binanceSymbol} to Yahoo USD pair`);
  }
  const yahooPair = `${base}-USD`;
  return await fetchYahooOHLCV(yahooPair, duration, "stock");
}

/**
 * Main entry: Fetch full OHLCV data for any market type.
 */
export async function fetchMarketPrice(symbol: string, duration: string, market?: string): Promise<OHLCVData> {
  const mkt = (market || "stock") as MarketType;
  const raw = (symbol || "").trim();

  const upper = raw.toUpperCase();
  const isCrypto =
    market === "cryptocurrency" ||
    market === "crypto" ||
    upper.endsWith("USDT") ||
    (upper.endsWith("USD") && !upper.includes("="));

  if (isCrypto) {
    return await fetchCryptoOHLCV(upper, duration);
  }

  const yahooSym = normalizeSymbolForAPI(raw, mkt);
  return await fetchYahooOHLCV(yahooSym, duration, mkt);
}

/**
 * Legacy: Basic OHLC array builder (kept for backward compatibility).
 */
export const fetchPriceData = async (
  symbol: string,
  timeframe: string = "1h",
  hours: number = 24,
  market?: string
): Promise<any[]> => {
  try {
    console.log(`📈 Fetching price data for ${symbol} (${timeframe}, ${hours}h)`);
    const ohlcv = await fetchMarketPrice(symbol, "short_term", market);
    return ohlcv.historicalCandles;
  } catch (error: any) {
    console.error("Error fetching price data:", error);
    throw new Error("Failed to fetch price data");
  }
};
