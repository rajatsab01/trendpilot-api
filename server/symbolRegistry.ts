/**
 * Unified Symbol Registry
 * 
 * Single source of truth for all financial symbols with metadata,
 * verification status, and normalization logic.
 * 
 * This eliminates scattered symbol transformation logic across the codebase
 * and provides a reliable reference for symbol handling.
 */

export type MarketType = 'stock' | 'commodity' | 'forex' | 'cryptocurrency';
export type SymbolClassification = 'spot' | 'futures' | 'cfd' | 'stock' | 'etf' | 'index' | 'pair';
export type VerificationStatus = 'verified' | 'unverified' | 'broken' | 'deprecated';

export interface SymbolMetadata {
  /** Original symbol as it appears in autocomplete/search */
  symbol: string;
  /** Human-readable name */
  name: string;
  /** Market type */
  market: MarketType;
  /** Classification (spot, futures, etc.) */
  classification: SymbolClassification;
  /** Data source: yahoo, binance, coingecko */
  dataSource: 'yahoo' | 'binance' | 'coingecko';
  /** Transformed symbol for API calls (e.g., XAUUSD → XAUUSD=X) */
  apiSymbol: string;
  /** Verification status */
  status: VerificationStatus;
  /** Last tested timestamp */
  lastTested?: Date;
  /** Optional description */
  description?: string;
  /** Exchange/region identifier (e.g., "US", "India-NSE", "Japan") */
  exchange?: string;
  /** Whether this is a recommended symbol */
  recommended?: boolean;
}

/**
 * Symbol Registry Database
 * Populated and maintained through testing and validation
 */
export class SymbolRegistry {
  private symbols: Map<string, SymbolMetadata> = new Map();

  /**
   * Register a symbol with its metadata
   */
  register(metadata: SymbolMetadata): void {
    const key = this.normalizeKey(metadata.symbol);
    this.symbols.set(key, metadata);
  }

  /**
   * Get symbol metadata
   */
  get(symbol: string): SymbolMetadata | undefined {
    const key = this.normalizeKey(symbol);
    return this.symbols.get(key);
  }

  /**
   * Check if symbol exists in registry
   */
  has(symbol: string): boolean {
    const key = this.normalizeKey(symbol);
    return this.symbols.has(key);
  }

  /**
   * Get all symbols matching criteria
   */
  query(criteria: {
    market?: MarketType;
    classification?: SymbolClassification;
    status?: VerificationStatus;
    dataSource?: 'yahoo' | 'binance' | 'coingecko';
    recommended?: boolean;
  }): SymbolMetadata[] {
    let results = Array.from(this.symbols.values());

    if (criteria.market) {
      results = results.filter(s => s.market === criteria.market);
    }
    if (criteria.classification) {
      results = results.filter(s => s.classification === criteria.classification);
    }
    if (criteria.status) {
      results = results.filter(s => s.status === criteria.status);
    }
    if (criteria.dataSource) {
      results = results.filter(s => s.dataSource === criteria.dataSource);
    }
    if (criteria.recommended !== undefined) {
      results = results.filter(s => s.recommended === criteria.recommended);
    }

    return results;
  }

  /**
   * Get all symbols
   */
  getAll(): SymbolMetadata[] {
    return Array.from(this.symbols.values());
  }

  /**
   * Update symbol status
   */
  updateStatus(symbol: string, status: VerificationStatus, lastTested?: Date): boolean {
    const metadata = this.get(symbol);
    if (!metadata) return false;

    metadata.status = status;
    if (lastTested) {
      metadata.lastTested = lastTested;
    }
    
    this.register(metadata);
    return true;
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    verified: number;
    broken: number;
    unverified: number;
    byMarket: Record<MarketType, number>;
    byClassification: Record<SymbolClassification, number>;
  } {
    const all = this.getAll();
    const stats = {
      total: all.length,
      verified: all.filter(s => s.status === 'verified').length,
      broken: all.filter(s => s.status === 'broken').length,
      unverified: all.filter(s => s.status === 'unverified').length,
      byMarket: {} as Record<MarketType, number>,
      byClassification: {} as Record<SymbolClassification, number>,
    };

    // Count by market
    all.forEach(s => {
      stats.byMarket[s.market] = (stats.byMarket[s.market] || 0) + 1;
    });

    // Count by classification
    all.forEach(s => {
      stats.byClassification[s.classification] = (stats.byClassification[s.classification] || 0) + 1;
    });

    return stats;
  }

  /**
   * Normalize symbol key for consistent lookups
   */
  private normalizeKey(symbol: string): string {
    return symbol.toUpperCase().trim();
  }
}

/**
 * Global symbol registry instance
 */
export const symbolRegistry = new SymbolRegistry();

/**
 * Normalize symbol for API calls
 * 
 * This is the SINGLE place where symbol transformation logic lives.
 * All other files should use this function instead of implementing their own logic.
 * 
 * Priority:
 * 1. Check registry for verified symbol metadata (uses apiSymbol)
 * 2. Check commodity aliases (GOLD → GC=F, etc.)
 * 3. Apply market-specific transformation rules
 * 
 * @param symbol - Original symbol
 * @param market - Market type
 * @param classification - Symbol classification (optional, will attempt detection)
 * @returns Normalized symbol ready for API calls
 */
export function normalizeSymbolForAPI(
  symbol: string,
  market: MarketType,
  classification?: SymbolClassification
): string {
  let normalized = symbol.toUpperCase().trim();

  // PRIORITY 1: Check if symbol exists in registry with verified metadata
  const registryEntry = symbolRegistry.get(normalized);
  if (registryEntry && registryEntry.status === 'verified') {
    console.log(`[SymbolRegistry] Using verified symbol: ${normalized} → ${registryEntry.apiSymbol}`);
    return registryEntry.apiSymbol;
  }

  // Check if symbol already has a suffix (=, ., -)
  // This prevents double-normalization bugs like "NG=F" → "NG=F=F"
  const hasExistingSuffix = normalized.includes('=') || normalized.includes('.') || normalized.includes('-');

  if (hasExistingSuffix) {
    // Symbol already formatted, return as-is
    console.log(`[SymbolRegistry] Symbol "${normalized}" already has suffix, returning as-is`);
    return normalized;
  }

  // Handle forex pairs with slash separator (USD/GBP → USDGBP=X)
  if (market === 'forex' && normalized.includes('/')) {
    const cleanPair = normalized.replace('/', '');
    console.log(`[SymbolRegistry] Forex pair with slash: ${normalized} → ${cleanPair}=X`);
    return `${cleanPair}=X`;
  }

  // PRIORITY 2: Handle commodity aliases (legacy support)
  if (market === 'commodity') {
    const commodityAliasMap: Record<string, string> = {
      "GOLD": "GC=F",      // Gold futures
      "SILVER": "SI=F",    // Silver futures
      "CRUDE": "CL=F",     // WTI Crude Oil futures
      "OIL": "CL=F",       // WTI Crude Oil futures
      "BRENT": "BZ=F",     // Brent Oil futures
      "NG": "NG=F",        // Natural Gas futures
      "CL": "CL=F",        // WTI Crude Oil futures
      "BZ": "BZ=F",        // Brent Oil futures
    };

    if (commodityAliasMap[normalized]) {
      console.log(`[SymbolRegistry] Using commodity alias: ${normalized} → ${commodityAliasMap[normalized]}`);
      return commodityAliasMap[normalized];
    }
  }

  // PRIORITY 3: Apply market-specific transformation rules
  // Auto-detect classification if not provided
  if (!classification) {
    if (normalized.match(/^X[A-Z]{2}USD$/)) {
      classification = 'spot'; // Spot metals (XAUUSD, XAGUSD)
    } else if (market === 'commodity') {
      classification = 'futures'; // Default commodities to futures
    } else {
      classification = 'spot'; // Default to spot
    }
  }

  if (market === 'forex') {
    // Forex pairs: EURUSD → EURUSD=X
    if (normalized.length === 6) {
      return `${normalized}=X`;
    }
  } else if (market === 'commodity') {
    // Spot commodities (precious metals): XAUUSD → XAUUSD=X
    const isSpotMetal = normalized.match(/^X[A-Z]{2}USD$/);
    if (isSpotMetal || classification === 'spot') {
      return `${normalized}=X`;
    }
    // Futures: NG → NG=F
    if (classification === 'futures' || classification === 'cfd') {
      return `${normalized}=F`;
    }
  } else if (market === 'cryptocurrency') {
    // Crypto on Binance: already in correct format (BTCUSDT)
    // Crypto on Coinbase: BTC-USD (already has hyphen)
    return normalized;
  }

  // Default: return as-is
  return normalized;
}

/**
 * Extract base symbol from various formats
 * 
 * Examples:
 * - BTC-USD → BTC
 * - BTCUSDT → BTC
 * - EURUSD=X → EURUSD
 * 
 * @param symbol - Input symbol
 * @returns Base symbol
 */
export function extractBaseSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  
  // Remove common quote currencies
  return clean
    .replace(/USDT$/g, "")
    .replace(/USD$/g, "")
    .replace(/BUSD$/g, "")
    .replace(/EUR$/g, "")
    .replace(/GBP$/g, "")
    .replace(/JPY$/g, "")
    .replace(/CNY$/g, "");
}

/**
 * Initialize registry with verified symbols from instrument database
 * This should be called on server startup
 */
export function initializeSymbolRegistry(): void {
  // Popular cryptocurrencies (Binance)
  const cryptos: Array<{ symbol: string; name: string; description: string }> = [
    { symbol: "BTCUSDT", name: "Bitcoin", description: "Leading cryptocurrency" },
    { symbol: "ETHUSDT", name: "Ethereum", description: "Smart contract platform" },
    { symbol: "BNBUSDT", name: "Binance Coin", description: "Binance exchange token" },
    { symbol: "SOLUSDT", name: "Solana", description: "Fast blockchain platform" },
    { symbol: "XRPUSDT", name: "XRP", description: "Ripple payment network" },
    { symbol: "ADAUSDT", name: "Cardano", description: "Proof-of-stake blockchain" },
    { symbol: "DOGEUSDT", name: "Dogecoin", description: "Meme cryptocurrency" },
  ];

  cryptos.forEach(({ symbol, name, description }) => {
    symbolRegistry.register({
      symbol,
      name,
      market: 'cryptocurrency',
      classification: 'pair',
      dataSource: 'binance',
      apiSymbol: symbol,
      status: 'verified',
      description,
      recommended: true,
      lastTested: new Date(),
    });
  });

  // Commodity futures (Yahoo Finance)
  // Note: Yahoo Finance only supports futures symbols for commodities, not spot symbols
  const commodityFutures: Array<{ symbol: string; name: string; description: string }> = [
    { symbol: "GC=F", name: "Gold Futures", description: "Gold futures contract" },
    { symbol: "SI=F", name: "Silver Futures", description: "Silver futures contract" },
    { symbol: "PL=F", name: "Platinum Futures", description: "Platinum futures contract" },
    { symbol: "PA=F", name: "Palladium Futures", description: "Palladium futures contract" },
    { symbol: "NG=F", name: "Natural Gas Futures", description: "Natural gas futures contract" },
    { symbol: "CL=F", name: "Crude Oil Futures", description: "WTI crude oil futures" },
    { symbol: "BZ=F", name: "Brent Oil Futures", description: "Brent crude oil futures" },
  ];

  commodityFutures.forEach(({ symbol, name, description }) => {
    symbolRegistry.register({
      symbol,
      name,
      market: 'commodity',
      classification: 'futures',
      dataSource: 'yahoo',
      apiSymbol: symbol,
      status: 'verified',
      description,
      recommended: true,
      lastTested: new Date(),
    });
  });

  // Forex pairs (Yahoo Finance)
  const forexPairs: Array<{ symbol: string; name: string; description: string }> = [
    { symbol: "EURUSD", name: "EUR/USD", description: "Euro to US Dollar" },
    { symbol: "GBPUSD", name: "GBP/USD", description: "British Pound to US Dollar" },
    { symbol: "USDJPY", name: "USD/JPY", description: "US Dollar to Japanese Yen" },
    { symbol: "AUDUSD", name: "AUD/USD", description: "Australian Dollar to US Dollar" },
  ];

  forexPairs.forEach(({ symbol, name, description }) => {
    symbolRegistry.register({
      symbol,
      name,
      market: 'forex',
      classification: 'pair',
      dataSource: 'yahoo',
      apiSymbol: `${symbol}=X`,
      status: 'verified',
      description,
      recommended: true,
      lastTested: new Date(),
    });
  });

  // Major US stocks (Yahoo Finance)
  const usStocks: Array<{ symbol: string; name: string; description: string }> = [
    { symbol: "AAPL", name: "Apple Inc.", description: "Technology company" },
    { symbol: "GOOGL", name: "Alphabet Inc.", description: "Google parent company" },
    { symbol: "MSFT", name: "Microsoft Corporation", description: "Software and cloud services" },
    { symbol: "AMZN", name: "Amazon.com Inc.", description: "E-commerce and cloud services" },
    { symbol: "TSLA", name: "Tesla Inc.", description: "Electric vehicles and energy" },
    { symbol: "META", name: "Meta Platforms Inc.", description: "Social media and technology" },
    { symbol: "NVDA", name: "NVIDIA Corporation", description: "Graphics processing units" },
    { symbol: "JPM", name: "JPMorgan Chase & Co.", description: "Banking and financial services" },
    { symbol: "V", name: "Visa Inc.", description: "Payment processing" },
    { symbol: "WMT", name: "Walmart Inc.", description: "Retail corporation" },
    { symbol: "JNJ", name: "Johnson & Johnson", description: "Pharmaceutical and consumer goods" },
    { symbol: "MA", name: "Mastercard Inc.", description: "Payment processing" },
    { symbol: "PG", name: "Procter & Gamble", description: "Consumer goods" },
    { symbol: "DIS", name: "The Walt Disney Company", description: "Entertainment and media" },
    { symbol: "NFLX", name: "Netflix Inc.", description: "Streaming entertainment" },
    { symbol: "ADBE", name: "Adobe Inc.", description: "Creative software" },
    { symbol: "CSCO", name: "Cisco Systems Inc.", description: "Networking equipment" },
    { symbol: "PEP", name: "PepsiCo Inc.", description: "Food and beverages" },
    { symbol: "KO", name: "The Coca-Cola Company", description: "Beverages" },
  ];

  usStocks.forEach(({ symbol, name, description }) => {
    symbolRegistry.register({
      symbol,
      name,
      market: 'stock',
      classification: 'stock',
      dataSource: 'yahoo',
      apiSymbol: symbol,
      status: 'verified',
      description,
      exchange: 'US',
      recommended: true,
      lastTested: new Date(),
    });
  });

  // Indian stocks (NSE)
  const indianStocks: Array<{ symbol: string; name: string; description: string }> = [
    { symbol: "RELIANCE.NS", name: "Reliance Industries", description: "Indian conglomerate" },
    { symbol: "TCS.NS", name: "Tata Consultancy Services", description: "IT services" },
    { symbol: "INFY.NS", name: "Infosys Limited", description: "IT services" },
    { symbol: "HDFCBANK.NS", name: "HDFC Bank", description: "Banking" },
    { symbol: "ICICIBANK.NS", name: "ICICI Bank", description: "Banking" },
    { symbol: "SBIN.NS", name: "State Bank of India", description: "Public sector bank" },
    { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", description: "Telecommunications" },
    { symbol: "ITC.NS", name: "ITC Limited", description: "Conglomerate" },
    { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", description: "Banking" },
    { symbol: "WIPRO.NS", name: "Wipro Limited", description: "IT services" },
  ];

  indianStocks.forEach(({ symbol, name, description }) => {
    symbolRegistry.register({
      symbol,
      name,
      market: 'stock',
      classification: 'stock',
      dataSource: 'yahoo',
      apiSymbol: symbol,
      status: 'verified',
      description,
      exchange: 'India-NSE',
      recommended: true,
      lastTested: new Date(),
    });
  });

  // Major indices (Yahoo Finance)
  const indices: Array<{ symbol: string; name: string; description: string }> = [
    { symbol: "^GSPC", name: "S&P 500", description: "US large-cap stock index" },
    { symbol: "^DJI", name: "Dow Jones Industrial Average", description: "US stock index" },
    { symbol: "^IXIC", name: "NASDAQ Composite", description: "US tech-heavy stock index" },
    { symbol: "^NSEI", name: "NIFTY 50", description: "Indian stock index" },
  ];

  indices.forEach(({ symbol, name, description }) => {
    symbolRegistry.register({
      symbol,
      name,
      market: 'stock',
      classification: 'index',
      dataSource: 'yahoo',
      apiSymbol: symbol,
      status: 'verified',
      description,
      recommended: true,
      lastTested: new Date(),
    });
  });

  console.log('✅ Symbol registry initialized with', symbolRegistry.getAll().length, 'verified symbols');
}
