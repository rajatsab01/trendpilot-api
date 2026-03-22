/**
 * Symbol Validation & Autocomplete Service
 * (TrendPilot v1.2.5, Dec-2025)
 *
 * Validates trading symbols and provides suggestions based on market type.
 * Handles Crypto / Forex / Stocks / Commodities / Futures.
 * Sources: Binance + CoinGecko + Yahoo Finance
 */

import { normalizeSymbolForAPI, type MarketType, symbolRegistry } from "./symbolRegistry.js";

/** Bare NSE tickers where Yahoo’s listing symbol differs from the old name (e.g. corporate re-list). */
const NSE_BARE_TICKER_REMAP: Record<string, string> = {
  TATAMOTORS: "TMCV.NS",
};

//------------------------------------------------------
// ✅ Interface (extended for routes.ts expectations)
//------------------------------------------------------
export interface SymbolValidationResult {
  isValid: boolean;
  correctedSymbol?: string;
  assetName?: string;
  currentPrice?: number;
  sourceCurrency?: string;
  exchange?: string;
  source?: string;
  suggestions?: Array<{ symbol: string; name: string; price?: number }>;
  error?: string;
}

//------------------------------------------------------
// ✅ Forex helpers
//------------------------------------------------------
export function isForexPair(symbol: string): boolean {
  const cleaned = symbol.toUpperCase().replace(/=X$/g, "").replace(/\//g, "").replace(/\s/g, "");
  if (!/^[A-Z]{6}$/.test(cleaned)) return false;
  const majors = new Set([
    "USD","EUR","GBP","JPY","CHF","CAD","AUD","NZD","INR","CNY","HKD","SGD","KRW","THB",
    "MXN","BRL","ARS","CLP","COP","ZAR","NGN","KES","EGP","RUB","TRY","PLN","HUF","CZK","RON",
    "SEK","NOK","DKK","ISK","ILS","AED","SAR","QAR","KWD","PHP","IDR","MYR","VND",
  ]);
  const base = cleaned.slice(0, 3);
  const quote = cleaned.slice(3, 6);
  return majors.has(base) && majors.has(quote);
}

export function getQuoteCurrency(symbol: string): string | null {
  const cleaned = symbol.toUpperCase().replace(/=X$/g, "").replace(/\//g, "").replace(/\s/g, "");
  if (cleaned.length !== 6) return null;
  const quote = cleaned.slice(3, 6);
  return /^[A-Z]{3}$/.test(quote) ? quote : null;
}

export function getExchangeCurrency(symbol: string, market: string): string {
  if (market === "forex" || isForexPair(symbol)) return getQuoteCurrency(symbol) ?? "USD";
  if (market === "cryptocurrency") return "USD";
  const s = symbol.toUpperCase();
  if (s.includes("=F")) return "USD";
  if (s.endsWith(".NS") || s.endsWith(".BO")) return "INR";
  if (s.endsWith(".L")) return "GBP";
  if (s.endsWith(".T")) return "JPY";
  if (s.endsWith(".HK")) return "HKD";
  if (s.endsWith(".AX")) return "AUD";
  if (s.endsWith(".TO")) return "CAD";
  if (s.endsWith(".SW")) return "CHF";
  if (s.endsWith(".PA") || s.endsWith(".DE") || s.endsWith(".AS")) return "EUR";
  if (s.endsWith(".SI")) return "SGD";
  if (s.endsWith(".SR")) return "SAR";
  if (s.endsWith(".SA")) return "BRL";
  if (s.endsWith(".MX")) return "MXN";
  return "USD";
}

//------------------------------------------------------
// ✅ Lightweight crypto price cache
//------------------------------------------------------
const priceCache = new Map<string, { data: number; timestamp: number }>();
const CACHE_TTL_MS = 60_000;
function getCachedPrice(id: string): number | null {
  const c = priceCache.get(id);
  return c && Date.now() - c.timestamp < CACHE_TTL_MS ? c.data : null;
}
function setCachedPrice(id: string, price: number): void {
  priceCache.set(id, { data: price, timestamp: Date.now() });
}

//------------------------------------------------------
// ✅ Crypto Validation
//------------------------------------------------------
async function validateCryptoSymbol(symbol: string): Promise<SymbolValidationResult> {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const base = clean.replace(/USDT$/g, "").replace(/USD$/g, "");
  const binanceSymbol = `${base}USDT`;

  const urls = [
    `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
    `https://api1.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
    `https://api2.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
    `https://api3.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!resp.ok) continue;
      const data = await resp.json();
      if (data && data.price) {
        const p = parseFloat(data.price);
        (globalThis as any).lastValidatedPrice = p;
        return {
          isValid: true,
          correctedSymbol: binanceSymbol,
          assetName: base,
          currentPrice: p,
          sourceCurrency: "USD",
          exchange: "Binance",
          source: "Binance",
        };
      }
    } catch {}
  }

  // fallback
  return await validateCryptoAlternative(clean, binanceSymbol);
}

async function validateCryptoAlternative(clean: string, binanceSymbol: string): Promise<SymbolValidationResult> {
  const map: Record<string, string> = {
    BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", XRP: "ripple",
    SOL: "solana", ADA: "cardano", DOGE: "dogecoin", MATIC: "matic-network",
    DOT: "polkadot", AVAX: "avalanche-2", LINK: "chainlink", UNI: "uniswap",
    ATOM: "cosmos", LTC: "litecoin", BCH: "bitcoin-cash",
  };
  const base = clean.replace(/USDT$/g, "").replace(/USD$/g, "");
  const id = map[base];
  if (id) {
    const cached = getCachedPrice(id);
    if (cached)
      return { isValid: true, correctedSymbol: binanceSymbol, assetName: base, currentPrice: cached, sourceCurrency: "USD", exchange: "CoinGecko", source: "CoinGecko" };
    const resp = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    if (resp.ok) {
      const data = await resp.json();
      const price = data?.[id]?.usd;
      if (price) {
        setCachedPrice(id, price);
        return { isValid: true, correctedSymbol: binanceSymbol, assetName: base, currentPrice: price, sourceCurrency: "USD", exchange: "CoinGecko", source: "CoinGecko" };
      }
    }
  }
  return { isValid: false, error: `Symbol "${clean}" not found in Binance/CoinGecko.` };
}

//------------------------------------------------------
// ✅ Yahoo suggestions (stocks / forex / futures)
//------------------------------------------------------
async function fetchYahooSuggestions(partial: string): Promise<Array<{ symbol: string; name: string; price?: number }>> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(partial)}&quotesCount=5&newsCount=0`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.quotes?.length) return [];
    return data.quotes
      .filter((q: any) => q.symbol && (q.longname || q.shortname))
      .slice(0, 5)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        price: q.regularMarketPrice ?? undefined,
      }));
  } catch {
    return [];
  }
}

const YAHOO_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function priceFromChartResult(res: Record<string, unknown> | undefined): number | null {
  if (!res) return null;
  const meta = res.meta as Record<string, unknown> | undefined;
  const tryNum = (v: unknown): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  if (meta) {
    for (const k of [
      "regularMarketPrice",
      "postMarketPrice",
      "preMarketPrice",
      "previousClose",
      "chartPreviousClose",
      "regularMarketPreviousClose",
    ]) {
      const hit = tryNum(meta[k]);
      if (hit != null) return hit;
    }
  }
  const quote = (res.indicators as Record<string, unknown> | undefined)?.quote as
    | Array<{ close?: (number | null)[] }>
    | undefined;
  const closes = quote?.[0]?.close;
  if (Array.isArray(closes)) {
    for (let i = closes.length - 1; i >= 0; i--) {
      const hit = tryNum(closes[i]);
      if (hit != null) return hit;
    }
  }
  const adj = (res.indicators as Record<string, unknown> | undefined)?.adjclose as
    | Array<{ adjclose?: (number | null)[] }>
    | undefined;
  const adjc = adj?.[0]?.adjclose;
  if (Array.isArray(adjc)) {
    for (let i = adjc.length - 1; i >= 0; i--) {
      const hit = tryNum(adjc[i]);
      if (hit != null) return hit;
    }
  }
  return null;
}

/** Lightweight quote endpoint — often works for NSE/BSE when chart meta is sparse. */
async function tryYahooQuoteV7(yahooSymbol: string, market: string): Promise<SymbolValidationResult | null> {
  const encoded = encodeURIComponent(yahooSymbol);
  const urls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encoded}`,
  ];
  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const q = data?.quoteResponse?.result?.[0];
      if (!q?.symbol) continue;
      const price =
        q.regularMarketPrice ??
        q.postMarketPrice ??
        q.preMarketPrice ??
        q.regularMarketPreviousClose ??
        q.bid;
      const n = Number(price);
      if (!Number.isFinite(n) || n <= 0) continue;
      return {
        isValid: true,
        correctedSymbol: q.symbol,
        assetName: q.longName || q.shortName || q.symbol,
        currentPrice: n,
        sourceCurrency: getExchangeCurrency(String(q.symbol), market),
        exchange: q.fullExchangeName || "Yahoo",
        source: "Yahoo",
      };
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * Yahoo often returns HTTP 200 with chart.error in JSON, or empty meta — treat as failure.
 * Prefer query2 (same as priceData). Try several ranges so .NS / off-hours still yield a last close.
 */
async function tryYahooChartQuote(
  yahooSymbol: string,
  market: string
): Promise<SymbolValidationResult | null> {
  const encoded = encodeURIComponent(yahooSymbol);
  const ranges = ["5d", "1mo", "3mo", "1y"];
  const bases = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];

  for (const range of ranges) {
    for (const host of bases) {
      const url = `https://${host}/v8/finance/chart/${encoded}?interval=1d&range=${range}`;
      try {
        const resp = await fetch(url, {
          headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!resp.ok) continue;

        const data = await resp.json();
        if (data?.chart?.error) continue;

        const res = data?.chart?.result?.[0] as Record<string, unknown> | undefined;
        const meta = res?.meta as Record<string, unknown> | undefined;
        if (!res || !meta) continue;

        const n = priceFromChartResult(res);
        if (n == null) continue;

        return {
          isValid: true,
          correctedSymbol: (meta.symbol as string) || yahooSymbol,
          assetName:
            (meta.longName as string) ||
            (meta.shortName as string) ||
            (meta.symbol as string) ||
            yahooSymbol,
          currentPrice: n,
          sourceCurrency: getExchangeCurrency(String(meta.symbol || yahooSymbol), market),
          exchange: "Yahoo",
          source: "Yahoo",
        };
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

/** When Yahoo search is empty (rate limits / blocks), still offer NSE/BSE tickers from our registry. */
function registryStockSuggestions(query: string): Array<{ symbol: string; name: string; price?: number }> {
  const raw = query.toUpperCase().trim();
  if (raw.length < 2) return [];
  const stripSuffix = (s: string) => s.replace(/\.(NS|BO)$/i, "");
  const qBase = stripSuffix(raw);
  const seen = new Set<string>();
  const out: Array<{ symbol: string; name: string }> = [];

  for (const m of symbolRegistry.getAll()) {
    if (m.market !== "stock") continue;
    const sym = m.symbol.toUpperCase();
    const base = stripSuffix(sym);
    const match =
      sym === raw ||
      base === qBase ||
      sym.includes(raw) ||
      base.startsWith(qBase) ||
      qBase.length >= 3 && base.includes(qBase);
    if (!match) continue;
    if (seen.has(sym)) continue;
    seen.add(sym);
    out.push({ symbol: m.symbol, name: m.name });
  }

  out.sort((a, b) => {
    const ab = stripSuffix(a.symbol.toUpperCase());
    const bb = stripSuffix(b.symbol.toUpperCase());
    if (ab === qBase && bb !== qBase) return -1;
    if (bb === qBase && ab !== qBase) return 1;
    return a.symbol.localeCompare(b.symbol);
  });

  return out.slice(0, 10);
}

//------------------------------------------------------
// ✅ Yahoo validation (stocks / forex / commodities)
//------------------------------------------------------
async function validateYahooSymbol(symbol: string, market: string): Promise<SymbolValidationResult> {
  const stripSuffix = (s: string) => s.replace(/\.(NS|BO)$/i, "");
  try {
    const trimmed = symbol.trim();
    const primary = normalizeSymbolForAPI(trimmed, market as MarketType);

    let hit = await tryYahooChartQuote(primary, market);
    if (hit) return hit;
    hit = await tryYahooQuoteV7(primary, market);
    if (hit) return hit;

    // NSE/BSE: user typed bare ticker (e.g. TATAMOTORS) — Yahoo needs .NS or .BO
    if (
      market === "stock" &&
      /^[A-Z][A-Z0-9]{1,14}$/.test(primary) &&
      !primary.includes(".") &&
      !primary.includes("=")
    ) {
      for (const suf of [".NS", ".BO"] as const) {
        const y = `${primary}${suf}`;
        hit = await tryYahooChartQuote(y, market);
        if (hit) return hit;
        hit = await tryYahooQuoteV7(y, market);
        if (hit) return hit;
      }
      // Yahoo renamed some NSE tickers (e.g. TATAMOTORS → TMCV.NS)
      const renamed = NSE_BARE_TICKER_REMAP[primary.toUpperCase()];
      if (renamed) {
        hit = await tryYahooChartQuote(renamed, market);
        if (hit) return hit;
        hit = await tryYahooQuoteV7(renamed, market);
        if (hit) return hit;
      }
    }

    // Registry match (e.g. TATAMOTORS.NS) — retry quote APIs if primary string differed
    if (market === "stock") {
      const reg = registryStockSuggestions(stripSuffix(primary) || primary);
      const exact =
        reg.find((r) => r.symbol.toUpperCase() === primary.toUpperCase()) ||
        reg.find((r) => stripSuffix(r.symbol.toUpperCase()) === stripSuffix(primary.toUpperCase()));
      if (exact && exact.symbol.toUpperCase() !== primary.toUpperCase()) {
        hit = await tryYahooChartQuote(exact.symbol, market);
        if (hit) return hit;
        hit = await tryYahooQuoteV7(exact.symbol, market);
        if (hit) return hit;
      }
    }

    let suggestions = await fetchYahooSuggestions(trimmed);
    if (!suggestions.length && trimmed !== primary) {
      suggestions = await fetchYahooSuggestions(primary);
    }
    const regSug = registryStockSuggestions(trimmed);
    const merged: Array<{ symbol: string; name: string; price?: number }> = [...suggestions];
    const have = new Set(merged.map((s) => s.symbol.toUpperCase()));
    for (const r of regSug) {
      if (!have.has(r.symbol.toUpperCase())) {
        merged.push(r);
        have.add(r.symbol.toUpperCase());
      }
    }

    const top = suggestions[0];
    if (top?.symbol && top.symbol.toUpperCase() !== primary.toUpperCase()) {
      hit = await tryYahooChartQuote(top.symbol, market);
      if (hit) return hit;
      hit = await tryYahooQuoteV7(top.symbol, market);
      if (hit) return hit;
    }

    return merged.length
      ? { isValid: false, suggestions: merged, error: `Symbol "${trimmed}" not found.` }
      : { isValid: false, error: `Symbol not found.` };
  } catch (e: any) {
    return { isValid: false, error: e.message };
  }
}

//------------------------------------------------------
// ✅ Public API
//------------------------------------------------------
export async function validateSymbol(symbol: string, market: string): Promise<SymbolValidationResult> {
  const safeMarket = market ?? "crypto";
  if (!symbol || !symbol.trim()) return { isValid: false, error: "Please enter a symbol" };
  if (safeMarket.toLowerCase().includes("crypto")) return await validateCryptoSymbol(symbol);
  return await validateYahooSymbol(symbol, safeMarket);
}
