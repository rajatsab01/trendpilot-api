/**
 * Intelligent Instrument Search
 * 
 * Allows users to search by common names (e.g., "gold", "crude", "bitcoin")
 * and get relevant symbol suggestions across all markets
 */

interface InstrumentSuggestion {
  symbol: string;
  name: string;
  market: string;
  description?: string;
}

/**
 * Comprehensive instrument database mapping common names to symbols
 */
const instrumentDatabase: Record<string, InstrumentSuggestion[]> = {
  // Cryptocurrencies
  "bitcoin": [
    { symbol: "BTCUSDT", name: "Bitcoin", market: "cryptocurrency", description: "Leading cryptocurrency" },
    { symbol: "BTC-USD", name: "Bitcoin (Coinbase)", market: "cryptocurrency", description: "Bitcoin on Coinbase" },
  ],
  "btc": [
    { symbol: "BTCUSDT", name: "Bitcoin", market: "cryptocurrency", description: "Leading cryptocurrency" },
  ],
  "ethereum": [
    { symbol: "ETHUSDT", name: "Ethereum", market: "cryptocurrency", description: "Smart contract platform" },
    { symbol: "ETH-USD", name: "Ethereum (Coinbase)", market: "cryptocurrency", description: "Ethereum on Coinbase" },
  ],
  "eth": [
    { symbol: "ETHUSDT", name: "Ethereum", market: "cryptocurrency", description: "Smart contract platform" },
  ],
  "bnb": [
    { symbol: "BNBUSDT", name: "Binance Coin", market: "cryptocurrency", description: "Binance exchange token" },
  ],
  "binance": [
    { symbol: "BNBUSDT", name: "Binance Coin", market: "cryptocurrency", description: "Binance exchange token" },
  ],
  "solana": [
    { symbol: "SOLUSDT", name: "Solana", market: "cryptocurrency", description: "Fast blockchain platform" },
  ],
  "sol": [
    { symbol: "SOLUSDT", name: "Solana", market: "cryptocurrency", description: "Fast blockchain platform" },
  ],
  "ripple": [
    { symbol: "XRPUSDT", name: "XRP", market: "cryptocurrency", description: "Ripple payment network" },
  ],
  "xrp": [
    { symbol: "XRPUSDT", name: "XRP", market: "cryptocurrency", description: "Ripple payment network" },
  ],
  "cardano": [
    { symbol: "ADAUSDT", name: "Cardano", market: "cryptocurrency", description: "Proof-of-stake blockchain" },
  ],
  "ada": [
    { symbol: "ADAUSDT", name: "Cardano", market: "cryptocurrency", description: "Proof-of-stake blockchain" },
  ],
  "dogecoin": [
    { symbol: "DOGEUSDT", name: "Dogecoin", market: "cryptocurrency", description: "Meme cryptocurrency" },
  ],
  "doge": [
    { symbol: "DOGEUSDT", name: "Dogecoin", market: "cryptocurrency", description: "Meme cryptocurrency" },
  ],

  // Precious Metals (Commodities)
  "gold": [
    { symbol: "GC=F", name: "Gold Futures", market: "commodity", description: "Gold futures contract" },
    { symbol: "XAUUSD", name: "Gold/USD Spot", market: "commodity", description: "Gold spot price" },
  ],
  "silver": [
    { symbol: "SI=F", name: "Silver Futures", market: "commodity", description: "Silver futures contract" },
    { symbol: "XAGUSD", name: "Silver/USD Spot", market: "commodity", description: "Silver spot price" },
  ],
  "platinum": [
    { symbol: "PL=F", name: "Platinum Futures", market: "commodity", description: "Platinum futures contract" },
  ],
  "palladium": [
    { symbol: "PA=F", name: "Palladium Futures", market: "commodity", description: "Palladium futures contract" },
  ],

  // Energy Commodities
  "crude": [
    { symbol: "CL=F", name: "Crude Oil (WTI)", market: "commodity", description: "West Texas Intermediate crude" },
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil futures" },
  ],
  "oil": [
    { symbol: "CL=F", name: "Crude Oil (WTI)", market: "commodity", description: "West Texas Intermediate crude" },
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil futures" },
  ],
  "wti": [
    { symbol: "CL=F", name: "Crude Oil (WTI)", market: "commodity", description: "West Texas Intermediate crude" },
  ],
  "brent": [
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil futures" },
  ],
  "natural gas": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas futures" },
  ],
  "gas": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas futures" },
  ],

  // Agricultural Commodities
  "corn": [
    { symbol: "ZC=F", name: "Corn Futures", market: "commodity", description: "Corn commodity futures" },
  ],
  "wheat": [
    { symbol: "ZW=F", name: "Wheat Futures", market: "commodity", description: "Wheat commodity futures" },
  ],
  "soybeans": [
    { symbol: "ZS=F", name: "Soybean Futures", market: "commodity", description: "Soybean commodity futures" },
  ],
  "coffee": [
    { symbol: "KC=F", name: "Coffee Futures", market: "commodity", description: "Coffee commodity futures" },
  ],
  "sugar": [
    { symbol: "SB=F", name: "Sugar Futures", market: "commodity", description: "Sugar commodity futures" },
  ],
  "cotton": [
    { symbol: "CT=F", name: "Cotton Futures", market: "commodity", description: "Cotton commodity futures" },
  ],

  // Major Forex Pairs
  "euro": [
    { symbol: "EURUSD=X", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
  ],
  "eurusd": [
    { symbol: "EURUSD=X", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
  ],
  "gbp": [
    { symbol: "GBPUSD=X", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
  ],
  "pound": [
    { symbol: "GBPUSD=X", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
  ],
  "gbpusd": [
    { symbol: "GBPUSD=X", name: "GBP/USD", market: "forex", description: "British Pound to US Dollar" },
  ],
  "yen": [
    { symbol: "JPY=X", name: "USD/JPY", market: "forex", description: "US Dollar to Japanese Yen" },
  ],
  "usdjpy": [
    { symbol: "JPY=X", name: "USD/JPY", market: "forex", description: "US Dollar to Japanese Yen" },
  ],
  "cad": [
    { symbol: "CAD=X", name: "USD/CAD", market: "forex", description: "US Dollar to Canadian Dollar" },
  ],
  "usdcad": [
    { symbol: "CAD=X", name: "USD/CAD", market: "forex", description: "US Dollar to Canadian Dollar" },
  ],
  "aud": [
    { symbol: "AUD=X", name: "AUD/USD", market: "forex", description: "Australian Dollar to US Dollar" },
  ],
  "audusd": [
    { symbol: "AUD=X", name: "AUD/USD", market: "forex", description: "Australian Dollar to US Dollar" },
  ],

  // Major US Stocks
  "apple": [
    { symbol: "AAPL", name: "Apple Inc.", market: "stock_equities", description: "Technology company" },
  ],
  "microsoft": [
    { symbol: "MSFT", name: "Microsoft Corporation", market: "stock_equities", description: "Software company" },
  ],
  "google": [
    { symbol: "GOOGL", name: "Alphabet Inc.", market: "stock_equities", description: "Technology conglomerate" },
  ],
  "amazon": [
    { symbol: "AMZN", name: "Amazon.com Inc.", market: "stock_equities", description: "E-commerce company" },
  ],
  "tesla": [
    { symbol: "TSLA", name: "Tesla Inc.", market: "stock_equities", description: "Electric vehicle company" },
  ],
  "meta": [
    { symbol: "META", name: "Meta Platforms Inc.", market: "stock_equities", description: "Social media company" },
  ],
  "facebook": [
    { symbol: "META", name: "Meta Platforms Inc.", market: "stock_equities", description: "Social media company (formerly Facebook)" },
  ],
  "nvidia": [
    { symbol: "NVDA", name: "NVIDIA Corporation", market: "stock_equities", description: "Graphics processing company" },
  ],
  "netflix": [
    { symbol: "NFLX", name: "Netflix Inc.", market: "stock_equities", description: "Streaming service" },
  ],
  "coca cola": [
    { symbol: "KO", name: "The Coca-Cola Company", market: "stock_equities", description: "Beverage company" },
  ],
  "coca-cola": [
    { symbol: "KO", name: "The Coca-Cola Company", market: "stock_equities", description: "Beverage company" },
  ],

  // Market Indices
  "s&p": [
    { symbol: "^GSPC", name: "S&P 500", market: "stock_equities", description: "US stock market index" },
  ],
  "sp500": [
    { symbol: "^GSPC", name: "S&P 500", market: "stock_equities", description: "US stock market index" },
  ],
  "dow": [
    { symbol: "^DJI", name: "Dow Jones", market: "stock_equities", description: "US stock market index" },
  ],
  "nasdaq": [
    { symbol: "^IXIC", name: "NASDAQ", market: "stock_equities", description: "US tech stock index" },
  ],
  "nifty": [
    { symbol: "^NSEI", name: "NIFTY 50", market: "stock_equities", description: "Indian stock market index" },
  ],
  "sensex": [
    { symbol: "^BSESN", name: "BSE SENSEX", market: "stock_equities", description: "Indian stock market index" },
  ],
};

/**
 * Search for instruments by common name or partial match
 */
export function searchInstruments(query: string): InstrumentSuggestion[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const results: InstrumentSuggestion[] = [];
  const seenSymbols = new Set<string>();

  // Exact match first
  if (instrumentDatabase[normalizedQuery]) {
    for (const suggestion of instrumentDatabase[normalizedQuery]) {
      if (!seenSymbols.has(suggestion.symbol)) {
        results.push(suggestion);
        seenSymbols.add(suggestion.symbol);
      }
    }
  }

  // Partial match (starts with)
  for (const [key, suggestions] of Object.entries(instrumentDatabase)) {
    if (key.startsWith(normalizedQuery) && key !== normalizedQuery) {
      for (const suggestion of suggestions) {
        if (!seenSymbols.has(suggestion.symbol) && results.length < 10) {
          results.push(suggestion);
          seenSymbols.add(suggestion.symbol);
        }
      }
    }
  }

  // Fuzzy match (contains)
  if (results.length < 5) {
    for (const [key, suggestions] of Object.entries(instrumentDatabase)) {
      if (key.includes(normalizedQuery) && !key.startsWith(normalizedQuery)) {
        for (const suggestion of suggestions) {
          if (!seenSymbols.has(suggestion.symbol) && results.length < 10) {
            results.push(suggestion);
            seenSymbols.add(suggestion.symbol);
          }
        }
      }
    }
  }

  return results.slice(0, 10); // Return max 10 results
}

/**
 * Get popular instruments by market type
 */
export function getPopularInstruments(market?: string): InstrumentSuggestion[] {
  const popular: InstrumentSuggestion[] = [
    { symbol: "BTCUSDT", name: "Bitcoin", market: "cryptocurrency", description: "Leading cryptocurrency" },
    { symbol: "ETHUSDT", name: "Ethereum", market: "cryptocurrency", description: "Smart contract platform" },
    { symbol: "GC=F", name: "Gold Futures", market: "commodity", description: "Gold futures contract" },
    { symbol: "CL=F", name: "Crude Oil (WTI)", market: "commodity", description: "West Texas Intermediate crude" },
    { symbol: "EURUSD=X", name: "EUR/USD", market: "forex", description: "Euro to US Dollar" },
    { symbol: "AAPL", name: "Apple Inc.", market: "stock_equities", description: "Technology company" },
    { symbol: "TSLA", name: "Tesla Inc.", market: "stock_equities", description: "Electric vehicle company" },
    { symbol: "^GSPC", name: "S&P 500", market: "stock_equities", description: "US stock market index" },
  ];

  if (market) {
    return popular.filter(p => p.market === market).slice(0, 5);
  }

  return popular;
}
