// Removed fetchMarketData import - Perplexity now handles all market data validation via real-time web search

interface MarketAnalysisResult {
  recommendation: "BUY" | "SELL";
  confidence: number;
  sentiment: "Bullish" | "Bearish";
  marketSentiment: string;
  deepAnalysis: string;
  analysis: string;
  // Perplexity-validated symbol metadata
  correctedSymbol: string;
  assetName: string;
  marketType: string; // Auto-detected market type from Perplexity
  currentPrice: string;
  priceSource: string;
  instrumentName: string | null; // For backward compatibility
  indicators: {
    rsi: string;
    macd: string;
    stochastic: string;
    bollingerBands: string;
  };
  bracketOrder: {
    entry: string;
    takeProfit: string;
    stopLoss: string;
  };
  // Enhanced risk-reward analysis
  takeProfitLevels: {
    tp1: string;
    tp2: string;
    tp3: string;
  };
  supportLevels: {
    s1: string;
    s2: string;
    s3: string;
  };
  resistanceLevels: {
    r1: string;
    r2: string;
    r3: string;
  };
  trailingStopStrategy: string;
  probabilityScore: number;
  explanatoryNotes: string;
}

const languageMap: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  es: "Spanish (Español)",
  zh: "Chinese (中文)",
  de: "German (Deutsch)",
  fr: "French (Français)",
  ar: "Arabic (العربية)",
  pt: "Portuguese (Português)",
  ru: "Russian (Русский)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  it: "Italian (Italiano)",
};

export async function analyzeMarketWithPerplexity(
  symbol: string,
  duration: string,
  language: string = "en"
): Promise<MarketAnalysisResult> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }

  try {
    const durationContext = {
      long_term: "long-term investment (months to years)",
      short_term: "short-term trading (days to weeks)",
      scalping: "scalping (minutes to hours)",
    }[duration] || "short-term trading";

    const languageName = languageMap[language] || "English";

    const prompt = `You are an expert financial analyst with real-time market access. Analyze the trading symbol "${symbol}" for ${durationContext}.

**IMPORTANT**: Use your real-time web search to:
1. AUTO-DETECT what market this symbol belongs to (cryptocurrency, stocks, forex, commodities, bonds, or derivatives)
2. Find ALL market data for this symbol

CRITICAL REQUIREMENTS:
1. VALIDATE AND CORRECT THE SYMBOL: Even if user provides misspelled/incorrect symbol like "btcusdt.p" or "etherium", use your web search to find the CORRECT standard symbol (e.g., "BTC" for Bitcoin, "ETH" for Ethereum)
2. Research the LATEST news, trends, and price action for this asset
3. **MANDATORY PRICE REQUIREMENT**: Use your real-time web search to find the LAST CLOSED PRICE OF THE 5-MINUTE CANDLE as the current price. This is CRITICAL for price accuracy and consistency. Look for "5m candle close", "5min close price", or "last 5-minute bar close" in your data sources. DO NOT use tick prices, 1m candles, or live bid/ask - ONLY 5-minute candle close prices.
4. Calculate REALISTIC technical indicator values based on current market data and recent price action
5. Generate PROFESSIONAL bracket order prices with MINIMUM 1:2 or 1:3 risk-reward ratio
6. Provide your ENTIRE analysis in ${languageName}
7. Calculate MULTIPLE take profit targets (TP1, TP2, TP3) with INCREASING risk-reward:
   - TP1: Conservative target (1:1 risk-reward) - book 50% profit here
   - TP2: Medium target (1:2 risk-reward) - trail stop to breakeven
   - TP3: Aggressive target (1:3 risk-reward) - maximize remaining position
8. Calculate 3 support levels (S1, S2, S3) and 3 resistance levels (R1, R2, R3) based on current price action
9. Provide a probability score (0-100) for this trade setup based on confluence of indicators
10. Include detailed explanatory notes with disclaimers about market risks

Provide a comprehensive 3-layer analysis:

**Layer 1: Market Sentiment**
Analyze overall market conditions, trends, news sentiment, and macro factors affecting this symbol based on CURRENT real market data and recent news. 3-4 sentences. Write in ${languageName}.

**Layer 2: Deep Technical Analysis**
Examine chart patterns, support/resistance levels, volume analysis, and momentum indicators based on REAL current price action. 3-4 sentences. Write in ${languageName}.

**Layer 3: AI Final Verdict**
Based on all indicators + market sentiment + deep analysis using REAL data, provide your final trading recommendation with justification. 2-3 sentences. Write in ${languageName}.

Respond with JSON in this exact format:
{
  "correctedSymbol": "CORRECTED standard ticker symbol (e.g., 'BTC' not 'btcusdt.p', 'AAPL' not 'apple stock')",
  "assetName": "Full official name of the asset (e.g., 'Bitcoin', 'Apple Inc.', 'Gold Spot', 'EUR/USD')",
  "marketType": "AUTO-DETECTED market type - one of: 'cryptocurrency', 'stock_equities', 'commodity', 'forex', 'derivatives_futures', or 'bond'",
  "currentPrice": "LAST CLOSED PRICE OF 5-MINUTE CANDLE as found via web search (just the number, e.g., '111140.50' for $111,140.50) - use this standardized price for accurate market entry",
  "priceSource": "Where you found this 5min candle close price (e.g., 'CoinMarketCap 5m chart', 'TradingView 5m candle', 'Yahoo Finance 5m data', 'Binance 5m close')",
  "recommendation": "BUY" or "SELL",
  "confidence": number between 1-100,
  "sentiment": "Bullish" or "Bearish",
  "marketSentiment": "your market sentiment analysis in ${languageName} (3-4 sentences)",
  "deepAnalysis": "your deep technical analysis in ${languageName} (3-4 sentences)",
  "analysis": "your final AI verdict in ${languageName} (2-3 sentences)",
  "rsi": "actual RSI value based on recent price action (e.g., 45.2)",
  "macd": "actual MACD value (e.g., 0.12 or -0.15)",
  "stochastic": "actual Stochastic value (e.g., 60.5)",
  "bollingerBands": "actual Bollinger Band width (e.g., 20.3)",
  "entry": "LAST CLOSED PRICE OF 5-MINUTE CANDLE as a number (same as currentPrice field above - this is your recommended entry price)",
  "takeProfit": "final take profit price (same as tp3)",
  "stopLoss": "realistic stop loss price with tight risk control",
  "tp1": "Take Profit 1 - Conservative 1:1 RR (book 50% profit here)",
  "tp2": "Take Profit 2 - Medium 1:2 RR (trail stop to breakeven)",
  "tp3": "Take Profit 3 - Aggressive 1:3 RR (maximize remaining position)",
  "s1": "Support Level 1 - Nearest support below current price",
  "s2": "Support Level 2 - Medium support below current price",
  "s3": "Support Level 3 - Strong support below current price",
  "r1": "Resistance Level 1 - Nearest resistance above current price",
  "r2": "Resistance Level 2 - Medium resistance above current price",
  "r3": "Resistance Level 3 - Strong resistance above current price",
  "trailingStopStrategy": "Detailed trailing stop strategy in ${languageName} (e.g., 'Book 50% profit at TP1 (1:1 RR), move stop-loss to breakeven. Trail remaining 50% with TP2 (1:2 RR) as final target.')",
  "probabilityScore": number between 1-100 (probability of success based on indicator confluence, trend strength, and market conditions),
  "explanatoryNotes": "Detailed explanatory notes in ${languageName} about the trade setup, key levels, market context, and risk disclaimers (3-5 sentences, like: 'This ${durationContext} setup is based on current price action at [price] with tight risk control. Key support at [level] and resistance at [level]. Market conditions favor [direction] momentum. Trade with strict discipline and manage position size according to your risk tolerance. Past performance does not guarantee future results.')"
}

IMPORTANT: Return ONLY valid JSON, no additional text before or after. The correctedSymbol, assetName, marketType, currentPrice, and priceSource fields are MANDATORY and must be accurate based on your web research.`;

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are an expert financial analyst with access to real-time market data and news. CRITICAL: Always use the LAST CLOSED PRICE OF 5-MINUTE CANDLES for currentPrice and entry fields - never use tick prices or other timeframes. Your priceSource field MUST mention '5m', '5min', or '5-minute' to confirm the data source. Return responses in valid JSON format only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        top_p: 0.9,
        search_recency_filter: "day",
        return_related_questions: false,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const rawContent = result.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error("Empty response from Perplexity");
    }

    // Extract JSON from response (Perplexity might include extra text)
    let jsonContent = rawContent.trim();
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd);
    }

    const data = JSON.parse(jsonContent);

    // Validate required Perplexity fields
    const requiredFields = ['correctedSymbol', 'assetName', 'marketType', 'currentPrice', 'priceSource'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Perplexity response missing required fields: ${missingFields.join(', ')}. This indicates Perplexity could not validate the symbol or find market data.`);
    }

    // VALIDATION: Verify price source mentions 5-minute candle data for accuracy
    const priceSource = data.priceSource?.toLowerCase() || '';
    const has5MinReference = priceSource.includes('5m') || 
                            priceSource.includes('5min') || 
                            priceSource.includes('5-min') ||
                            priceSource.includes('5 min') ||
                            priceSource.includes('five min');
    
    if (!has5MinReference) {
      console.warn(`⚠️  Price source validation: "${data.priceSource}" does not explicitly mention 5-minute candle data. Price accuracy may vary.`);
      console.warn(`   Symbol: ${data.correctedSymbol}, Current Price: ${data.currentPrice}`);
      // Don't throw error - log warning and continue, as some sources may be valid but not mention timeframe explicitly
    } else {
      console.log(`✅ Price source validated: "${data.priceSource}" confirms 5-minute candle data for ${data.correctedSymbol}`);
    }
    
    // Store auto-detected market type for database
    const detectedMarket = data.marketType;

    // FIX: For SELL trades, AI often returns inverted bracket values
    // For SELL: take profit should be BELOW entry, stop loss should be ABOVE entry
    let takeProfit = data.takeProfit;
    let stopLoss = data.stopLoss;
    
    if (data.recommendation === "SELL") {
      const entryPrice = parseFloat(data.entry);
      const tpPrice = parseFloat(data.takeProfit);
      const slPrice = parseFloat(data.stopLoss);
      
      // Check if values are inverted (TP above entry or SL below entry)
      if (tpPrice > entryPrice || slPrice < entryPrice) {
        // Swap them to correct the logic
        [takeProfit, stopLoss] = [data.stopLoss, data.takeProfit];
      }
    }

    return {
      recommendation: data.recommendation,
      confidence: data.confidence,
      sentiment: data.sentiment,
      marketSentiment: data.marketSentiment || data.analysis,
      deepAnalysis: data.deepAnalysis || data.analysis,
      analysis: data.analysis,
      // Perplexity-validated symbol metadata (replaces external API data)
      correctedSymbol: data.correctedSymbol,
      assetName: data.assetName,
      marketType: detectedMarket, // Auto-detected market type from Perplexity
      currentPrice: data.currentPrice,
      priceSource: data.priceSource,
      instrumentName: data.assetName, // For backward compatibility
      indicators: {
        rsi: data.rsi,
        macd: data.macd,
        stochastic: data.stochastic,
        bollingerBands: data.bollingerBands,
      },
      bracketOrder: {
        entry: data.entry,
        takeProfit: takeProfit,
        stopLoss: stopLoss,
      },
      takeProfitLevels: {
        tp1: data.tp1,
        tp2: data.tp2,
        tp3: data.tp3,
      },
      supportLevels: {
        s1: data.s1,
        s2: data.s2,
        s3: data.s3,
      },
      resistanceLevels: {
        r1: data.r1,
        r2: data.r2,
        r3: data.r3,
      },
      trailingStopStrategy: data.trailingStopStrategy,
      probabilityScore: data.probabilityScore,
      explanatoryNotes: data.explanatoryNotes,
    };
  } catch (error: any) {
    console.error("Perplexity API error:", error);
    throw new Error(`Perplexity analysis failed: ${error.message}`);
  }
}
