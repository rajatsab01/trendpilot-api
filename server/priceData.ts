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

interface CandleData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

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
  historicalCandles: CandleData[];
}

/**
 * Get appropriate timeframe based on duration
 */
function getTimeframeForDuration(duration: string): { interval: string; label: string; candleCount: number } {
  switch (duration) {
    case "scalping":
      return { interval: "5m", label: "5min", candleCount: 72 }; // 6 hours
    case "swing_trade":
      return { interval: "15m", label: "15min", candleCount: 48 }; // 12 hours
    case "short_term":
      return { interval: "1h", label: "1hr", candleCount: 50 }; // ~2 days
    case "long_term":
      return { interval: "1d", label: "1day", candleCount: 30 }; // 1 month
    default:
      return { interval: "1h", label: "1hr", candleCount: 50 };
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
  const { interval, label, candleCount } = getTimeframeForDuration(duration);
  
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
    
    // Fetch OHLCV candle data - get enough candles for historical analysis
    // Add 1 extra to ensure we have enough closed candles
    const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${candleCount + 1}`;
    const klinesResponse = await fetch(klinesUrl);
    
    if (!klinesResponse.ok) {
      throw new Error(`Binance klines API error: ${klinesResponse.status}`);
    }
    
    const klinesData = await klinesResponse.json();
    
    // Get all closed candles (excluding the last incomplete one)
    const closedCandles = klinesData.slice(0, -1);
    const closedCandle = closedCandles[closedCandles.length - 1];
    
    if (!closedCandle) {
      throw new Error("No closed candle data available");
    }
    
    const candleCloseTime = new Date(closedCandle[6]).toISOString().replace('T', ' ').replace('Z', ' UTC');
    
    // Build historical candles array
    const historicalCandles: CandleData[] = closedCandles.map((candle: any) => ({
      timestamp: new Date(candle[0]).toISOString().replace('T', ' ').replace('Z', ' UTC'),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5]),
    }));
    
    console.log(`[Binance] ✅ Fetched ${historicalCandles.length} historical ${label} candles for ${binanceSymbol}`);
    
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
      historicalCandles,
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
      historicalCandles: [], // CoinGecko simple API doesn't provide historical data
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
    const { interval, label, candleCount } = getTimeframeForDuration(duration);
    
    // Yahoo Finance interval mapping
    const yahooIntervalMap: Record<string, string> = {
      "5m": "5m",
      "15m": "15m",
      "1h": "1h",
      "1d": "1d",
    };
    
    const yahooInterval = yahooIntervalMap[interval] || "1h";
    
    // Use unified symbol normalization from symbolRegistry
    // This ensures consistent transformation logic across the entire codebase
    // Classification is auto-detected based on symbol pattern and market type
    const yahooSymbol = normalizeSymbolForAPI(symbol, market as MarketType);
    
    // Fetch chart data from Yahoo Finance - adjust range to get enough historical data
    const rangeMap: Record<string, string> = {
      "scalping": "1d",      // 5m x 72 = 6 hours
      "swing_trade": "3d",   // 15m x 48 = 12 hours
      "short_term": "7d",    // 1h x 50 = ~2 days
      "long_term": "3mo",    // 1d x 30 = 1 month
    };
    const range = rangeMap[duration] || "5d";
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
    
    // Get all closed candles (exclude the last incomplete one)
    const totalCandles = timestamps.length;
    const numClosedCandles = Math.min(candleCount, totalCandles - 1);
    const startIndex = Math.max(0, totalCandles - 1 - numClosedCandles);
    const endIndex = totalCandles - 1;
    
    // Get the last CLOSED candle
    const closedCandleIndex = endIndex;
    const candleCloseTime = new Date(timestamps[closedCandleIndex] * 1000).toISOString().replace('T', ' ').replace('Z', ' UTC');
    
    // Build historical candles array from closed candles
    const historicalCandles: CandleData[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      // Skip null/invalid candles
      if (quote.close[i] !== null && quote.close[i] !== undefined) {
        historicalCandles.push({
          timestamp: new Date(timestamps[i] * 1000).toISOString().replace('T', ' ').replace('Z', ' UTC'),
          open: quote.open[i] || 0,
          high: quote.high[i] || 0,
          low: quote.low[i] || 0,
          close: quote.close[i],
          volume: quote.volume[i] || 0,
        });
      }
    }
    
    console.log(`[Yahoo Finance] ✅ Fetched ${historicalCandles.length} historical ${label} candles for ${yahooSymbol}`);
    
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
      historicalCandles,
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
