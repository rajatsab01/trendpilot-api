/**
 * Intelligent Instrument Search
 * 
 * Allows users to search by common names (e.g., "gold", "crude", "bitcoin")
 * and get relevant symbol suggestions across all markets
 */

export interface InstrumentSuggestion {
  symbol: string;
  name: string;
  market: string;
  description?: string;
  classification?: string; // spot, futures, stock, index, pair, etc.
}

/**
 * Comprehensive instrument database mapping common names to symbols
 */
export const instrumentDatabase: Record<string, InstrumentSuggestion[]> = {
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

  // Precious Metals (Commodities) - Yahoo Finance only supports futures symbols
  "gold": [
    { symbol: "GC=F", name: "Gold Futures", market: "commodity", description: "Gold futures (Yahoo Finance symbol)" },
  ],
  "silver": [
    { symbol: "SI=F", name: "Silver Futures", market: "commodity", description: "Silver futures (Yahoo Finance symbol)" },
  ],
  "platinum": [
    { symbol: "PL=F", name: "Platinum Futures", market: "commodity", description: "Platinum futures (Yahoo Finance symbol)" },
  ],
  "palladium": [
    { symbol: "PA=F", name: "Palladium Futures", market: "commodity", description: "Palladium futures (Yahoo Finance symbol)" },
  ],

  // Energy Commodities - Yahoo Finance only supports futures symbols
  "crude": [
    { symbol: "CL=F", name: "WTI Crude Oil", market: "commodity", description: "WTI crude oil (Yahoo Finance futures symbol)" },
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil (Yahoo Finance futures symbol)" },
  ],
  "oil": [
    { symbol: "CL=F", name: "WTI Crude Oil", market: "commodity", description: "WTI crude oil (Yahoo Finance futures symbol)" },
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil (Yahoo Finance futures symbol)" },
  ],
  "wti": [
    { symbol: "CL=F", name: "WTI Crude Oil", market: "commodity", description: "WTI crude oil (Yahoo Finance futures symbol)" },
  ],
  "brent": [
    { symbol: "BZ=F", name: "Brent Crude Oil", market: "commodity", description: "Brent crude oil (Yahoo Finance futures symbol)" },
  ],
  "natural gas": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas (Yahoo Finance futures symbol)" },
  ],
  "gas": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas (Yahoo Finance futures symbol)" },
  ],
  "natural": [
    { symbol: "NG=F", name: "Natural Gas", market: "commodity", description: "Natural gas (Yahoo Finance futures symbol)" },
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
    { symbol: "AAPL", name: "Apple Inc.", market: "stock", description: "Technology company" },
  ],
  "microsoft": [
    { symbol: "MSFT", name: "Microsoft Corporation", market: "stock", description: "Software company" },
  ],
  "google": [
    { symbol: "GOOGL", name: "Alphabet Inc.", market: "stock", description: "Technology conglomerate" },
  ],
  "amazon": [
    { symbol: "AMZN", name: "Amazon.com Inc.", market: "stock", description: "E-commerce company" },
  ],
  "tesla": [
    { symbol: "TSLA", name: "Tesla Inc.", market: "stock", description: "Electric vehicle company" },
  ],
  "meta": [
    { symbol: "META", name: "Meta Platforms Inc.", market: "stock", description: "Social media company" },
  ],
  "facebook": [
    { symbol: "META", name: "Meta Platforms Inc.", market: "stock", description: "Social media company (formerly Facebook)" },
  ],
  "nvidia": [
    { symbol: "NVDA", name: "NVIDIA Corporation", market: "stock", description: "Graphics processing company" },
  ],
  "netflix": [
    { symbol: "NFLX", name: "Netflix Inc.", market: "stock", description: "Streaming service" },
  ],
  "coca cola": [
    { symbol: "KO", name: "The Coca-Cola Company", market: "stock", description: "Beverage company" },
  ],
  "coca-cola": [
    { symbol: "KO", name: "The Coca-Cola Company", market: "stock", description: "Beverage company" },
  ],

  // Market Indices
  "s&p": [
    { symbol: "^GSPC", name: "S&P 500", market: "stock", description: "US stock market index" },
  ],
  "sp500": [
    { symbol: "^GSPC", name: "S&P 500", market: "stock", description: "US stock market index" },
  ],
  "dow": [
    { symbol: "^DJI", name: "Dow Jones", market: "stock", description: "US stock market index" },
  ],
  "nasdaq": [
    { symbol: "^IXIC", name: "NASDAQ", market: "stock", description: "US tech stock index" },
  ],
  "nifty": [
    { symbol: "^NSEI", name: "NIFTY 50", market: "stock", description: "Indian stock market index" },
  ],
  "sensex": [
    { symbol: "^BSESN", name: "BSE SENSEX", market: "stock", description: "Indian stock market index" },
  ],

  // Indian Stocks
  "ndtv": [
    { symbol: "NDTV.NS", name: "New Delhi Television Ltd", market: "stock", description: "Indian media company (NSE)" },
    { symbol: "NDTV.BO", name: "New Delhi Television Ltd", market: "stock", description: "Indian media company (BSE)" },
  ],
  "reliance": [
    { symbol: "RELIANCE.NS", name: "Reliance Industries", market: "stock", description: "Indian conglomerate (NSE)" },
    { symbol: "RELIANCE.BO", name: "Reliance Industries", market: "stock", description: "Indian conglomerate (BSE)" },
  ],
  "tcs": [
    { symbol: "TCS.NS", name: "Tata Consultancy Services", market: "stock", description: "Indian IT company (NSE)" },
    { symbol: "TCS.BO", name: "Tata Consultancy Services", market: "stock", description: "Indian IT company (BSE)" },
  ],
  "infosys": [
    { symbol: "INFY.NS", name: "Infosys Limited", market: "stock", description: "Indian IT company (NSE)" },
    { symbol: "INFY", name: "Infosys Limited ADR", market: "stock", description: "Indian IT company (US ADR)" },
  ],
  "hdfc": [
    { symbol: "HDFCBANK.NS", name: "HDFC Bank Limited", market: "stock", description: "Indian bank (NSE)" },
    { symbol: "HDB", name: "HDFC Bank ADR", market: "stock", description: "Indian bank (US ADR)" },
  ],
  "icici": [
    { symbol: "ICICIBANK.NS", name: "ICICI Bank Limited", market: "stock", description: "Indian bank (NSE)" },
    { symbol: "IBN", name: "ICICI Bank ADR", market: "stock", description: "Indian bank (US ADR)" },
  ],
  "bharti": [
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Limited", market: "stock", description: "Indian telecom (NSE)" },
  ],
  "airtel": [
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel Limited", market: "stock", description: "Indian telecom (NSE)" },
  ],
  "wipro": [
    { symbol: "WIPRO.NS", name: "Wipro Limited", market: "stock", description: "Indian IT company (NSE)" },
    { symbol: "WIT", name: "Wipro Limited ADR", market: "stock", description: "Indian IT company (US ADR)" },
  ],
  "adani": [
    { symbol: "ADANIENT.NS", name: "Adani Enterprises", market: "stock", description: "Indian conglomerate (NSE)" },
  ],
  "tata": [
    { symbol: "TATAMOTORS.NS", name: "Tata Motors Limited", market: "stock", description: "Indian auto company (NSE)" },
  ],

  // UK Stocks
  "bp": [
    { symbol: "BP.L", name: "BP plc", market: "stock", description: "British oil & gas company" },
    { symbol: "BP", name: "BP plc ADR", market: "stock", description: "British oil & gas (US ADR)" },
  ],
  "shell": [
    { symbol: "SHEL.L", name: "Shell plc", market: "stock", description: "British oil & gas company" },
    { symbol: "SHEL", name: "Shell plc ADR", market: "stock", description: "British oil & gas (US ADR)" },
  ],
  "hsbc": [
    { symbol: "HSBA.L", name: "HSBC Holdings plc", market: "stock", description: "British bank" },
    { symbol: "HSBC", name: "HSBC Holdings ADR", market: "stock", description: "British bank (US ADR)" },
  ],

  // Japanese Stocks
  "toyota": [
    { symbol: "7203.T", name: "Toyota Motor Corporation", market: "stock", description: "Japanese auto company" },
    { symbol: "TM", name: "Toyota Motor ADR", market: "stock", description: "Japanese auto (US ADR)" },
  ],
  "sony": [
    { symbol: "6758.T", name: "Sony Group Corporation", market: "stock", description: "Japanese electronics company" },
    { symbol: "SONY", name: "Sony Group ADR", market: "stock", description: "Japanese electronics (US ADR)" },
  ],

  // Chinese Stocks
  "alibaba": [
    { symbol: "BABA", name: "Alibaba Group", market: "stock", description: "Chinese e-commerce company" },
  ],
  "tencent": [
    { symbol: "TCEHY", name: "Tencent Holdings", market: "stock", description: "Chinese tech company (OTC)" },
  ],
  "baidu": [
    { symbol: "BIDU", name: "Baidu Inc", market: "stock", description: "Chinese search engine" },
  ],

  // European Stocks
  "volkswagen": [
    { symbol: "VOW.DE", name: "Volkswagen AG", market: "stock", description: "German auto company" },
    { symbol: "VWAGY", name: "Volkswagen ADR", market: "stock", description: "German auto (US ADR)" },
  ],
  "bmw": [
    { symbol: "BMW.DE", name: "BMW AG", market: "stock", description: "German auto company" },
  ],
  "mercedes": [
    { symbol: "MBG.DE", name: "Mercedes-Benz Group", market: "stock", description: "German auto company" },
  ],
  "sap": [
    { symbol: "SAP.DE", name: "SAP SE", market: "stock", description: "German software company" },
    { symbol: "SAP", name: "SAP SE ADR", market: "stock", description: "German software (US ADR)" },
  ],
  "nestle": [
    { symbol: "NESN.SW", name: "Nestlé S.A.", market: "stock", description: "Swiss food & beverage" },
  ],
  "lvmh": [
    { symbol: "MC.PA", name: "LVMH", market: "stock", description: "French luxury goods" },
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
    { symbol: "AAPL", name: "Apple Inc.", market: "stock", description: "Technology company" },
    { symbol: "TSLA", name: "Tesla Inc.", market: "stock", description: "Electric vehicle company" },
    { symbol: "^GSPC", name: "S&P 500", market: "stock", description: "US stock market index" },
  ];

  if (market) {
    return popular.filter(p => p.market === market).slice(0, 5);
  }

  return popular;
}
