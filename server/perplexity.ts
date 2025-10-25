// Removed fetchMarketData import - Perplexity now handles all market data validation via real-time web search

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
  market: string,
  language: string = "en",
  priceData: OHLCVData
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
    const isScalping = duration === "scalping";

    const languageName = languageMap[language] || "English";
    
    // Format market type for display
    const marketName = market.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Calculate next candle close time based on timeframe
    const candleCloseDate = new Date(priceData.candleCloseTime);
    let nextCandleCloseDate = new Date(candleCloseDate);
    
    if (requiredTimeframe === "15min") {
      nextCandleCloseDate.setMinutes(nextCandleCloseDate.getMinutes() + 15);
    } else if (requiredTimeframe === "1hr") {
      nextCandleCloseDate.setHours(nextCandleCloseDate.getHours() + 1);
    } else if (requiredTimeframe === "1day") {
      nextCandleCloseDate.setDate(nextCandleCloseDate.getDate() + 1);
    }
    
    const nextCandleCloseTime = nextCandleCloseDate.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
    
    // Market-specific research sources
    const researchSources = {
      cryptocurrency: "x.com (Twitter/X), coincodex.com, coincentral.com, youtube.com, coinedition.com, feargreedmeter.com",
      stock_equities: "yahoofinance.com, m.economictimes.com, ig.com, marketwatch.com, cnbc.com",
      forex: "forex.com, ig.com, yahoofinance.com, fxstreet.com, dailyfx.com",
      commodity: "ig.com, yahoofinance.com, m.economictimes.com, marketwatch.com",
      bond: "yahoofinance.com, m.economictimes.com, bloomberg.com",
      derivatives_futures: "ig.com, yahoofinance.com, cmegroup.com, m.economictimes.com"
    };
    
    const recommendedSources = researchSources[market as keyof typeof researchSources] || "yahoofinance.com, m.economictimes.com";

    const prompt = `You are an expert financial analyst. Analyze the trading symbol "${symbol}" (${marketName} market) for ${durationContext}.

**PRICE DATA PROVIDED** (from ${priceData.dataSource}):
- Symbol: ${priceData.symbol}
- Live Current Price: $${priceData.livePrice.toFixed(2)}
- Candle Close Price (${priceData.timeframe}): $${priceData.candleClosePrice.toFixed(2)}
- Candle Close Time: ${priceData.candleCloseTime}
- Next Candle Close: ${nextCandleCloseTime}
- OHLCV Data: Open $${priceData.open.toFixed(2)}, High $${priceData.high.toFixed(2)}, Low $${priceData.low.toFixed(2)}, Close $${priceData.close.toFixed(2)}, Volume ${priceData.volume.toLocaleString()}

CRITICAL REQUIREMENTS:
1. **USE EXACT PRICES PROVIDED ABOVE** - Do NOT fetch new prices. Use the exact live price ($${priceData.livePrice.toFixed(2)}) and candle close price ($${priceData.candleClosePrice.toFixed(2)}) provided.
2. VALIDATE THE SYMBOL: Use web search to find the CORRECT standard symbol name and full asset name (e.g., if symbol is "BTC", full name is "Bitcoin")
3. **MANDATORY RESEARCH SOURCES** - Search these ${marketName}-specific sites for news, sentiment, and trends:
   ${recommendedSources}
   Focus on latest news, market sentiment, fear/greed indices, social media buzz, and expert opinions from these sources.
4. Calculate REALISTIC technical indicator values using the OHLCV data provided above
5. **MINIMUM 1:3 RISK-REWARD RATIO REQUIRED** - ${isScalping ? `For SCALPING: Use LIVE CURRENT PRICE ($${priceData.livePrice.toFixed(2)}) for entry/TP/SL calculations. Even for scalping, maintain minimum 1:3 RR or higher (TP3 must be at least 3x the distance from entry to SL).` : `Generate PROFESSIONAL bracket order prices using CANDLE CLOSE PRICE ($${priceData.candleClosePrice.toFixed(2)}) with MINIMUM 1:3 risk-reward ratio (TP3 must be at least 3x the distance from entry to stop loss).`}
6. Provide your ENTIRE analysis in ${languageName}
7. Calculate MULTIPLE take profit targets with STRICT risk-reward requirements:
   - TP1: Conservative target (1:1 risk-reward MINIMUM) - book 50% profit here
   - TP2: Medium target (1:2 risk-reward MINIMUM) - trail stop to breakeven
   - TP3: Aggressive target (1:3 risk-reward MINIMUM - MANDATORY) - maximize remaining position
   **CRITICAL**: If TP3 doesn't achieve 1:3 RR, recalculate all targets to ensure minimum 1:3 ratio.
8. Calculate 3 support levels (S1, S2, S3) and 3 resistance levels (R1, R2, R3) based on current price action
9. **Probability Score Calculation**: Base on:
   - Indicator confluence (RSI, MACD, Stochastic alignment)
   - Trend strength and momentum
   - News sentiment from ${recommendedSources}
   - Support/resistance proximity
   - Volume analysis
   - Market-wide sentiment (fear/greed for crypto, economic data for stocks/forex)
   ONLY recommend trades with 60%+ probability score. If below 60%, note high risk.
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
  "correctedSymbol": "CORRECTED standard ticker symbol from your web search (e.g., 'BTC' not 'btcusdt.p', 'AAPL' not 'apple stock')",
  "assetName": "Full official name of the asset from your web search (e.g., 'Bitcoin', 'Apple Inc.', 'Gold Spot', 'EUR/USD')",
  "marketType": "${market}",
  "currentPrice": "DEPRECATED - Use candleClosePrice instead",
  "livePrice": "${priceData.livePrice.toFixed(2)}",
  "candleClosePrice": "${priceData.candleClosePrice.toFixed(2)}",
  "priceSource": "${priceData.dataSource}",
  "candleCloseTime": "${priceData.candleCloseTime}",
  "timeframe": "${priceData.timeframe}",
  "nextCandleCloseTime": "${nextCandleCloseTime}",
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
  "entry": "${isScalping ? priceData.livePrice.toFixed(2) : priceData.candleClosePrice.toFixed(2)}",
  "takeProfit": "${isScalping ? 'realistic take profit based on live price with tight scalping targets' : 'final take profit price (same as tp3)'}",
  "stopLoss": "${isScalping ? 'realistic stop loss based on live price with tight scalping risk control' : 'realistic stop loss price with tight risk control'}",
  "tp1": "${isScalping ? 'Take Profit 1 - Based on LIVE PRICE with tight scalping targets (1:1 RR)' : 'Take Profit 1 - Conservative 1:1 RR (book 50% profit here)'}",
  "tp2": "${isScalping ? 'Take Profit 2 - Based on LIVE PRICE (1:2 RR)' : 'Take Profit 2 - Medium 1:2 RR (trail stop to breakeven)'}",
  "tp3": "${isScalping ? 'Take Profit 3 - Based on LIVE PRICE (1:3 RR)' : 'Take Profit 3 - Aggressive 1:3 RR (maximize remaining position)'}",
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

IMPORTANT: Return ONLY valid JSON, no additional text before or after. The correctedSymbol and assetName fields must be validated via web search. All price fields must match the EXACT values provided above - DO NOT fetch new prices.`;

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
            content: `You are an expert financial analyst with access to real-time market news and sentiment analysis. CRITICAL: Use the EXACT prices provided in the prompt - DO NOT fetch new prices. ${isScalping ? `For SCALPING: Use the LIVE CURRENT PRICE ($${priceData.livePrice.toFixed(2)}) for entry/TP/SL calculations. Scalping needs actionable levels near current market price.` : `For ${duration.toUpperCase()} analysis: Use the CANDLE CLOSE PRICE ($${priceData.candleClosePrice.toFixed(2)}) for entry and bracket order calculations.`} Return the exact price values provided in your JSON response fields. Return responses in valid JSON format only.`,
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

    // Validate required Perplexity fields (core fields only)
    const requiredFields = [
      'correctedSymbol', 
      'assetName', 
      'marketType', 
      'priceSource'
    ];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Perplexity response missing required fields: ${missingFields.join(', ')}. This indicates Perplexity could not validate the symbol or find market data.`);
    }

    // Validate we have at least one price field
    if (!data.livePrice && !data.candleClosePrice && !data.currentPrice) {
      throw new Error(`Perplexity response missing price data. Need at least one of: livePrice, candleClosePrice, or currentPrice.`);
    }

    // Fallback: Ensure we have both new price fields
    if (!data.livePrice && !data.candleClosePrice) {
      // Use currentPrice for both if new fields are missing
      data.livePrice = data.currentPrice;
      data.candleClosePrice = data.currentPrice;
      console.warn(`⚠️  New price fields not provided, using currentPrice: ${data.currentPrice}`);
    } else if (!data.livePrice) {
      data.livePrice = data.candleClosePrice;
      console.warn(`⚠️  livePrice not provided, using candleClosePrice: ${data.candleClosePrice}`);
    } else if (!data.candleClosePrice) {
      data.candleClosePrice = data.livePrice;
      console.warn(`⚠️  candleClosePrice not provided, using livePrice: ${data.livePrice}`);
    }
    
    // Ensure currentPrice exists for backward compatibility
    if (!data.currentPrice) {
      data.currentPrice = data.candleClosePrice;
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
      console.error(`❌ PRICE VALIDATION FAILED for ${data.correctedSymbol}`);
      console.error(`   • Raw currentPrice: "${data.currentPrice}" (type: ${typeof data.currentPrice})`);
      console.error(`   • Parsed value: ${currentPrice}`);
      console.error(`   • livePrice: "${data.livePrice}"`);
      console.error(`   • candleClosePrice: "${data.candleClosePrice}"`);
      console.error(`   • Full Perplexity response:`, JSON.stringify(data, null, 2));
      
      // Try to use alternate price fields if available
      if (data.livePrice) {
        const livePriceNum = parseFloat(data.livePrice);
        if (!isNaN(livePriceNum) && livePriceNum > 0) {
          console.warn(`⚠️  Using livePrice as fallback: ${data.livePrice}`);
          data.currentPrice = data.livePrice;
        }
      } else if (data.candleClosePrice) {
        const candlePriceNum = parseFloat(data.candleClosePrice);
        if (!isNaN(candlePriceNum) && candlePriceNum > 0) {
          console.warn(`⚠️  Using candleClosePrice as fallback: ${data.candleClosePrice}`);
          data.currentPrice = data.candleClosePrice;
        }
      } else {
        throw new Error(`Invalid price data received from Perplexity. Price must be a positive number.`);
      }
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
