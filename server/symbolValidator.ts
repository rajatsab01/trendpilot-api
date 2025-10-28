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
 * Commodity futures exchange mapping
 * Maps commodity futures symbols to their trading exchanges for proper Yahoo Finance resolution
 */
const COMMODITY_FUTURES_EXCHANGE_MAP: Record<string, string> = {
  // COMEX (Commodities Exchange) - Metals
  'GC': 'COMEX',  // Gold
  'SI': 'COMEX',  // Silver
  'HG': 'COMEX',  // Copper
  'PL': 'NYMEX',  // Platinum (sometimes listed under NYMEX)
  'PA': 'NYMEX',  // Palladium
  
  // NYMEX (New York Mercantile Exchange) - Energy
  'CL': 'NYMEX',  // Crude Oil
  'NG': 'NYMEX',  // Natural Gas
  'RB': 'NYMEX',  // RBOB Gasoline
  'HO': 'NYMEX',  // Heating Oil
  'BZ': 'NYMEX',  // Brent Crude
  
  // CBOT (Chicago Board of Trade) - Agricultural
  'ZC': 'CBOT',   // Corn
  'ZS': 'CBOT',   // Soybeans
  'ZW': 'CBOT',   // Wheat
  'ZL': 'CBOT',   // Soybean Oil
  'ZM': 'CBOT',   // Soybean Meal
  'KE': 'CBOT',   // Kansas Wheat
  
  // CME (Chicago Mercantile Exchange) - Livestock & Others
  'LE': 'CME',    // Live Cattle
  'HE': 'CME',    // Lean Hogs
  'GF': 'CME',    // Feeder Cattle
};

/**
 * Commodity futures metadata with full names and expected price ranges
 * Used to help Yahoo Finance disambiguate symbols and validate returned prices
 */
interface CommodityMetadata {
  name: string;           // Full descriptive name (e.g., "Silver Futures")
  minPrice: number;       // Minimum expected price in USD
  maxPrice: number;       // Maximum expected price in USD
  exchange: string;       // Trading exchange
  unit: string;           // Trading unit description
}

const COMMODITY_FUTURES_METADATA: Record<string, CommodityMetadata> = {
  // Precious Metals - COMEX
  'GC': {
    name: 'Gold Futures',
    minPrice: 1800,
    maxPrice: 3000,
    exchange: 'COMEX',
    unit: 'per troy ounce'
  },
  'SI': {
    name: 'Silver Futures',
    minPrice: 20,
    maxPrice: 50,
    exchange: 'COMEX',
    unit: 'per troy ounce'
  },
  'HG': {
    name: 'Copper Futures',
    minPrice: 3,
    maxPrice: 6,
    exchange: 'COMEX',
    unit: 'per pound'
  },
  'PL': {
    name: 'Platinum Futures',
    minPrice: 800,
    maxPrice: 1500,
    exchange: 'NYMEX',
    unit: 'per troy ounce'
  },
  'PA': {
    name: 'Palladium Futures',
    minPrice: 900,
    maxPrice: 3000,
    exchange: 'NYMEX',
    unit: 'per troy ounce'
  },
  
  // Energy - NYMEX
  'CL': {
    name: 'Crude Oil Futures (WTI)',
    minPrice: 50,
    maxPrice: 150,
    exchange: 'NYMEX',
    unit: 'per barrel'
  },
  'NG': {
    name: 'Natural Gas Futures',
    minPrice: 1.5,
    maxPrice: 10,
    exchange: 'NYMEX',
    unit: 'per MMBtu'
  },
  'RB': {
    name: 'RBOB Gasoline Futures',
    minPrice: 1.5,
    maxPrice: 5,
    exchange: 'NYMEX',
    unit: 'per gallon'
  },
  'HO': {
    name: 'Heating Oil Futures',
    minPrice: 1.5,
    maxPrice: 5,
    exchange: 'NYMEX',
    unit: 'per gallon'
  },
  'BZ': {
    name: 'Brent Crude Oil Futures',
    minPrice: 50,
    maxPrice: 150,
    exchange: 'NYMEX',
    unit: 'per barrel'
  },
  
  // Agricultural - CBOT
  'ZC': {
    name: 'Corn Futures',
    minPrice: 3,
    maxPrice: 9,
    exchange: 'CBOT',
    unit: 'per bushel'
  },
  'ZS': {
    name: 'Soybean Futures',
    minPrice: 8,
    maxPrice: 18,
    exchange: 'CBOT',
    unit: 'per bushel'
  },
  'ZW': {
    name: 'Wheat Futures',
    minPrice: 4,
    maxPrice: 12,
    exchange: 'CBOT',
    unit: 'per bushel'
  },
  'ZL': {
    name: 'Soybean Oil Futures',
    minPrice: 30,
    maxPrice: 80,
    exchange: 'CBOT',
    unit: 'per pound'
  },
  'ZM': {
    name: 'Soybean Meal Futures',
    minPrice: 300,
    maxPrice: 550,
    exchange: 'CBOT',
    unit: 'per short ton'
  },
  'KE': {
    name: 'Kansas Wheat Futures',
    minPrice: 4,
    maxPrice: 12,
    exchange: 'CBOT',
    unit: 'per bushel'
  },
  
  // Livestock - CME
  'LE': {
    name: 'Live Cattle Futures',
    minPrice: 100,
    maxPrice: 200,
    exchange: 'CME',
    unit: 'per hundredweight'
  },
  'HE': {
    name: 'Lean Hogs Futures',
    minPrice: 50,
    maxPrice: 150,
    exchange: 'CME',
    unit: 'per hundredweight'
  },
  'GF': {
    name: 'Feeder Cattle Futures',
    minPrice: 150,
    maxPrice: 300,
    exchange: 'CME',
    unit: 'per hundredweight'
  },
};

/**
 * Validate commodity futures price is within expected range
 * Returns null if valid, error message if invalid
 */
function validateCommodityPrice(symbol: string, price: number): string | null {
  const baseSymbol = symbol.replace(/=F$/i, '').toUpperCase();
  const metadata = COMMODITY_FUTURES_METADATA[baseSymbol];
  
  if (!metadata) {
    // Unknown commodity - skip validation
    console.log(`⚠️ [COMMODITY VALIDATION] No metadata for "${baseSymbol}" - skipping price validation`);
    return null;
  }
  
  console.log(`🔍 [COMMODITY VALIDATION] Checking "${symbol}": $${price} USD`);
  console.log(`📊 [COMMODITY VALIDATION] Expected range for ${metadata.name}: $${metadata.minPrice}-${metadata.maxPrice} USD`);
  
  if (price < metadata.minPrice || price > metadata.maxPrice) {
    console.error(`❌ [PRICE OUT OF RANGE] ${symbol} price $${price} is outside expected range $${metadata.minPrice}-${metadata.maxPrice}`);
    console.error(`⚠️ Yahoo Finance may have returned data for wrong asset!`);
    return `Price $${price} USD is outside expected range for ${metadata.name} ($${metadata.minPrice}-${metadata.maxPrice} ${metadata.unit}). Yahoo Finance may have returned incorrect data. Please verify the symbol.`;
  }
  
  console.log(`✅ [PRICE VALID] ${symbol} price $${price} is within expected range`);
  return null;
}

/**
 * Add exchange prefix to commodity futures symbols for Yahoo Finance
 * This helps resolve ambiguous 2-letter symbols like SI=F (Silver) which might
 * otherwise be confused with stock symbols or other exchanges
 */
function addCommodityExchangePrefix(symbol: string): string {
  // Extract the base symbol (remove =F suffix)
  const baseSymbol = symbol.replace(/=F$/i, '').toUpperCase();
  
  // Check if we have a mapping for this symbol
  const exchange = COMMODITY_FUTURES_EXCHANGE_MAP[baseSymbol];
  
  if (exchange) {
    // Return with exchange prefix: COMEX:SI=F
    const prefixedSymbol = `${exchange}:${symbol.toUpperCase()}`;
    console.log(`🏛️ [EXCHANGE PREFIX] Mapped "${symbol}" → "${prefixedSymbol}" (${exchange} exchange)`);
    return prefixedSymbol;
  }
  
  // No mapping found - return original symbol
  console.log(`⚠️ [NO EXCHANGE MAPPING] Symbol "${symbol}" not in exchange map, using as-is`);
  return symbol.toUpperCase();
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
      // Use original symbol directly (Yahoo Finance doesn't accept exchange prefixes like "COMEX:SI=F")
      yahooSymbol = symbol.toUpperCase();
      console.log(`🛡️ [FUTURES SHORT-CIRCUIT] Commodity futures detected - bypassing normalization`);
      console.log(`📤 [validateYahooSymbol] Using original futures symbol: "${yahooSymbol}" (NO exchange prefix)`);
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
    
    // Get current price from Yahoo
    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    
    // COMMODITY FUTURES PRICE VALIDATION
    // Validate the price is within expected range for the commodity
    if (isCommodityFutures) {
      const priceError = validateCommodityPrice(yahooSymbol, currentPrice);
      if (priceError) {
        // Price is out of range - Yahoo returned wrong asset!
        return {
          isValid: false,
          error: priceError,
        };
      }
    }
    
    // Determine final symbol for display
    let finalSymbol: string;
    
    if (isCommodityFutures) {
      // For commodity futures, always use the user's original input (without exchange prefix)
      // User entered "SI=F", we queried "COMEX:SI=F", but we want to show "SI=F"
      finalSymbol = symbol.toUpperCase();
      console.log(`✅ [validateYahooSymbol] Commodity futures - using user's original symbol: "${finalSymbol}"`);
    } else if (market === 'forex' && meta.symbol && meta.symbol !== yahooSymbol) {
      // For forex pairs, preserve user's original direction
      // Yahoo may return a different symbol (e.g., GBPUSD=X when we asked for USDGBP=X)
      finalSymbol = symbol;
      console.log(`✅ [validateYahooSymbol] Forex pair - preserved user direction: "${finalSymbol}"`);
    } else {
      // For other markets, use Yahoo's normalized symbol
      finalSymbol = yahooSymbol;
      console.log(`✅ [validateYahooSymbol] Using Yahoo's normalized symbol: "${finalSymbol}"`);
    }
    
    // Enhanced asset name for commodities - use full descriptive name from metadata
    let assetName = meta.longName || yahooSymbol;
    if (isCommodityFutures) {
      const baseSymbol = yahooSymbol.replace(/=F$/i, '').toUpperCase();
      const metadata = COMMODITY_FUTURES_METADATA[baseSymbol];
      if (metadata) {
        assetName = metadata.name;
        console.log(`📝 [COMMODITY NAME] Using metadata name: "${assetName}"`);
      }
    }
    
    return {
      isValid: true,
      correctedSymbol: finalSymbol,
      assetName: assetName,
      currentPrice: currentPrice,
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
