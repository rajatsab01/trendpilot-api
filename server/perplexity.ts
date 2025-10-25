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
  currentPrice: string; // DEPRECATED: Use candleClosePrice instead
  livePrice: string; // Actual current live market price
  candleClosePrice: string; // Price at the closed candle used for analysis
  priceSource: string;
  candleCloseTime?: string; // Optional timestamp of candle close
  timeframe?: string; // Candle timeframe (e.g., "15min", "1hr", "1day")
  nextCandleCloseTime?: string; // When the next candle closes (for re-analysis recommendation)
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
    // Map duration to appropriate analysis timeframe
    const timeframeMapping = {
      scalping: { 
        timeframe: "15min",
        context: "scalping (trades executed on 5min, analysis on 15min timeframe)",
        description: "15-minute",
        variants: ["15m", "15min", "15-min", "15 min"]
      },
      short_term: { 
        timeframe: "1hr",
        context: "short-term trading (days to weeks)",
        description: "1-hour or 4-hour",
        variants: ["1h", "1hr", "4h", "4hr", "1hour", "4hour"]
      },
      long_term: { 
        timeframe: "1day",
        context: "long-term investment (months to years)",
        description: "1-day or 1-week",
        variants: ["1d", "1day", "1w", "1week", "daily", "weekly"]
      },
    };

    const durationConfig = timeframeMapping[duration as keyof typeof timeframeMapping] || timeframeMapping.short_term;
    const durationContext = durationConfig.context;
    const requiredTimeframe = durationConfig.timeframe;
    const timeframeDescription = durationConfig.description;

    const languageName = languageMap[language] || "English";

    const prompt = `You are an expert financial analyst with real-time market access. Analyze the trading symbol "${symbol}" for ${durationContext}.

**IMPORTANT**: Use your real-time web search to:
1. AUTO-DETECT what market this symbol belongs to (cryptocurrency, stocks, forex, commodities, bonds, or derivatives)
2. Find ALL market data for this symbol

CRITICAL REQUIREMENTS:
1. VALIDATE AND CORRECT THE SYMBOL: Even if user provides misspelled/incorrect symbol like "btcusdt.p" or "etherium", use your web search to find the CORRECT standard symbol (e.g., "BTC" for Bitcoin, "ETH" for Ethereum)
2. Research the LATEST news, trends, and price action for this asset
3. **MANDATORY DUAL PRICE REQUIREMENT**:
   a. **Candle Close Price**: Find the LAST CLOSED PRICE OF THE ${timeframeDescription.toUpperCase()} CANDLE for analysis accuracy. Look for "${requiredTimeframe} candle close", "${timeframeDescription} close price", or "last ${timeframeDescription} bar close".
   b. **Live Current Price**: ALSO fetch the ACTUAL CURRENT LIVE MARKET PRICE (spot/ticker price) so users see the latest market value.
   c. **Next Candle Close**: Calculate when the NEXT ${timeframeDescription} candle will close (for re-analysis recommendation).
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
  "currentPrice": "DEPRECATED - Use candleClosePrice instead",
  "livePrice": "ACTUAL CURRENT LIVE MARKET PRICE right now (spot/ticker price, e.g., '111655.00' for $111,655.00) - THIS IS WHAT USERS SEE AS 'CURRENT PRICE'",
  "candleClosePrice": "LAST CLOSED PRICE OF ${timeframeDescription.toUpperCase()} CANDLE for analysis (e.g., '111140.50' for $111,140.50) - use this for technical analysis calculations",
  "priceSource": "Where you found these prices (e.g., 'CoinMarketCap live ticker and ${requiredTimeframe} chart')",
  "candleCloseTime": "Timestamp of the ${timeframeDescription} candle close (e.g., '2025-10-25 13:00:00 UTC'). REQUIRED.",
  "timeframe": "MUST match: '${requiredTimeframe}' (the timeframe of the closed candle used for analysis)",
  "nextCandleCloseTime": "When the NEXT ${timeframeDescription} candle will close (e.g., '2025-10-25 14:00:00 UTC' for 1hr, '2025-10-25 13:15:00 UTC' for 15min). Calculate from candleCloseTime + timeframe duration.",
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
  "entry": "LAST CLOSED PRICE OF ${timeframeDescription.toUpperCase()} CANDLE as a number (same as candleClosePrice field above - this is your recommended entry price for analysis)",
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

IMPORTANT: Return ONLY valid JSON, no additional text before or after. The correctedSymbol, assetName, marketType, livePrice, candleClosePrice, candleCloseTime, nextCandleCloseTime, timeframe, and priceSource fields are MANDATORY and must be accurate based on your web research.`;

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
            content: `You are an expert financial analyst with access to real-time market data and news. CRITICAL: For ${duration.toUpperCase()} analysis, always use the LAST CLOSED PRICE OF ${timeframeDescription.toUpperCase()} CANDLES for currentPrice and entry fields - never use tick prices or shorter timeframes. Your timeframe field MUST be one of: ${durationConfig.variants.join(', ')} and priceSource field must mention the ${timeframeDescription} timeframe to confirm the data source. Return responses in valid JSON format only.`,
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

    // VALIDATION: Verify candle data accuracy using multiple checks based on duration
    const priceSource = data.priceSource?.toLowerCase() || '';
    const timeframe = data.timeframe?.toLowerCase() || '';
    const candleCloseTime = data.candleCloseTime || 'Not provided';
    
    // Check 1: Timeframe field matches expected variants for this duration (strongest validation)
    const hasTimeframeConfirmation = durationConfig.variants.some(variant => timeframe === variant.toLowerCase());
    
    // Check 2: Price source mentions the expected timeframe
    const hasTimeframeInSource = durationConfig.variants.some(variant => 
      priceSource.includes(variant.toLowerCase())
    ) || priceSource.includes(timeframeDescription.toLowerCase());
    
    // Check 3: Validate currentPrice is numeric
    const currentPrice = parseFloat(data.currentPrice);
    const isPriceValid = !isNaN(currentPrice) && currentPrice > 0;
    
    if (!isPriceValid) {
      console.error(`❌ PRICE VALIDATION FAILED: currentPrice "${data.currentPrice}" is not a valid number for ${data.correctedSymbol}`);
      throw new Error(`Invalid price data received from Perplexity. Price must be a positive number.`);
    }
    
    // Log validation results
    if (hasTimeframeConfirmation && hasTimeframeInSource) {
      console.log(`✅ FULL VALIDATION PASSED for ${data.correctedSymbol} (${duration.toUpperCase()}):`);
      console.log(`   • Duration: ${duration} requires ${timeframeDescription} candle`);
      console.log(`   • Timeframe: "${data.timeframe}" ✓`);
      console.log(`   • Price Source: "${data.priceSource}" ✓`);
      console.log(`   • Current Price: ${data.currentPrice} ✓`);
      console.log(`   • Candle Close Time: ${candleCloseTime}`);
    } else if (hasTimeframeConfirmation || hasTimeframeInSource) {
      console.warn(`⚠️  PARTIAL VALIDATION for ${data.correctedSymbol} (${duration.toUpperCase()}):`);
      console.warn(`   • Duration: ${duration} requires ${timeframeDescription} candle`);
      console.warn(`   • Timeframe: "${data.timeframe}" ${hasTimeframeConfirmation ? '✓' : '✗'}`);
      console.warn(`   • Price Source: "${data.priceSource}" ${hasTimeframeInSource ? '✓' : '✗'}`);
      console.warn(`   • Current Price: ${data.currentPrice} ✓`);
      console.warn(`   • Candle Close Time: ${candleCloseTime}`);
      console.warn(`   → Price accuracy may vary - not all validation checks passed`);
    } else {
      console.error(`❌ VALIDATION WARNING for ${data.correctedSymbol} (${duration.toUpperCase()}):`);
      console.error(`   • Duration: ${duration} requires ${timeframeDescription} candle`);
      console.error(`   • Timeframe: "${data.timeframe}" ✗ (expected: ${durationConfig.variants.join(', ')})`);
      console.error(`   • Price Source: "${data.priceSource}" ✗ (no ${timeframeDescription} reference found)`);
      console.error(`   • Current Price: ${data.currentPrice} ✓`);
      console.error(`   • Candle Close Time: ${candleCloseTime}`);
      console.error(`   → HIGH RISK: Response does not confirm ${timeframeDescription} candle data!`);
      // Continue anyway but flag for monitoring - this helps identify when AI deviates from requirements
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
      currentPrice: data.currentPrice || data.candleClosePrice, // Backward compatibility
      livePrice: data.livePrice, // Actual current live market price
      candleClosePrice: data.candleClosePrice, // Price at closed candle for analysis
      priceSource: data.priceSource,
      candleCloseTime: data.candleCloseTime, // Timestamp of candle close
      timeframe: data.timeframe, // Candle timeframe used
      nextCandleCloseTime: data.nextCandleCloseTime, // When next candle closes
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
