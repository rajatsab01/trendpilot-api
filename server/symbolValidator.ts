/**
 * Symbol Validation & Autocomplete Service
 *
 * Validates trading symbols and provides suggestions based on market type.
 * Fetches initial data to prepare comprehensive context for analysis.
 */

import { normalizeSymbolForAPI, type MarketType } from "./symbolRegistry";

interface SymbolValidationResult {
  isValid: boolean;
  correctedSymbol?: string;
  assetName?: string;
  currentPrice?: number;
  sourceCurrency?: string; // Currency that Yahoo Finance/exchange provides the price in
  suggestions?: Array<{
    symbol: string;
    name: string;
    price?: number;
  }>;
  error?: string;
}

/*───────────────────────────────────────────────────────────────────────────────
  FOREX HELPERS (reliable detection + quote currency extraction)
───────────────────────────────────────────────────────────────────────────────*/

/**
 * Check if a symbol represents a forex pair (e.g., EURUSD, EUR/USD, EURUSD=X)
 * We normalize by removing "=X" and "/" and checking against known 3-letter codes.
 */
export function isForexPair(symbol: string): boolean {
  const cleaned = symbol
    .toUpperCase()
    .replace(/=X$/g, "")
    .replace(/\//g, "")
    .replace(/\s/g, "");

  // Must be exactly 6 letters like EURUSD, USDJPY, GBPINR, etc.
  if (!/^[A-Z]{6}$/.test(cleaned)) return false;

  const majors = new Set([
    "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
    "INR", "CNY", "HKD", "SGD", "KRW", "THB",
    "MXN", "BRL", "ARS", "CLP", "COP",
    "ZAR", "NGN", "KES", "EGP",
    "RUB", "TRY", "PLN", "HUF", "CZK", "RON",
    "SEK", "NOK", "DKK", "ISK",
    "ILS", "AED", "SAR", "QAR", "KWD",
    "PHP", "IDR", "MYR", "VND",
  ]);

  const base = cleaned.slice(0, 3);
  const quote = cleaned.slice(3, 6);
  return majors.has(base) && majors.has(quote);
}

/**
 * Extract quote currency (2nd currency) from forex pair
 * Examples:
 * - USD/GBP → GBP
 * - GBPUSD → USD
 * - EURUSD=X → USD
 */
export function getQuoteCurrency(symbol: string): string | null {
  const cleaned = symbol
    .toUpperCase()
    .replace(/=X$/g, "")
    .replace(/\//g, "")
    .replace(/\s/g, "");

  if (cleaned.length !== 6) return null;

  const majors = new Set([
    "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD",
    "INR", "CNY", "HKD", "SGD", "KRW", "THB",
    "MXN", "BRL", "ARS", "CLP", "COP",
    "ZAR", "NGN", "KES", "EGP",
    "RUB", "TRY", "PLN", "HUF", "CZK", "RON",
    "SEK", "NOK", "DKK", "ISK",
    "ILS", "AED", "SAR", "QAR", "KWD",
    "PHP", "IDR", "MYR", "VND",
  ]);

  const quote = cleaned.slice(3, 6);
  return majors.has(quote) ? quote : null;
}

/**
 * Get the currency that Yahoo Finance provides prices in for a given symbol.
 * Maps exchange suffixes to their native currencies.
 *
 * For forex pairs, returns the QUOTE CURRENCY (2nd currency in pair).
 * Never returns a placeholder string; falls back to "USD" if uncertain.
 */
export function getExchangeCurrency(symbol: string, market: string): string {
  // Forex pairs: quote currency (2nd currency) is the price currency
  if (market === "forex" || isForexPair(symbol)) {
    const quote = getQuoteCurrency(symbol);
    if (quote) {
      console.log(`[Forex] ${symbol} → Quote currency: ${quote}`);
      return quote;
    }
    return "USD";
  }

  // Crypto prices treated as USD in this pipeline
  if (market === "cryptocurrency") return "USD";

  const s = symbol.toUpperCase();

  // Commodity futures (=F) — Yahoo returns USD
  if (s.includes("=F")) return "USD";

  // Equities by suffix
  if (s.endsWith(".NS") || s.endsWith(".BO")) return "INR"; // India
  if (s.endsWith(".L")) return "GBP";  // London
  if (s.endsWith(".T")) return "JPY";  // Tokyo
  if (s.endsWith(".HK")) return "HKD"; // Hong Kong
  if (s.endsWith(".AX")) return "AUD"; // Australia
  if (s.endsWith(".TO")) return "CAD"; // Toronto
  if (s.endsWith(".SW")) return "CHF"; // Switzerland
  if (s.endsWith(".PA") || s.endsWith(".DE") || s.endsWith(".AS")) return "EUR"; // EU
  if (s.endsWith(".SI")) return "SGD"; // Singapore
  if (s.endsWith(".SR")) return "SAR"; // Saudi
  if (s.endsWith(".SA")) return "BRL"; // Brazil
  if (s.endsWith(".MX")) return "MXN"; // Mexico

  // Default for US/no suffix
  return "USD";
}

/*───────────────────────────────────────────────────────────────────────────────
  Lightweight crypto price cache (for CoinGecko fallback)
───────────────────────────────────────────────────────────────────────────────*/

interface CacheEntry {
  data: any;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60s

function getCachedPrice(coinGeckoId: string): number | null {
  const cached = priceCache.get(coinGeckoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Cache HIT] ${coinGeckoId}: $${cached.data}`);
    return cached.data;
  }
  return null;
}

function setCachedPrice(coinGeckoId: string, price: number): void {
  priceCache.set(coinGeckoId, { data: price, timestamp: Date.now() });
  console.log(`[Cache SET] ${coinGeckoId}: $${price}`);
}

/*───────────────────────────────────────────────────────────────────────────────
  CRYPTO VALIDATION + SUGGESTIONS
───────────────────────────────────────────────────────────────────────────────*/

async function validateCryptoSymbol(symbol: string): Promise<SymbolValidationResult> {
  try {
    const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    console.log(`[validateCrypto] Input symbol: "${symbol}" → Cleaned: "${cleanSymbol}"`);

    // Try direct Binance lookup (normalize to BASE + USDT)
    const base = cleanSymbol.replace(/USDT$/g, "").replace(/USD$/g, "");
    const binanceSymbol = `${base}USDT`;
    console.log(`[validateCrypto] Base: "${base}" → Binance: "${binanceSymbol}"`);

    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
      console.log(`[validateCrypto] Fetching: ${url}`);
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        return {
          isValid: true,
          correctedSymbol: binanceSymbol,
          assetName: cleanSymbol,
          currentPrice: parseFloat(data.price),
          sourceCurrency: "USD",
        };
      } else if (resp.status === 451) {
        console.log(`[validateCrypto] Binance blocked (451). Using CoinGecko fallback...`);
        return await validateCryptoAlternative(cleanSymbol, binanceSymbol);
      }
    } catch (e) {
      console.log(`[validateCrypto] Binance fetch error:`, e);
    }

    // Binance direct failed → suggestions
    const suggestions = await fetchCryptoSuggestions(cleanSymbol);
    if (suggestions.length) {
      return {
        isValid: false,
        suggestions,
        error: `Symbol "${symbol}" not found. Did you mean one of these?`,
      };
    }

    return { isValid: false, error: `Cryptocurrency symbol "${symbol}" not found.` };
  } catch (error: any) {
    return { isValid: false, error: `Failed to validate symbol: ${error.message}` };
  }
}

async function validateCryptoAlternative(cleanSymbol: string, binanceSymbol: string): Promise<SymbolValidationResult> {
  try {
    const coinGeckoMap: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      BNB: "binancecoin",
      XRP: "ripple",
      SOL: "solana",
      ADA: "cardano",
      DOGE: "dogecoin",
      MATIC: "matic-network",
      DOT: "polkadot",
      AVAX: "avalanche-2",
      LINK: "chainlink",
      UNI: "uniswap",
      ATOM: "cosmos",
      LTC: "litecoin",
      BCH: "bitcoin-cash",
    };

    const base = cleanSymbol.replace(/USDT$/g, "").replace(/USD$/g, "");
    const id = coinGeckoMap[base];

    if (id) {
      const cached = getCachedPrice(id);
      if (cached) {
        return {
          isValid: true,
          correctedSymbol: binanceSymbol,
          assetName: cleanSymbol,
          currentPrice: cached,
          sourceCurrency: "USD",
        };
      }

      const resp = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
      );
      if (resp.ok) {
        const data = await resp.json();
        const price = data?.[id]?.usd;
        if (price) {
          setCachedPrice(id, price);
          return {
            isValid: true,
            correctedSymbol: binanceSymbol,
            assetName: cleanSymbol,
            currentPrice: price,
            sourceCurrency: "USD",
          };
        }
      }
    }

    return {
      isValid: false,
      error: `Cryptocurrency "${cleanSymbol}" validation unavailable. Try: BTC, ETH, BNB, SOL, ADA`,
      suggestions: Object.keys(coinGeckoMap)
        .slice(0, 5)
        .map((sym) => ({ symbol: `${sym}USDT`, name: sym })),
    };
  } catch (e) {
    console.error("CoinGecko validation error:", e);
    return {
      isValid: false,
      error: `Cryptocurrency symbol validation failed. Please try common symbols like BTC, ETH, BNB.`,
    };
  }
}

async function fetchCryptoSuggestions(
  partialSymbol: string
): Promise<Array<{ symbol: string; name: string; price?: number }>> {
  try {
    const clean = partialSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const base = clean.replace(/USDT$/g, "").replace(/USD$/g, "");

    const resp = await fetch("https://api.binance.com/api/v3/ticker/price");
    if (!resp.ok) {
      const popular = ["BTC", "ETH", "BNB", "SOL", "ADA"];
      return popular
        .filter((s) => s.includes(base) || base.includes(s))
        .map((s) => ({ symbol: `${s}USDT`, name: s }));
    }

    const tickers = await resp.json();
    if (!Array.isArray(tickers)) return [];

    return tickers
      .filter((t: any) => String(t.symbol).endsWith("USDT"))
      .filter((t: any) => {
        const b = String(t.symbol).replace("USDT", "");
        return b.startsWith(base) || b.includes(base);
      })
      .slice(0, 5)
      .map((t: any) => ({
        symbol: t.symbol,
        name: String(t.symbol).replace("USDT", ""),
        price: parseFloat(t.price),
      }));
  } catch (e) {
    console.error("Error fetching crypto suggestions:", e);
    return [];
  }
}

/*───────────────────────────────────────────────────────────────────────────────
  YAHOO AUTOCOMPLETE FOR STOCK/FOREX/COMMODITIES
───────────────────────────────────────────────────────────────────────────────*/

async function fetchYahooSuggestions(
  partialSymbol: string
): Promise<Array<{ symbol: string; name: string; price?: number }>> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      partialSymbol
    )}&quotesCount=5&newsCount=0`;

    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!resp.ok) return [];

    const data = await resp.json();
    if (!data.quotes?.length) return [];

    const suggestions = data.quotes
      .filter((q: any) => q.symbol && (q.longname || q.shortname))
      .slice(0, 5)
      .map((q: any) => {
        let displaySymbol = q.symbol;
        let displayName = q.longname || q.shortname || q.symbol;

        // If it’s a futures symbol (=F), try to show the exchange prefix & friendly name
        if (String(q.symbol).toUpperCase().includes("=F")) {
          const base = String(q.symbol).replace(/=F$/i, "").toUpperCase();
          const ex = COMMODITY_FUTURES_EXCHANGE_MAP[base];
          const meta = COMMODITY_FUTURES_METADATA[base];

          if (ex) displaySymbol = `${ex}:${String(q.symbol).toUpperCase()}`;
          if (meta) displayName = `${meta.name} (${ex || "Futures"})`;
        }

        return {
          symbol: displaySymbol,
          name: displayName,
          price: q.regularMarketPrice ?? undefined,
        };
      });

    return suggestions;
  } catch (e) {
    console.error("Error fetching Yahoo suggestions:", e);
    return [];
  }
}

/*───────────────────────────────────────────────────────────────────────────────
  COMMODITY FUTURES EXCHANGE MAP + METADATA
───────────────────────────────────────────────────────────────────────────────*/

const COMMODITY_FUTURES_EXCHANGE_MAP: Record<string, string> = {
  // COMEX (CMX) — Metals
  GC: "CMX", // Gold
  SI: "CMX", // Silver
  HG: "CMX", // Copper
  PL: "NYM", // Platinum
  PA: "NYM", // Palladium

  // NYMEX (NYM) — Energy
  CL: "NYM", // Crude Oil (WTI)
  NG: "NYM", // Natural Gas
  RB: "NYM", // RBOB Gasoline
  HO: "NYM", // Heating Oil
  BZ: "NYM", // Brent

  // CBOT (CBT) — Agricultural
  ZC: "CBT", // Corn
  ZS: "CBT", // Soybeans
  ZW: "CBT", // Wheat
  ZL: "CBT", // Soybean Oil
  ZM: "CBT", // Soybean Meal
  KE: "CBT", // Kansas Wheat

  // CME — Livestock
  LE: "CME", // Live Cattle
  HE: "CME", // Lean Hogs
  GF: "CME", // Feeder Cattle
};

interface CommodityMetadata {
  name: string;
  minPrice: number;
  maxPrice: number;
  exchange: string;
  unit: string;
}

const COMMODITY_FUTURES_METADATA: Record<string, CommodityMetadata> = {
  GC: { name: "Gold Futures", minPrice: 1800, maxPrice: 3000, exchange: "COMEX", unit: "per troy ounce" },
  SI: { name: "Silver Futures", minPrice: 20, maxPrice: 50, exchange: "COMEX", unit: "per troy ounce" },
  HG: { name: "Copper Futures", minPrice: 3, maxPrice: 6, exchange: "COMEX", unit: "per pound" },
  PL: { name: "Platinum Futures", minPrice: 800, maxPrice: 1500, exchange: "NYMEX", unit: "per troy ounce" },
  PA: { name: "Palladium Futures", minPrice: 900, maxPrice: 3000, exchange: "NYMEX", unit: "per troy ounce" },

  CL: { name: "Crude Oil Futures (WTI)", minPrice: 50, maxPrice: 150, exchange: "NYMEX", unit: "per barrel" },
  NG: { name: "Natural Gas Futures", minPrice: 1.5, maxPrice: 10, exchange: "NYMEX", unit: "per MMBtu" },
  RB: { name: "RBOB Gasoline Futures", minPrice: 1.5, maxPrice: 5, exchange: "NYMEX", unit: "per gallon" },
  HO: { name: "Heating Oil Futures", minPrice: 1.5, maxPrice: 5, exchange: "NYMEX", unit: "per gallon" },
  BZ: { name: "Brent Crude Oil Futures", minPrice: 50, maxPrice: 150, exchange: "NYMEX", unit: "per barrel" },

  ZC: { name: "Corn Futures", minPrice: 3, maxPrice: 9, exchange: "CBOT", unit: "per bushel" },
  ZS: { name: "Soybean Futures", minPrice: 8, maxPrice: 18, exchange: "CBOT", unit: "per bushel" },
  ZW: { name: "Wheat Futures", minPrice: 4, maxPrice: 12, exchange: "CBOT", unit: "per bushel" },
  ZL: { name: "Soybean Oil Futures", minPrice: 30, maxPrice: 80, exchange: "CBOT", unit: "per pound" },
  ZM: { name: "Soybean Meal Futures", minPrice: 300, maxPrice: 550, exchange: "CBOT", unit: "per short ton" },
  KE: { name: "Kansas Wheat Futures", minPrice: 4, maxPrice: 12, exchange: "CBOT", unit: "per bushel" },

  LE: { name: "Live Cattle Futures", minPrice: 100, maxPrice: 200, exchange: "CME", unit: "per hundredweight" },
  HE: { name: "Lean Hogs Futures", minPrice: 50, maxPrice: 150, exchange: "CME", unit: "per hundredweight" },
  GF: { name: "Feeder Cattle Futures", minPrice: 150, maxPrice: 300, exchange: "CME", unit: "per hundredweight" },
};

/*───────────────────────────────────────────────────────────────────────────────
  COMMODITY HELPERS + MULTI-ENDPOINT YAHOO TESTS
───────────────────────────────────────────────────────────────────────────────*/

function addCommodityExchangePrefix(symbol: string): string {
  const base = symbol.replace(/=F$/i, "").toUpperCase();
  const ex = COMMODITY_FUTURES_EXCHANGE_MAP[base];
  if (ex) {
    const prefixed = `${ex}:${symbol.toUpperCase()}`;
    console.log(`🏛️ [EXCHANGE PREFIX] "${symbol}" → "${prefixed}" (${ex})`);
    return prefixed;
  }
  return symbol.toUpperCase();
}

async function testYahooChartAPI(
  testSymbol: string
): Promise<{ price: number; currency: string; name: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${testSymbol}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const res = data?.chart?.result?.[0];
    const meta = res?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    if (!price) return null;

    return { price, currency: meta?.currency || "USD", name: meta?.longName || testSymbol };
  } catch {
    return null;
  }
}

async function testYahooQuoteAPI(
  testSymbol: string
): Promise<{ price: number; currency: string; name: string } | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${testSymbol}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!resp.ok) return null;

    const data = await resp.json();
    const q = data?.quoteResponse?.result?.[0];
    const price = q?.regularMarketPrice ?? q?.previousClose;
    if (!price) return null;

    return { price, currency: q?.currency || "USD", name: q?.longName || q?.shortName || testSymbol };
  } catch {
    return null;
  }
}

async function testCommodityFuturesMultiEndpoint(symbol: string): Promise<{
  success: boolean;
  testedSymbol?: string;
  price?: number;
  currency?: string;
  name?: string;
  method?: string;
}> {
  const upper = symbol.toUpperCase();
  const prefixed = addCommodityExchangePrefix(symbol);

  const tests = [
    { s: prefixed, api: "chart", label: "Exchange prefix + Chart API" },
    { s: prefixed, api: "quote", label: "Exchange prefix + Quote API" },
    { s: upper, api: "chart", label: "No prefix + Chart API" },
    { s: upper, api: "quote", label: "No prefix + Quote API" },
  ] as const;

  for (const t of tests) {
    const result = t.api === "chart" ? await testYahooChartAPI(t.s) : await testYahooQuoteAPI(t.s);
    if (result) {
      return {
        success: true,
        testedSymbol: t.s,
        price: result.price,
        currency: result.currency,
        name: result.name,
        method: `${t.label} (${t.s})`,
      };
    }
  }

  return { success: false };
}

/*───────────────────────────────────────────────────────────────────────────────
  YAHOO VALIDATION (stocks/forex/commodities)
───────────────────────────────────────────────────────────────────────────────*/

async function validateYahooSymbol(symbol: string, market: string): Promise<SymbolValidationResult> {
  try {
    console.log(`\n🔍 [validateYahooSymbol] "${symbol}" (market: ${market})`);

    // Commodity futures route (e.g., SI=F)
    if (symbol.toUpperCase().includes("=F")) {
      const test = await testCommodityFuturesMultiEndpoint(symbol);
      if (!test.success) {
        const suggestions = await fetchYahooSuggestions(symbol);
        if (suggestions.length) {
          return {
            isValid: false,
            suggestions,
            error: `Commodity futures symbol "${symbol}" not found. Did you mean one of these?`,
          };
        }
        return {
          isValid: false,
          error:
            `Commodity futures symbol "${symbol}" not found. Use formats like GC=F (Gold), SI=F (Silver), CL=F (Crude Oil).`,
        };
      }

      const base = symbol.replace(/=F$/i, "").toUpperCase();
      const meta = COMMODITY_FUTURES_METADATA[base];
      const assetName = meta?.name || test.name;

      return {
        isValid: true,
        correctedSymbol: symbol.toUpperCase(), // preserve user’s format
        assetName,
        currentPrice: test.price,
        sourceCurrency: "USD",
      };
    }

    // Non-futures: normalize via registry
    const yahooSymbol = normalizeSymbolForAPI(symbol, market as MarketType);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });

    if (!resp.ok) {
      const suggestions = await fetchYahooSuggestions(symbol);
      if (suggestions.length) {
        return {
          isValid: false,
          suggestions,
          error: `Symbol "${symbol}" not found. Did you mean one of these?`,
        };
      }
      return { isValid: false, error: `Symbol "${symbol}" not found in ${market} market.` };
    }

    const data = await resp.json();
    const res = data?.chart?.result?.[0];
    if (!res) {
      const suggestions = await fetchYahooSuggestions(symbol);
      if (suggestions.length) {
        return {
          isValid: false,
          suggestions,
          error: `No data for "${symbol}". Did you mean one of these?`,
        };
      }
      return { isValid: false, error: `No data available for symbol "${symbol}".` };
    }

    const meta = res.meta;
    const sourceCurrency = getExchangeCurrency(yahooSymbol, market);
    const currentPrice = meta?.regularMarketPrice ?? meta?.previousClose;

    // Preserve user direction for forex; otherwise, use Yahoo-normalized
    const finalSymbol = market === "forex" && meta?.symbol && meta.symbol !== yahooSymbol
      ? symbol
      : yahooSymbol;

    const assetName = meta?.longName || yahooSymbol;

    return {
      isValid: true,
      correctedSymbol: finalSymbol,
      assetName,
      currentPrice,
      sourceCurrency,
    };
  } catch (error: any) {
    return { isValid: false, error: `Failed to validate symbol: ${error.message}` };
  }
}

/*───────────────────────────────────────────────────────────────────────────────
  PUBLIC API
───────────────────────────────────────────────────────────────────────────────*/

export async function validateSymbol(
  symbol: string,
  market: string
): Promise<SymbolValidationResult> {
  if (!symbol || !symbol.trim()) {
    return { isValid: false, error: "Please enter a symbol" };
  }

  if (market === "cryptocurrency") {
    return await validateCryptoSymbol(symbol);
  }
  return await validateYahooSymbol(symbol, market);
}
