/**
 * Price Data Fetching Service
 * 
 * Fetches accurate real-time + closed candle prices from:
 * - Yahoo Finance (stocks, forex, commodities, bonds)
 * - Binance (cryptocurrencies)
 * 
 * NO API KEYS REQUIRED - Completely FREE!
 */

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
 * Fetch cryptocurrency prices from Binance
 * Completely FREE - no API key required
 */
async function fetchCryptoPrice(
  symbol: string,
  duration: string
): Promise<OHLCVData> {
  try {
    const { interval, label } = getTimeframeForDuration(duration);
    
    // Convert symbol to Binance format (e.g., "BTC" -> "BTCUSDT", "ETH" -> "ETHUSDT")
    let binanceSymbol = symbol.toUpperCase().replace(/[^A-Z]/g, "");
    
    // Add USDT if not already present
    if (!binanceSymbol.includes("USDT") && !binanceSymbol.includes("BTC") && !binanceSymbol.includes("ETH")) {
      binanceSymbol = `${binanceSymbol}USDT`;
    }
    
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
    };
    
    if (symbolMap[symbol.toUpperCase()]) {
      binanceSymbol = symbolMap[symbol.toUpperCase()];
    }
    
    // Fetch current live price (ticker)
    const tickerUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
    const tickerResponse = await fetch(tickerUrl);
    
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
    
    // Get the most recent CLOSED candle (second-to-last in the array)
    const closedCandle = klinesData[klinesData.length - 2];
    
    if (!closedCandle) {
      throw new Error("No closed candle data available");
    }
    
    const candleCloseTime = new Date(closedCandle[6]).toISOString().replace('T', ' ').replace('Z', ' UTC');
    
    return {
      symbol: binanceSymbol,
      livePrice: livePrice,
      candleClosePrice: parseFloat(closedCandle[4]), // Close price
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
    console.error("Binance API error:", error);
    throw new Error(`Failed to fetch crypto price: ${error.message}`);
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
    
    // Construct Yahoo Finance symbol
    let yahooSymbol = symbol.toUpperCase();
    
    // Add common suffixes for different markets
    if (market === "forex") {
      // Forex pairs like EURUSD -> EURUSD=X
      if (!yahooSymbol.includes("=X") && yahooSymbol.length === 6) {
        yahooSymbol = `${yahooSymbol}=X`;
      }
    } else if (market === "commodity") {
      // Commodities like GOLD -> GC=F (Gold Futures)
      const commodityMap: Record<string, string> = {
        "GOLD": "GC=F",
        "SILVER": "SI=F",
        "CRUDE": "CL=F",
        "OIL": "CL=F",
        "BRENT": "BZ=F",
      };
      yahooSymbol = commodityMap[yahooSymbol] || `${yahooSymbol}=F`;
    }
    
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
    console.error("Yahoo Finance API error:", error);
    throw new Error(`Failed to fetch Yahoo Finance price: ${error.message}`);
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
