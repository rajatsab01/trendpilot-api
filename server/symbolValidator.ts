/**
 * Symbol Validation & Autocomplete Service
 * 
 * Validates trading symbols and provides suggestions based on market type.
 * Fetches initial data to prepare comprehensive context for analysis.
 */

interface SymbolValidationResult {
  isValid: boolean;
  correctedSymbol?: string;
  assetName?: string;
  currentPrice?: number;
  suggestions?: Array<{
    symbol: string;
    name: string;
    price?: number;
  }>;
  error?: string;
}

/**
 * Validate cryptocurrency symbol and get suggestions
 */
async function validateCryptoSymbol(symbol: string): Promise<SymbolValidationResult> {
  try {
    const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
    
    // Try direct Binance lookup
    // Remove USD/USDT suffix first, then add USDT properly
    let baseSymbol = cleanSymbol
      .replace(/USDT$/g, "")  // Remove USDT suffix
      .replace(/USD$/g, "");   // Remove USD suffix
    
    let binanceSymbol = `${baseSymbol}USDT`;
    
    try {
      const tickerUrl = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
      const response = await fetch(tickerUrl);
      
      if (response.ok) {
        const data = await response.json();
        return {
          isValid: true,
          correctedSymbol: binanceSymbol,
          assetName: cleanSymbol, // Will be enriched by Perplexity
          currentPrice: parseFloat(data.price),
        };
      }
    } catch (err) {
      // Symbol not found, continue to suggestions
    }
    
    // Symbol not found directly - fetch popular crypto suggestions
    const suggestions = await fetchCryptoSuggestions(cleanSymbol);
    
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
    const allTickers = await response.json();
    
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
      .map((ticker: any) => ({
        symbol: ticker.symbol,
        name: ticker.symbol.replace("USDT", ""),
        price: parseFloat(ticker.price),
      }));
    
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
    let yahooSymbol = symbol.toUpperCase();
    
    // Apply market-specific formatting
    if (market === "forex") {
      if (!yahooSymbol.includes("=X") && yahooSymbol.length === 6) {
        yahooSymbol = `${yahooSymbol}=X`;
      }
    } else if (market === "commodity") {
      const commodityMap: Record<string, string> = {
        "GOLD": "GC=F",
        "SILVER": "SI=F",
        "CRUDE": "CL=F",
        "OIL": "CL=F",
        "BRENT": "BZ=F",
      };
      yahooSymbol = commodityMap[yahooSymbol] || `${yahooSymbol}=F`;
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
    
    return {
      isValid: true,
      correctedSymbol: yahooSymbol,
      assetName: meta.longName || yahooSymbol,
      currentPrice: meta.regularMarketPrice || meta.previousClose,
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
