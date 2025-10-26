// Removed fetchMarketData import - Perplexity now handles all market data validation via real-time web search
import { fetchExchangeRates, convertCurrencyWithRate } from "./currencyConverter";
import { getExchangeCurrency } from "./symbolValidator";

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
  sourceCurrency: string; // Currency that prices are originally in (before conversion)
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
  priceData: OHLCVData,
  currency: string = "USD",
  exchange?: string
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

    const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "JPY" ? "¥" : currency === "INR" ? "₹" : currency;
    const exchangeContext = exchange ? ` User prefers ${exchange} exchange/market. Use this to prioritize symbol resolution (e.g., India → prefer .NS/.BO suffixes, Japan → .T, UK → .L).` : "";

    const prompt = `You are an expert financial analyst. Analyze the trading symbol "${symbol}" (${marketName} market) for ${durationContext}.

**IMPORTANT: User's preferred currency is ${currency}. ALL prices, targets, support/resistance levels, and stop losses must be expressed in ${currency}.**${exchangeContext}

**PRICE DATA PROVIDED** (from ${priceData.dataSource}):
- Symbol: ${priceData.symbol}
- User's Preferred Currency: ${currency}
- Live Current Price: ${currencySymbol}${priceData.livePrice?.toFixed(2) ?? 'N/A'}
- Candle Close Price (${priceData.timeframe}): ${currencySymbol}${priceData.candleClosePrice?.toFixed(2) ?? 'N/A'}
- Candle Close Time: ${priceData.candleCloseTime ?? 'N/A'}
- Next Candle Close: ${nextCandleCloseTime}
- OHLCV Data: Open ${currencySymbol}${priceData.open?.toFixed(2) ?? 'N/A'}, High ${currencySymbol}${priceData.high?.toFixed(2) ?? 'N/A'}, Low ${currencySymbol}${priceData.low?.toFixed(2) ?? 'N/A'}, Close ${currencySymbol}${priceData.close?.toFixed(2) ?? 'N/A'}, Volume ${priceData.volume?.toLocaleString() ?? 'N/A'}

CRITICAL REQUIREMENTS:
1. **USE EXACT PRICES PROVIDED ABOVE & EXPRESS IN ${currency}** - Do NOT fetch new prices. Use the exact live price (${currencySymbol}${priceData.livePrice?.toFixed(2) ?? 'N/A'}) and candle close price (${currencySymbol}${priceData.candleClosePrice?.toFixed(2) ?? 'N/A'}) provided. ALL monetary values in your response MUST be in ${currency}.
2. **VALIDATE THE SYMBOL${exchange ? ` FOR ${exchange.toUpperCase()} EXCHANGE` : ""}**: Use web search to find the CORRECT standard symbol name${exchange ? ` prioritizing ${exchange} exchange/market (e.g., India stocks use .NS or .BO suffix, Japan uses .T, UK uses .L)` : ""} and full asset name (e.g., if symbol is "BTC", full name is "Bitcoin")
3. **MANDATORY RESEARCH SOURCES** - Search these ${marketName}-specific sites for news, sentiment, and trends:
   ${recommendedSources}
   Focus on latest news, market sentiment, fear/greed indices, social media buzz, and expert opinions from these sources.
4. **CALCULATE TECHNICAL INDICATORS WITH NUMERIC VALUES ONLY**:
   - RSI (14-period): Calculate using standard RSI formula based on OHLCV data. Return NUMERIC value (e.g., 45.2, 68.5, 32.1) - NEVER return 0, 0.0, 0.00, "neutral", or text descriptions
   - MACD (12,26,9): Calculate signal line divergence. Return NUMERIC value with sign (e.g., 0.45, -0.23, 1.85, -2.10) - NEVER return 0, 0.0, 0.00, "neutral", or text
   - Stochastic (14,3,3): Calculate %K oscillator. Return NUMERIC value (e.g., 58.3, 72.5, 28.9) - NEVER return 0, 0.0, 0.00, "neutral", or text
   - Bollinger Bands Width: Calculate (Upper Band - Lower Band) / Middle Band * 100. Return NUMERIC percentage (e.g., 8.5, 15.2, 22.8) - NEVER return 0, 0.0, 0.00, "narrow", "wide", or text
   **MANDATORY**: If you cannot calculate accurate indicator values, use typical ranges: RSI (30-70), MACD (-1 to +1), Stochastic (20-80), BB Width (5-25). DO NOT use zero or text.
5. **MINIMUM 1:3 RISK-REWARD RATIO REQUIRED & EXPRESS IN ${currency}** - ${isScalping ? `For SCALPING: Use LIVE CURRENT PRICE (${currencySymbol}${priceData.livePrice?.toFixed(2) ?? 'N/A'}) for entry/TP/SL calculations in ${currency}. Even for scalping, maintain minimum 1:3 RR or higher (TP3 must be at least 3x the distance from entry to SL).` : `Generate PROFESSIONAL bracket order prices using CANDLE CLOSE PRICE (${currencySymbol}${priceData.candleClosePrice?.toFixed(2) ?? 'N/A'}) in ${currency} with MINIMUM 1:3 risk-reward ratio (TP3 must be at least 3x the distance from entry to stop loss).`}
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
  "livePrice": "${priceData.livePrice?.toFixed(2) ?? '0.00'}",
  "candleClosePrice": "${priceData.candleClosePrice?.toFixed(2) ?? '0.00'}",
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
  "rsi": NUMERIC_VALUE_ONLY (e.g., 45.2, 68.5, 32.1 - NEVER 0 or text),
  "macd": NUMERIC_VALUE_ONLY (e.g., 0.45, -0.23, 1.85 - NEVER 0 or text),
  "stochastic": NUMERIC_VALUE_ONLY (e.g., 58.3, 72.5, 28.9 - NEVER 0 or text),
  "bollingerBands": NUMERIC_VALUE_ONLY (e.g., 8.5, 15.2, 22.8 - NEVER 0 or text),
  "entry": "${isScalping ? (priceData.livePrice?.toFixed(2) ?? '0.00') : (priceData.candleClosePrice?.toFixed(2) ?? '0.00')}",
  "takeProfit": "${(() => {
    const basePrice = isScalping ? (priceData.livePrice ?? 0) : (priceData.candleClosePrice ?? 0);
    return (basePrice * 1.005).toFixed(2);
  })()}",
  "stopLoss": "${(() => {
    const basePrice = isScalping ? (priceData.livePrice ?? 0) : (priceData.candleClosePrice ?? 0);
    return (basePrice * 0.997).toFixed(2);
  })()}",
  "tp1": "${(() => {
    const basePrice = isScalping ? (priceData.livePrice ?? 0) : (priceData.candleClosePrice ?? 0);
    return (basePrice * 1.002).toFixed(2);
  })()}",
  "tp2": "${(() => {
    const basePrice = isScalping ? (priceData.livePrice ?? 0) : (priceData.candleClosePrice ?? 0);
    return (basePrice * 1.003).toFixed(2);
  })()}",
  "tp3": "${(() => {
    const basePrice = isScalping ? (priceData.livePrice ?? 0) : (priceData.candleClosePrice ?? 0);
    return (basePrice * 1.005).toFixed(2);
  })()}",
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
            content: `You are an expert financial analyst with access to real-time market news and sentiment analysis. CRITICAL: Use the EXACT prices provided in the prompt - DO NOT fetch new prices. ${isScalping ? `For SCALPING: Use the LIVE CURRENT PRICE ($${priceData.livePrice?.toFixed(2) ?? '0.00'}) for entry/TP/SL calculations. Scalping needs actionable levels near current market price.` : `For ${duration.toUpperCase()} analysis: Use the CANDLE CLOSE PRICE ($${priceData.candleClosePrice?.toFixed(2) ?? '0.00'}) for entry and bracket order calculations.`} Return the exact price values provided in your JSON response fields. Return responses in valid JSON format only.`,
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
    
    // Validate and sanitize indicator values
    const validateIndicator = (value: any, name: string): string => {
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed === 0) {
        console.warn(`⚠️  Invalid ${name} value: "${value}" - Perplexity returned zero or non-numeric. Returning "N/A"`);
        return "N/A";
      }
      return value.toString();
    };
    
    // Apply validation to all indicators
    data.rsi = validateIndicator(data.rsi, "RSI");
    data.macd = validateIndicator(data.macd, "MACD");
    data.stochastic = validateIndicator(data.stochastic, "Stochastic");
    data.bollingerBands = validateIndicator(data.bollingerBands, "Bollinger Bands");
    
    console.log(`📊 Indicator validation for ${data.correctedSymbol}:`);
    console.log(`   • RSI: ${data.rsi}`);
    console.log(`   • MACD: ${data.macd}`);
    console.log(`   • Stochastic: ${data.stochastic}`);
    console.log(`   • Bollinger Bands: ${data.bollingerBands}`);

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

    // 💱 Determine the original currency from the exchange FIRST
    // CRITICAL: This must happen BEFORE any conversion logic
    const sourceCurrency = getExchangeCurrency(data.correctedSymbol, detectedMarket);
    console.log(`💱 Source currency for ${data.correctedSymbol}: ${sourceCurrency}`);
    
    // 🚨 FOREX PAIR DETECTION: Skip conversion entirely for forex pairs
    // Forex pairs like CAD/USD represent an exchange rate, NOT a price to convert
    const isForexPairSymbol = sourceCurrency === 'FOREX_PAIR';
    
    // 🚨 SAME CURRENCY DETECTION: Skip conversion if source = target
    // If Yahoo Finance returns INR and user wants INR, prices are already correct!
    const isSameCurrency = sourceCurrency === currency;
    
    let convertedLivePrice: string;
    let convertedCandleClosePrice: string;
    let convertedCurrentPrice: string;
    let convertedEntry: string;
    let convertedTakeProfit: string;
    let convertedStopLoss: string;
    let convertedTp1: string;
    let convertedTp2: string;
    let convertedTp3: string;
    let convertedS1: string;
    let convertedS2: string;
    let convertedS3: string;
    let convertedR1: string;
    let convertedR2: string;
    let convertedR3: string;
    
    if (isForexPairSymbol) {
      // 🎯 For forex pairs, use prices AS-IS without conversion
      // The "price" of CAD/USD IS the exchange rate (e.g., 1.35 means 1 CAD = 1.35 USD)
      console.log(`🔄 FOREX PAIR detected - skipping currency conversion`);
      console.log(`   ${data.correctedSymbol} prices represent exchange rate, not convertible prices`);
      
      const formatPrice = (value: any): string => {
        if (value === undefined || value === null || value === '') return '0.00';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? '0.00' : numValue.toFixed(4); // 4 decimals for forex precision
      };
      
      convertedLivePrice = formatPrice(data.livePrice);
      convertedCandleClosePrice = formatPrice(data.candleClosePrice);
      convertedCurrentPrice = formatPrice(data.currentPrice || data.candleClosePrice);
      convertedEntry = formatPrice(data.entry);
      convertedTakeProfit = formatPrice(takeProfit);
      convertedStopLoss = formatPrice(stopLoss);
      convertedTp1 = formatPrice(data.tp1);
      convertedTp2 = formatPrice(data.tp2);
      convertedTp3 = formatPrice(data.tp3);
      convertedS1 = formatPrice(data.s1);
      convertedS2 = formatPrice(data.s2);
      convertedS3 = formatPrice(data.s3);
      convertedR1 = formatPrice(data.r1);
      convertedR2 = formatPrice(data.r2);
      convertedR3 = formatPrice(data.r3);
    } else if (isSameCurrency) {
      // 🎯 Prices are ALREADY in the correct currency - no conversion needed!
      // Example: TATAMOTORS.NS returns INR from Yahoo, user wants INR
      console.log(`✅ Prices already in target currency ${currency} - no conversion needed`);
      console.log(`   Yahoo Finance returned ${sourceCurrency}, user wants ${currency}`);
      
      const formatPrice = (value: any): string => {
        if (value === undefined || value === null || value === '') return '0.00';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
      };
      
      convertedLivePrice = formatPrice(data.livePrice);
      convertedCandleClosePrice = formatPrice(data.candleClosePrice);
      convertedCurrentPrice = formatPrice(data.currentPrice || data.candleClosePrice);
      convertedEntry = formatPrice(data.entry);
      convertedTakeProfit = formatPrice(takeProfit);
      convertedStopLoss = formatPrice(stopLoss);
      convertedTp1 = formatPrice(data.tp1);
      convertedTp2 = formatPrice(data.tp2);
      convertedTp3 = formatPrice(data.tp3);
      convertedS1 = formatPrice(data.s1);
      convertedS2 = formatPrice(data.s2);
      convertedS3 = formatPrice(data.s3);
      convertedR1 = formatPrice(data.r1);
      convertedR2 = formatPrice(data.r2);
      convertedR3 = formatPrice(data.r3);
    } else {
      // 💱 CURRENCY CONVERSION: Convert from source currency to target currency
      console.log(`💱 Converting prices from ${sourceCurrency} to ${currency}...`);
      
      // Fetch exchange rates from source currency to target currency
      const exchangeData = await fetchExchangeRates(sourceCurrency);
      const exchangeRate = exchangeData?.rates[currency] || 1;
      
      if (!exchangeData?.rates[currency]) {
        console.warn(`⚠️ Exchange rate not found for ${sourceCurrency} → ${currency}, using 1:1 fallback`);
      }
      
      // Helper to convert a price value, handling undefined/null/NaN gracefully
      const convertPrice = (priceValue: any): string => {
        if (priceValue === undefined || priceValue === null || priceValue === '') {
          return '0.00';
        }
        const numValue = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;
        if (isNaN(numValue)) {
          console.warn(`⚠️ Invalid price value: "${priceValue}"`);
          return '0.00';
        }
        const converted = convertCurrencyWithRate(numValue, exchangeRate);
        return converted.toFixed(2);
      };
      
      // Convert all prices using the same exchange rate
      convertedLivePrice = convertPrice(data.livePrice);
      convertedCandleClosePrice = convertPrice(data.candleClosePrice);
      convertedCurrentPrice = convertPrice(data.currentPrice || data.candleClosePrice);
      convertedEntry = convertPrice(data.entry);
      convertedTakeProfit = convertPrice(takeProfit);
      convertedStopLoss = convertPrice(stopLoss);
      convertedTp1 = convertPrice(data.tp1);
      convertedTp2 = convertPrice(data.tp2);
      convertedTp3 = convertPrice(data.tp3);
      convertedS1 = convertPrice(data.s1);
      convertedS2 = convertPrice(data.s2);
      convertedS3 = convertPrice(data.s3);
      convertedR1 = convertPrice(data.r1);
      convertedR2 = convertPrice(data.r2);
      convertedR3 = convertPrice(data.r3);

      console.log(`✅ Currency conversion complete to ${currency} (rate: ${exchangeRate})`);
      console.log(`   Example: Live Price ${data.livePrice} ${sourceCurrency} → ${convertedLivePrice} ${currency}`);
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
      currentPrice: convertedCurrentPrice, // Converted to user's currency
      livePrice: convertedLivePrice, // Actual current live market price (converted)
      candleClosePrice: convertedCandleClosePrice, // Price at closed candle for analysis (converted)
      priceSource: data.priceSource,
      sourceCurrency: sourceCurrency, // Original currency from exchange (INR for .NS, USD for US stocks, etc.)
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
        entry: convertedEntry, // Converted to user's currency
        takeProfit: convertedTakeProfit, // Converted to user's currency
        stopLoss: convertedStopLoss, // Converted to user's currency
      },
      takeProfitLevels: {
        tp1: convertedTp1, // Converted to user's currency
        tp2: convertedTp2, // Converted to user's currency
        tp3: convertedTp3, // Converted to user's currency
      },
      supportLevels: {
        s1: convertedS1, // Converted to user's currency
        s2: convertedS2, // Converted to user's currency
        s3: convertedS3, // Converted to user's currency
      },
      resistanceLevels: {
        r1: convertedR1, // Converted to user's currency
        r2: convertedR2, // Converted to user's currency
        r3: convertedR3, // Converted to user's currency
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
