/**
 * Price Data Fetching Service
 * 
 * Fetches accurate real-time + closed candle prices from:
 * - Yahoo Finance (stocks, forex, commodities, bonds)
 * - Binance (cryptocurrencies)
 * 
 * NO API KEYS REQUIRED - Completely FREE!
 */

import { normalizeSymbolForAPI, type MarketType, type SymbolClassification } from "./symbolRegistry";

interface OHLCVData {
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
}

/**
 * Get appropriate timeframe based on duration
 */
function getTimeframeForDuration(duration: string): { interval: string; label: string } {
  switch (duration) {
    case "scalping":
      return { interval: "15m", label: "15min" };
    case "short_term":
      return { interval: "1h", label: "1hr" };
    case "long_term":
      return { interval: "1d", label: "1day" };
    default:
      return { interval: "1h", label: "1hr" };
  }
}

/**
 * Fetch cryptocurrency prices from Binance with CoinGecko fallback
 * Completely FREE - no API key required
 */
async function fetchCryptoPrice(
  symbol: string,
  duration: string
): Promise<OHLCVData> {
  const { interval, label } = getTimeframeForDuration(duration);
  
  // Convert symbol to Binance format (e.g., "BTC" -> "BTCUSDT", "ETH" -> "ETHUSDT")
  let cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Remove USD/USDT suffix to get base symbol
  const baseSymbol = cleanSymbol
    .replace(/USDT$/g, "")
    .replace(/USD$/g, "");
  
  // Construct Binance symbol
  let binanceSymbol = `${baseSymbol}USDT`;
  
  // Fallback conversions for common symbols
  const symbolMap: Record<string, string> = {
    "BTC": "BTCUSDT",
    "BITCOIN": "BTCUSDT",
    "ETH": "ETHUSDT",
    "ETHEREUM": "ETHUSDT",
    "BNB": "BNBUSDT",
    "SOL": "SOLUSDT",
    "SOLANA": "SOLUSDT",
    "XRP": "XRPUSDT",
    "ADA": "ADAUSDT",
    "CARDANO": "ADAUSDT",
    "DOGE": "DOGEUSDT",
    "DOGECOIN": "DOGEUSDT",
    "1INCH": "1INCHUSDT",
    "1000SATS": "1000SATSUSDT",
    "AVAX": "AVAXUSDT",
    "MATIC": "MATICUSDT",
    "LINK": "LINKUSDT",
    "DOT": "DOTUSDT",
  };
  
  if (symbolMap[baseSymbol]) {
    binanceSymbol = symbolMap[baseSymbol];
  }
  
  console.log(`[fetchCryptoPrice] Symbol: "${symbol}" → Base: "${baseSymbol}" → Binance: "${binanceSymbol}"`);
  
  // Try Binance first (will fail with 451 on Replit)
  try {
    const tickerUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
    const tickerResponse = await fetch(tickerUrl);
    
    if (tickerResponse.status === 451) {
      console.log(`[fetchCryptoPrice] Binance blocked (451), falling back to CoinGecko`);
      return await fetchCryptoPriceFromCoinGecko(baseSymbol, binanceSymbol, interval, label);
    }
    
    if (!tickerResponse.ok) {
      throw new Error(`Binance ticker API error: ${tickerResponse.status}`);
    }
    
    const tickerData = await tickerResponse.json();
    const livePrice = parseFloat(tickerData.price);
    
    // Fetch OHLCV candle data
    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=2`;
    const klinesResponse = await fetch(klinesUrl);
    
    if (!klinesResponse.ok) {
      throw new Error(`Binance klines API error: ${klinesResponse.status}`);
    }
    
    const klinesData = await klinesResponse.json();
    const closedCandle = klinesData[klinesData.length - 2];
    
    if (!closedCandle) {
      throw new Error("No closed candle data available");
    }
    
    const candleCloseTime = new Date(closedCandle[6]).toISOString().replace('T', ' ').replace('Z', ' UTC');
    
    return {
      symbol: binanceSymbol,
      livePrice: livePrice,
      candleClosePrice: parseFloat(closedCandle[4]),
      candleCloseTime,
      timeframe: label,
      open: parseFloat(closedCandle[1]),
      high: parseFloat(closedCandle[2]),
      low: parseFloat(closedCandle[3]),
      close: parseFloat(closedCandle[4]),
      volume: parseFloat(closedCandle[5]),
      dataSource: "Binance",
    };
  } catch (error: any) {
    console.error(`❌ Binance API error for symbol "${symbol}":`, error.message);
    console.log(`[fetchCryptoPrice] Attempting CoinGecko fallback...`);
    return await fetchCryptoPriceFromCoinGecko(baseSymbol, binanceSymbol, interval, label);
  }
}

/**
 * Fetch crypto price from CoinGecko (fallback when Binance is blocked)
 */
async function fetchCryptoPriceFromCoinGecko(
  baseSymbol: string,
  binanceSymbol: string,
  interval: string,
  label: string
): Promise<OHLCVData> {
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
  
  const coinGeckoId = coinGeckoMap[baseSymbol];
  
  if (!coinGeckoId) {
    throw new Error(`Cryptocurrency "${baseSymbol}" not supported. Supported: ${Object.keys(coinGeckoMap).join(', ')}`);
  }
  
  try {
    // Fetch current price from CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const currentPrice = data[coinGeckoId]?.usd;
    
    if (!currentPrice) {
      throw new Error(`No price data found for ${baseSymbol}`);
    }
    
    console.log(`[CoinGecko] ✅ Fetched ${baseSymbol}: $${currentPrice}`);
    
    // For CoinGecko, we only get current price, not historical candles
    // Use current price as both live and close price
    const now = new Date();
    const candleCloseTime = now.toISOString().replace('T', ' ').replace('Z', ' UTC');
    
    return {
      symbol: binanceSymbol,
      livePrice: currentPrice,
      candleClosePrice: currentPrice, // Same as live for CoinGecko
      candleCloseTime,
      timeframe: label,
      open: currentPrice,
      high: currentPrice,
      low: currentPrice,
      close: currentPrice,
      volume: 0, // No volume data from CoinGecko simple API
      dataSource: "CoinGecko",
    };
  } catch (error: any) {
    console.error(`❌ CoinGecko API error for symbol "${baseSymbol}":`, error.message);
    throw new Error(`Failed to fetch crypto price for "${baseSymbol}": ${error.message}`);
  }
}

/**
 * Fetch stock/forex/commodity prices from Yahoo Finance
 * Completely FREE - no API key required
 */
async function fetchYahooFinancePrice(
  symbol: string,
  duration: string,
  market: string
): Promise<OHLCVData> {
  try {
    const { interval, label } = getTimeframeForDuration(duration);
    
    // Yahoo Finance interval mapping
    const yahooIntervalMap: Record<string, string> = {
      "15m": "15m",
      "1h": "1h",
      "1d": "1d",
    };
    
    const yahooInterval = yahooIntervalMap[interval] || "1h";
    
    // Use unified symbol normalization from symbolRegistry
    // This ensures consistent transformation logic across the entire codebase
    // Classification is auto-detected based on symbol pattern and market type
    const yahooSymbol = normalizeSymbolForAPI(symbol, market as MarketType);
    
    // Fetch chart data from Yahoo Finance
    const range = duration === "long_term" ? "1mo" : duration === "short_term" ? "5d" : "1d";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yahooInterval}&range=${range}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
      throw new Error("No data returned from Yahoo Finance");
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    const timestamps = result.timestamp;
    
    if (!timestamps || timestamps.length === 0) {
      throw new Error("No timestamp data available");
    }
    
    // Live price from meta
    const livePrice = meta.regularMarketPrice || meta.previousClose;
    
    // Get the last CLOSED candle (second-to-last timestamp)
    const closedCandleIndex = timestamps.length >= 2 ? timestamps.length - 2 : timestamps.length - 1;
    
    const candleCloseTime = new Date(timestamps[closedCandleIndex] * 1000).toISOString().replace('T', ' ').replace('Z', ' UTC');
    
    return {
      symbol: yahooSymbol,
      livePrice: livePrice,
      candleClosePrice: quote.close[closedCandleIndex],
      candleCloseTime,
      timeframe: label,
      open: quote.open[closedCandleIndex],
      high: quote.high[closedCandleIndex],
      low: quote.low[closedCandleIndex],
      close: quote.close[closedCandleIndex],
      volume: quote.volume[closedCandleIndex],
      dataSource: "Yahoo Finance",
    };
  } catch (error: any) {
    console.error(`❌ Yahoo Finance API error for symbol "${symbol}" (${market} market):`, error.message);
    throw new Error(`Failed to fetch ${market} price for "${symbol}": ${error.message}`);
  }
}

/**
 * Main function to fetch price data based on market type
 */
export async function fetchMarketPrice(
  symbol: string,
  duration: string,
  market: string
): Promise<OHLCVData> {
  if (market === "cryptocurrency") {
    return await fetchCryptoPrice(symbol, duration);
  } else {
    return await fetchYahooFinancePrice(symbol, duration, market);
  }
}
