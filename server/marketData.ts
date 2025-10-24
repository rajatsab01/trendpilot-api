// Market data fetching service - integrates with CoinGecko and Yahoo Finance
// This service fetches real-time market data for crypto and stocks

interface MarketData {
  symbol: string;
  instrumentName?: string;
  currentPrice: number;
  priceChange24h?: number;
  priceChangePercentage24h?: number;
  volume24h?: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  error?: string;
}

/**
 * Parse trading pair symbols to extract base currency
 * Examples: BTCUSDT → BTC, ETHUSDT → ETH, BTCUSD → BTC, ETH-USD → ETH
 */
function parseBaseSymbol(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  
  // Remove common quote currencies (USDT, USD, USDC, EUR, GBP, etc.)
  const quoteCurrencies = ['USDT', 'USD', 'USDC', 'BUSD', 'EUR', 'GBP', 'JPY', 'INR'];
  
  for (const quote of quoteCurrencies) {
    if (upperSymbol.endsWith(quote)) {
      return upperSymbol.slice(0, -quote.length);
    }
  }
  
  // Remove separators like - or /
  return upperSymbol.replace(/[-\/]/g, '').split(/[^A-Z]/)[0];
}

/**
 * Fetch cryptocurrency data from CoinGecko API (free, no API key required)
 * @param symbol - The crypto symbol (e.g., "BTC", "ETH", "DOGE", "BTCUSDT", "ETHUSDT")
 */
export async function fetchCryptoData(symbol: string): Promise<MarketData> {
  try {
    // Parse trading pair to extract base currency
    const baseSymbol = parseBaseSymbol(symbol);
    
    // CoinGecko uses coin IDs, not symbols. Map common symbols to IDs
    const symbolToId: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDT': 'tether',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'XRP': 'ripple',
      'USDC': 'usd-coin',
      'ADA': 'cardano',
      'DOGE': 'dogecoin',
      'TRX': 'tron',
      'AVAX': 'avalanche-2',
      'DOT': 'polkadot',
      'MATIC': 'matic-network',
      'LTC': 'litecoin',
      'LINK': 'chainlink',
      'SHIB': 'shiba-inu',
      'UNI': 'uniswap',
      'ATOM': 'cosmos',
      'XLM': 'stellar',
      'BCH': 'bitcoin-cash',
      'APT': 'aptos',
      'ARB': 'arbitrum',
      'OP': 'optimism',
    };

    const coinId = symbolToId[baseSymbol] || baseSymbol.toLowerCase();
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Format instrument name with trading pair if different from base
    const cryptoName = data.name || baseSymbol;
    const formattedName = baseSymbol !== symbol.toUpperCase() 
      ? `${cryptoName} (${symbol.toUpperCase()})`
      : cryptoName;
    
    return {
      symbol: symbol.toUpperCase(),
      instrumentName: formattedName,
      currentPrice: data.market_data.current_price.usd,
      priceChange24h: data.market_data.price_change_24h,
      priceChangePercentage24h: data.market_data.price_change_percentage_24h,
      volume24h: data.market_data.total_volume.usd,
      marketCap: data.market_data.market_cap.usd,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
    };
  } catch (error: any) {
    console.error('Error fetching crypto data:', error);
    return {
      symbol,
      currentPrice: 0,
      error: error.message || 'Failed to fetch crypto data',
    };
  }
}

/**
 * Fetch stock data from Yahoo Finance API (using yfinance.financialmodelingprep.com proxy)
 * @param symbol - The stock symbol (e.g., "RELIANCE.NS", "AAPL", "7203.T")
 * @param market - The market type to determine symbol suffix
 */
export async function fetchStockData(symbol: string, market: string): Promise<MarketData> {
  try {
    // Add appropriate suffix based on market
    let tickerSymbol = symbol.toUpperCase();
    
    // Add market suffixes for Indian stocks
    if (market === 'indian_nse') {
      if (!tickerSymbol.includes('.')) {
        tickerSymbol = `${tickerSymbol}.NS`;
      }
    } else if (market === 'indian_bse') {
      if (!tickerSymbol.includes('.')) {
        tickerSymbol = `${tickerSymbol}.BO`;
      }
    } else if (market === 'japan') {
      if (!tickerSymbol.includes('.')) {
        tickerSymbol = `${tickerSymbol}.T`;
      }
    } else if (market === 'singapore') {
      if (!tickerSymbol.includes('.')) {
        tickerSymbol = `${tickerSymbol}.SI`;
      }
    }
    // US stocks don't need suffix

    // Using Yahoo Finance query2 API endpoint (free, public)
    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${tickerSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const quote = data.chart.result[0];
    const meta = quote.meta;
    const indicators = quote.indicators.quote[0];
    
    return {
      symbol: tickerSymbol,
      instrumentName: meta.longName || meta.shortName || tickerSymbol,
      currentPrice: meta.regularMarketPrice,
      priceChange24h: meta.regularMarketPrice - meta.previousClose,
      priceChangePercentage24h: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume24h: meta.regularMarketVolume,
      high24h: indicators.high?.[indicators.high.length - 1] || meta.regularMarketPrice,
      low24h: indicators.low?.[indicators.low.length - 1] || meta.regularMarketPrice,
    };
  } catch (error: any) {
    console.error('Error fetching stock data:', error);
    return {
      symbol,
      currentPrice: 0,
      error: error.message || 'Failed to fetch stock data',
    };
  }
}

/**
 * Fetch forex/currency data from Yahoo Finance
 * @param symbol - Currency pair (e.g., "USDINR=X", "EURUSD=X")
 */
export async function fetchCurrencyData(symbol: string): Promise<MarketData> {
  try {
    let tickerSymbol = symbol.toUpperCase();
    
    // Add =X suffix if not present (Yahoo Finance format for forex)
    if (!tickerSymbol.includes('=')) {
      tickerSymbol = `${tickerSymbol}=X`;
    }

    const response = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${tickerSymbol}?interval=1d&range=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }

    const quote = data.chart.result[0];
    const meta = quote.meta;
    const indicators = quote.indicators.quote[0];
    
    return {
      symbol: tickerSymbol,
      instrumentName: meta.longName || meta.shortName || tickerSymbol,
      currentPrice: meta.regularMarketPrice,
      priceChange24h: meta.regularMarketPrice - meta.previousClose,
      priceChangePercentage24h: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      high24h: indicators.high?.[indicators.high.length - 1] || meta.regularMarketPrice,
      low24h: indicators.low?.[indicators.low.length - 1] || meta.regularMarketPrice,
    };
  } catch (error: any) {
    console.error('Error fetching currency data:', error);
    return {
      symbol,
      currentPrice: 0,
      error: error.message || 'Failed to fetch currency data',
    };
  }
}

/**
 * Main function to fetch market data based on market type
 */
export async function fetchMarketData(
  symbol: string,
  market: 'crypto' | 'indian_nse' | 'indian_bse' | 'us' | 'japan' | 'singapore' | 'currency'
): Promise<MarketData> {
  if (market === 'crypto') {
    return fetchCryptoData(symbol);
  } else if (market === 'currency') {
    return fetchCurrencyData(symbol);
  } else {
    return fetchStockData(symbol, market);
  }
}
