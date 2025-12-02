/**
 * Symbol Validation & Autocomplete Service
 * (TrendPilot v1.2.5, Dec-2025)
 *
 * Validates trading symbols and provides suggestions based on market type.
 * Handles Crypto / Forex / Stocks / Commodities / Futures.
 * Sources: Binance + CoinGecko + Yahoo Finance
 */

import { normalizeSymbolForAPI, type MarketType } from "./symbolRegistry";

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

//------------------------------------------------------
// ✅ Yahoo validation (stocks / forex / commodities)
//------------------------------------------------------
async function validateYahooSymbol(symbol: string, market: string): Promise<SymbolValidationResult> {
  try {
    const yahooSymbol = normalizeSymbolForAPI(symbol, market as MarketType);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!resp.ok) {
      const s = await fetchYahooSuggestions(symbol);
      return s.length ? { isValid: false, suggestions: s, error: `Symbol "${symbol}" not found.` } : { isValid: false, error: `Symbol not found.` };
    }
    const data = await resp.json();
    const res = data?.chart?.result?.[0];
    const meta = res?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    return {
      isValid: true,
      correctedSymbol: yahooSymbol,
      assetName: meta?.longName || yahooSymbol,
      currentPrice: price,
      sourceCurrency: getExchangeCurrency(yahooSymbol, market),
      exchange: "Yahoo",
      source: "Yahoo",
    };
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
