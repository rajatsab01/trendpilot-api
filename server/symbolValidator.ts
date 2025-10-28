/**
 * Symbol Validation & Autocomplete Service
 * 
 * Validates trading symbols and provides suggestions based on market type.
 * Fetches initial data to prepare comprehensive context for analysis.
 */

import { normalizeSymbolForAPI, type MarketType, type SymbolClassification } from "./symbolRegistry";

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

/**
 * Check if a symbol represents a forex pair (e.g., CADUSD=X, EUR/USD, GBPUSD)
 * Forex pairs should NOT be converted to user's currency preference
 */
export function isForexPair(symbol: string): boolean {
  const upperSymbol = symbol.toUpperCase();
  
  // Yahoo Finance forex pairs end with =X
  if (upperSymbol.includes('=X')) {
    return true;
  }
  
  // Forex pairs with / separator
  if (upperSymbol.includes('/')) {
    return true;
  }
  
  // Common forex pair patterns (6-8 character currency pairs)
  // Examples: EURUSD, GBPJPY, USDINR, etc.
  const forexPairPattern = /^[A-Z]{6,8}$/;
  if (forexPairPattern.test(upperSymbol)) {
    // Check if it looks like XXXYYY where XXX and YYY are currency codes
    const commonCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'INR', 'CNY', 'HKD', 'SGD'];
    const firstThree = upperSymbol.substring(0, 3);
    const secondThree = upperSymbol.substring(3, 6);
    
    if (commonCurrencies.includes(firstThree) && commonCurrencies.includes(secondThree)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract quote currency (2nd currency) from forex pair
 * Examples:
 * - USD/GBP → GBP
 * - GBPUSD → USD
 * - EURUSD=X → USD
 */
export function getQuoteCurrency(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().replace(/=X$/g, '').replace(/\//g, '');
  
  // Check if it's a 6-character forex pair
  if (upperSymbol.length === 6) {
    // Comprehensive list of all supported currencies (expanded from 19 to 30+)
    const commonCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',  // Major currencies
      'INR', 'CNY', 'HKD', 'SGD', 'KRW', 'THB',                // Asian currencies
      'MXN', 'BRL', 'ARS', 'CLP', 'COP',                       // Latin American currencies
      'ZAR', 'NGN', 'KES', 'EGP',                              // African currencies
      'RUB', 'TRY', 'PLN', 'HUF', 'CZK', 'RON',              // Eastern European currencies
      'SEK', 'NOK', 'DKK', 'ISK',                              // Nordic currencies
      'ILS', 'AED', 'SAR', 'QAR', 'KWD',                       // Middle Eastern currencies
      'PHP', 'IDR', 'MYR', 'VND'                               // Southeast Asian currencies
    ];
    const quoteCurrency = upperSymbol.substring(3, 6);
    
    if (commonCurrencies.includes(quoteCurrency)) {
      return quoteCurrency;
    }
  }
  
  return null;
}

/**
 * Get the currency that Yahoo Finance provides prices in for a given symbol
 * Maps exchange suffixes to their native currencies
 * 
 * For forex pairs, returns the QUOTE CURRENCY (2nd currency in pair)
 * Examples:
 * - USD/GBP → GBP (price is in GBP)
 * - GBP/USD → USD (price is in USD)
 * - EUR/USD → USD (price is in USD)
 */
export function getExchangeCurrency(symbol: string, market: string): string {
  // Forex pairs: return the quote currency (2nd currency)
  // The pair price is always expressed in the quote currency
  if (market === 'forex' || isForexPair(symbol)) {
    const quoteCurrency = getQuoteCurrency(symbol);
    if (quoteCurrency) {
      console.log(`[Forex] ${symbol} → Quote currency: ${quoteCurrency}`);
      return quoteCurrency;
    }
    // Fallback: if we can't determine, return 'FOREX_PAIR' marker
    return 'FOREX_PAIR';
  }
  
  // Cryptocurrency prices are always in USD from Binance/CoinGecko
  if (market === 'cryptocurrency') {
    return 'USD';
  }
  
  // Check exchange suffix for stocks/commodities
  const upperSymbol = symbol.toUpperCase();
  
  // CRITICAL: Commodity futures (=F suffix) MUST be checked BEFORE exchange suffixes
  // to prevent false matches (e.g., SI=F should NOT match Singapore .SI)
  // ALL commodity futures from Yahoo Finance are priced in USD
  // Using .includes() instead of .endsWith() to catch any =F anywhere in the symbol
  if (upperSymbol.includes('=F')) {
    console.log(`[Commodity Futures] ${symbol} → Source currency: USD (=F suffix detected)`);
    return 'USD';
  }
  
  // ADDITIONAL SAFETY CHECK: If symbol starts with common commodity ticker + =F pattern
  // Examples: GC=F, SI=F, CL=F, NG=F, BZ=F, etc.
  const commodityFuturesPattern = /^[A-Z]{1,3}=F$/;
  if (commodityFuturesPattern.test(upperSymbol)) {
    console.log(`[Commodity Futures Pattern Match] ${symbol} → Source currency: USD`);
    return 'USD';
  }
  
  // Indian exchanges
  if (upperSymbol.endsWith('.NS') || upperSymbol.endsWith('.BO')) {
    return 'INR';
  }
  
  // UK exchange
  if (upperSymbol.endsWith('.L')) {
    return 'GBP';
  }
  
  // Tokyo exchange
  if (upperSymbol.endsWith('.T')) {
    return 'JPY';
  }
  
  // Hong Kong exchange
  if (upperSymbol.endsWith('.HK')) {
    return 'HKD';
  }
  
  // Australian exchange
  if (upperSymbol.endsWith('.AX')) {
    return 'AUD';
  }
  
  // Toronto exchange
  if (upperSymbol.endsWith('.TO')) {
    return 'CAD';
  }
  
  // Swiss exchange
  if (upperSymbol.endsWith('.SW')) {
    return 'CHF';
  }
  
  // European exchanges
  if (upperSymbol.endsWith('.PA') || upperSymbol.endsWith('.DE') || upperSymbol.endsWith('.AS')) {
    return 'EUR';
  }
  
  // Singapore exchange
  if (upperSymbol.endsWith('.SI')) {
    return 'SGD';
  }
  
  // Saudi Arabia exchange
  if (upperSymbol.endsWith('.SR')) {
    return 'SAR';
  }
  
  // Brazil exchange
  if (upperSymbol.endsWith('.SA')) {
    return 'BRL';
  }
  
  // Mexico exchange
  if (upperSymbol.endsWith('.MX')) {
    return 'MXN';
  }
  
  // Default to USD for US symbols (no suffix) and commodities
  return 'USD';
}

/**
 * Simple in-memory cache for crypto prices to avoid CoinGecko rate limits
 */
interface CacheEntry {
  data: any;
  timestamp: number;
}

const priceCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60000; // 60 seconds

function getCachedPrice(coinGeckoId: string): number | null {
  const cached = priceCache.get(coinGeckoId);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log(`[Cache HIT] ${coinGeckoId}: $${cached.data}`);
    return cached.data;
  }
  return null;
}

function setCachedPrice(coinGeckoId: string, price: number): void {
  priceCache.set(coinGeckoId, {
    data: price,
    timestamp: Date.now(),
  });
  console.log(`[Cache SET] ${coinGeckoId}: $${price}`);
}

/**
 * Validate cryptocurrency symbol and get suggestions
 */
async function validateCryptoSymbol(symbol: string): Promise<SymbolValidationResult> {
  try {
    const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    console.log(`[validateCrypto] Input symbol: "${symbol}" → Cleaned: "${cleanSymbol}"`);
    
    // Try direct Binance lookup
    // Remove USD/USDT suffix first, then add USDT properly
    let baseSymbol = cleanSymbol
      .replace(/USDT$/g, "")  // Remove USDT suffix
      .replace(/USD$/g, "");   // Remove USD suffix
    
    let binanceSymbol = `${baseSymbol}USDT`;
    console.log(`[validateCrypto] Base symbol: "${baseSymbol}" → Binance symbol: "${binanceSymbol}"`);
    
    try {
      const tickerUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
      console.log(`[validateCrypto] Fetching: ${tickerUrl}`);
      const response = await fetch(tickerUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[validateCrypto] ✅ Found on Binance:`, data);
        return {
          isValid: true,
          correctedSymbol: binanceSymbol,
          assetName: cleanSymbol, // Will be enriched by Perplexity
          currentPrice: parseFloat(data.price),
          sourceCurrency: 'USD', // Crypto prices are always in USD
        };
      } else if (response.status === 451) {
        // Binance blocked by region - try alternative approach using CoinGecko API
        console.log(`[validateCrypto] ⚠️ Binance blocked (451). Trying alternative...`);
        return await validateCryptoAlternative(cleanSymbol, binanceSymbol);
      } else {
        console.log(`[validateCrypto] ❌ Binance response not OK: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.log(`[validateCrypto] ⚠️ Binance fetch error:`, err);
      // Symbol not found, continue to suggestions
    }
    
    // Symbol not found directly - fetch popular crypto suggestions
    console.log(`[validateCrypto] Fetching suggestions for: "${cleanSymbol}"`);
    const suggestions = await fetchCryptoSuggestions(cleanSymbol);
    console.log(`[validateCrypto] Found ${suggestions.length} suggestions:`, suggestions);
    
    if (suggestions.length > 0) {
      return {
        isValid: false,
        suggestions,
        error: `Symbol "${symbol}" not found. Did you mean one of these?`,
      };
    }
    
    return {
      isValid: false,
      error: `Cryptocurrency symbol "${symbol}" not found. Please check the spelling.`,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Failed to validate symbol: ${error.message}`,
    };
  }
}

/**
 * Alternative crypto validation using CoinGecko (when Binance is blocked)
 */
async function validateCryptoAlternative(cleanSymbol: string, binanceSymbol: string): Promise<SymbolValidationResult> {
  try {
    // Use CoinGecko for popular cryptocurrencies
    const coinGeckoMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'XRP': 'ripple',
      'SOL': 'solana',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'MATIC': 'matic-network',
      'DOT': 'polkadot',
      'AVAX': 'avalanche-2',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
    };
    
    const baseSymbol = cleanSymbol
      .replace(/USDT$/g, "")
      .replace(/USD$/g, "");
    
    const coinGeckoId = coinGeckoMap[baseSymbol];
    
    if (coinGeckoId) {
      // Check cache first
      const cachedPrice = getCachedPrice(coinGeckoId);
      if (cachedPrice) {
        return {
          isValid: true,
          correctedSymbol: binanceSymbol,
          assetName: cleanSymbol,
          currentPrice: cachedPrice,
          sourceCurrency: 'USD', // Crypto prices are always in USD
        };
      }
      
      // Fetch from CoinGecko if not cached
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`
      );
      
      if (response.ok) {
        const data = await response.json();
        const price = data[coinGeckoId]?.usd;
        
        if (price) {
          console.log(`[validateCrypto] ✅ Found on CoinGecko:`, data);
          setCachedPrice(coinGeckoId, price);
          return {
            isValid: true,
            correctedSymbol: binanceSymbol,
            assetName: cleanSymbol,
            currentPrice: price,
            sourceCurrency: 'USD', // Crypto prices are always in USD
          };
        }
      } else {
        console.log(`[validateCrypto] ⚠️ CoinGecko error: ${response.status}`);
      }
    }
    
    // If not found, return basic validation with popular crypto suggestions
    return {
      isValid: false,
      error: `Cryptocurrency "${cleanSymbol}" validation unavailable. Try: BTC, ETH, BNB, SOL, ADA`,
      suggestions: Object.keys(coinGeckoMap).slice(0, 5).map(sym => ({
        symbol: `${sym}USDT`,
        name: sym,
        price: undefined,
      })),
    };
  } catch (error) {
    console.error("CoinGecko validation error:", error);
    return {
      isValid: false,
      error: `Cryptocurrency symbol validation failed. Please try common symbols like BTC, ETH, BNB.`,
    };
  }
}

/**
 * Fetch cryptocurrency suggestions based on partial symbol
 */
async function fetchCryptoSuggestions(partialSymbol: string): Promise<Array<{ symbol: string; name: string; price?: number }>> {
  try {
    // Clean the input and extract base symbol
    const cleanInput = partialSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const baseSymbol = cleanInput
      .replace(/USDT$/g, "")
      .replace(/USD$/g, "");
    
    // Fetch all USDT trading pairs from Binance
    const response = await fetch("https://api.binance.com/api/v3/ticker/price");
    
    if (!response.ok) {
      // Binance blocked - return popular crypto suggestions
      console.log(`[fetchCryptoSuggestions] Binance blocked, returning popular cryptos`);
      const popular = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'];
      return popular
        .filter(sym => sym.includes(baseSymbol) || baseSymbol.includes(sym))
        .map(sym => ({
          symbol: `${sym}USDT`,
          name: sym,
          price: undefined,
        }));
    }
    
    const allTickers = await response.json();
    
    // Ensure it's an array
    if (!Array.isArray(allTickers)) {
      console.error(`[fetchCryptoSuggestions] Binance did not return array:`, allTickers);
      return [];
    }
    
    // Filter USDT pairs that match the base symbol
    const matches = allTickers
      .filter((ticker: any) => {
        const sym = ticker.symbol;
        if (!sym.endsWith("USDT")) return false;
        
        // Extract base from ticker (e.g., "BTCUSDT" -> "BTC")
        const tickerBase = sym.replace("USDT", "");
        
        // Match if ticker base starts with user input or contains it
        return tickerBase.startsWith(baseSymbol) || tickerBase.includes(baseSymbol);
      })
      .slice(0, 5) // Limit to 5 suggestions
      .map((ticker: any) => {
        const symbol = ticker.symbol; // e.g., "BNBUSDT"
        const name = symbol.replace("USDT", ""); // e.g., "BNB"
        return {
          symbol: symbol, // Full Binance symbol: BNBUSDT
          name: name, // Display name: BNB
          price: parseFloat(ticker.price),
        };
      });
    
    return matches;
  } catch (error) {
    console.error("Error fetching crypto suggestions:", error);
    return [];
  }
}

/**
 * Fetch stock/forex/commodity suggestions from Yahoo Finance
 */
async function fetchYahooSuggestions(partialSymbol: string): Promise<Array<{ symbol: string; name: string; price?: number }>> {
  try {
    // Use Yahoo Finance autocomplete/search API
    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(partialSymbol)}&quotesCount=5&newsCount=0`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      return [];
    }
    
    const data = await response.json();
    
    if (!data.quotes || data.quotes.length === 0) {
      return [];
    }
    
    // Return top 5 matches with symbol, name, and price
    // Accept results with either longname or shortname for broader coverage
    const suggestions = data.quotes
      .filter((quote: any) => quote.symbol && (quote.longname || quote.shortname))
      .slice(0, 5)
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        price: quote.regularMarketPrice || undefined,
      }));
    
    return suggestions;
  } catch (error) {
    console.error("Error fetching Yahoo suggestions:", error);
    return [];
  }
}

/**
 * Validate stock/forex/commodity symbol using Yahoo Finance
 */
async function validateYahooSymbol(symbol: string, market: string): Promise<SymbolValidationResult> {
  try {
    console.log(`\n🔍 [validateYahooSymbol] Input: "${symbol}" (market: ${market})`);
    
    // CRITICAL SHORT-CIRCUIT: Commodity futures symbols BYPASS normalization entirely
    // This prevents any aliasing that could convert SI=F to SI.SI
    const isCommodityFutures = symbol.toUpperCase().includes('=F');
    let yahooSymbol: string;
    
    if (isCommodityFutures) {
      // Use original symbol directly, only uppercasing it
      yahooSymbol = symbol.toUpperCase();
      console.log(`🛡️ [FUTURES SHORT-CIRCUIT] Commodity futures detected - bypassing normalization`);
      console.log(`📤 [validateYahooSymbol] Using original symbol: "${yahooSymbol}" (NO normalization)`);
    } else {
      // Use unified symbol normalization from symbolRegistry for non-futures
      // Classification is auto-detected based on symbol pattern and market type
      yahooSymbol = normalizeSymbolForAPI(symbol, market as MarketType);
      console.log(`📤 [validateYahooSymbol] Normalized symbol: "${symbol}" → "${yahooSymbol}"`);
    }
    
    // Try fetching from Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      // Symbol not found - fetch suggestions
      const suggestions = await fetchYahooSuggestions(symbol);
      
      if (suggestions.length > 0) {
        return {
          isValid: false,
          suggestions,
          error: `Symbol "${symbol}" not found. Did you mean one of these?`,
        };
      }
      
      return {
        isValid: false,
        error: `Symbol "${symbol}" not found in ${market} market. Please verify the symbol.`,
      };
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      // No data available - fetch suggestions
      const suggestions = await fetchYahooSuggestions(symbol);
      
      if (suggestions.length > 0) {
        return {
          isValid: false,
          suggestions,
          error: `No data available for symbol "${symbol}". Did you mean one of these?`,
        };
      }
      
      return {
        isValid: false,
        error: `No data available for symbol "${symbol}".`,
      };
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    
    console.log(`📥 [validateYahooSymbol] Yahoo returned symbol: "${meta.symbol || yahooSymbol}"`);
    console.log(`📥 [validateYahooSymbol] Yahoo meta.currency: "${meta.currency}"`);
    console.log(`📥 [validateYahooSymbol] Asset name: "${meta.longName || yahooSymbol}"`);
    
    // CRITICAL RESPONSE VALIDATION: If we requested a futures symbol, verify Yahoo didn't alias it
    if (isCommodityFutures) {
      const yahooReturnedSymbol = (meta.symbol || yahooSymbol).toUpperCase();
      if (!yahooReturnedSymbol.includes('=F')) {
        console.error(`❌ [YAHOO ALIAS CORRUPTION] Requested "${yahooSymbol}" but Yahoo returned "${meta.symbol}"`);
        console.error(`⚠️ Yahoo Finance aliased the futures contract. This will cause incorrect pricing.`);
        return {
          isValid: false,
          error: `Yahoo Finance returned incorrect data for commodity futures ${yahooSymbol}. Please verify the symbol is correct.`,
        };
      }
      console.log(`✅ [FUTURES VALIDATION] Yahoo preserved =F suffix in response`);
    }
    
    // Determine the currency this exchange provides prices in
    let sourceCurrency = getExchangeCurrency(yahooSymbol, market);
    
    // CRITICAL DEFENSIVE CHECK: Commodity futures (=F suffix) MUST ALWAYS be in USD
    // This prevents Yahoo Finance from returning wrong exchange data (e.g., SI=F → SGD instead of USD)
    if (isCommodityFutures) {
      console.log(`🛡️ [COMMODITY FUTURES GUARD] Symbol "${yahooSymbol}" has =F suffix - FORCING USD currency`);
      if (sourceCurrency !== 'USD') {
        console.error(`⚠️ [CURRENCY MISMATCH] getExchangeCurrency returned "${sourceCurrency}" for "${yahooSymbol}" but =F suffix requires USD. Overriding to USD.`);
      }
      if (meta.currency && meta.currency !== 'USD') {
        console.error(`⚠️ [YAHOO CURRENCY MISMATCH] Yahoo meta.currency is "${meta.currency}" but futures must be USD. Overriding.`);
      }
      sourceCurrency = 'USD'; // Force USD for all commodity futures
    }
    
    console.log(`💱 [validateYahooSymbol] Source currency: ${sourceCurrency}`);
    
    // IMPORTANT: Preserve user's original symbol direction for forex pairs
    // Yahoo may return a different symbol (e.g., GBPUSD=X when we asked for USDGBP=X)
    // But we want to keep the user's intent for display purposes
    const shouldPreserveUserSymbol = market === 'forex' && meta.symbol && meta.symbol !== yahooSymbol;
    const finalSymbol = shouldPreserveUserSymbol ? symbol : yahooSymbol;
    
    console.log(`✅ [validateYahooSymbol] Final corrected symbol: "${finalSymbol}" ${shouldPreserveUserSymbol ? '(preserved user direction)' : ''}`);
    
    return {
      isValid: true,
      correctedSymbol: finalSymbol,
      assetName: meta.longName || yahooSymbol,
      currentPrice: meta.regularMarketPrice || meta.previousClose,
      sourceCurrency: sourceCurrency,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: `Failed to validate symbol: ${error.message}`,
    };
  }
}

/**
 * Main validation function
 */
export async function validateSymbol(
  symbol: string,
  market: string
): Promise<SymbolValidationResult> {
  if (!symbol || symbol.trim().length === 0) {
    return {
      isValid: false,
      error: "Please enter a symbol",
    };
  }
  
  if (market === "cryptocurrency") {
    return await validateCryptoSymbol(symbol);
  } else {
    return await validateYahooSymbol(symbol, market);
  }
}
