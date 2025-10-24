import { fetchMarketData } from "./marketData";

interface MarketAnalysisResult {
  recommendation: "BUY" | "SELL";
  confidence: number;
  sentiment: "Bullish" | "Bearish";
  marketSentiment: string;
  deepAnalysis: string;
  analysis: string;
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

const marketTypeMap: Record<string, string> = {
  stock_equities: "Stock Market (Equities)",
  commodity: "Commodity Market",
  forex: "Foreign Exchange (Forex) Market",
  derivatives_futures: "Derivatives Market (Futures)",
  bond: "Bond Market",
  cryptocurrency: "Cryptocurrency Market",
};

export async function analyzeMarketWithPerplexity(
  symbol: string,
  duration: string,
  market: "stock_equities" | "commodity" | "forex" | "derivatives_futures" | "bond" | "cryptocurrency",
  language: string = "en"
): Promise<MarketAnalysisResult> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured");
  }

  try {
    // Fetch real market data for crypto and forex (others may not have real-time APIs)
    let marketData = null;
    let currentPrice = 0;
    
    if (market === "cryptocurrency") {
      marketData = await fetchMarketData(symbol, "crypto");
      if (!marketData.error) {
        currentPrice = marketData.currentPrice;
      }
    } else if (market === "forex") {
      marketData = await fetchMarketData(symbol, "currency");
      if (!marketData.error) {
        currentPrice = marketData.currentPrice;
      }
    } else if (market === "stock_equities") {
      // Try to fetch stock data - assume US market by default
      marketData = await fetchMarketData(symbol, "us");
      if (!marketData.error) {
        currentPrice = marketData.currentPrice;
      }
    }

    const durationContext = {
      long_term: "long-term investment (months to years)",
      short_term: "short-term trading (days to weeks)",
      scalping: "scalping (minutes to hours)",
    }[duration] || "short-term trading";

    const languageName = languageMap[language] || "English";
    const marketTypeName = marketTypeMap[market] || market;

    // Build market context string with real data if available
    const marketContext = marketData && !marketData.error
      ? `
REAL-TIME MARKET DATA FOR ${marketData.symbol}:
- Current Price: ${marketData.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${marketData.priceChange24h ? `- 24h Price Change: ${marketData.priceChange24h > 0 ? '+' : ''}${marketData.priceChange24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${marketData.priceChangePercentage24h?.toFixed(2)}%)` : ''}
${marketData.volume24h ? `- 24h Trading Volume: ${marketData.volume24h.toLocaleString('en-US')}` : ''}
${marketData.high24h ? `- 24h High: ${marketData.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
${marketData.low24h ? `- 24h Low: ${marketData.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
${marketData.marketCap ? `- Market Cap: ${marketData.marketCap.toLocaleString('en-US')}` : ''}
`
      : `
MARKET INFORMATION:
Please research and provide the current market price for ${symbol} in ${marketTypeName}.
`;

    const prompt = `You are an expert financial analyst with real-time market access. Analyze the trading symbol "${symbol}" in the ${marketTypeName} for ${durationContext}.

${marketContext}

CRITICAL REQUIREMENTS:
1. Research the LATEST news, trends, and price action for ${symbol} in ${marketTypeName}
2. Use your real-time web search to find current market price if not provided above
3. Calculate REALISTIC technical indicator values based on current market data and recent price action
4. Generate bracket order prices (entry, take profit, stop loss) based on ACTUAL current market price
5. Provide your ENTIRE analysis in ${languageName}
6. Calculate take profit and stop loss as realistic percentages from current price:
   - For scalping: 0.5-1.5% moves
   - For short-term: 2-5% moves
   - For long-term: 8-15% moves

Provide a comprehensive 3-layer analysis:

**Layer 1: Market Sentiment**
Analyze overall market conditions, trends, news sentiment, and macro factors affecting this symbol based on CURRENT real market data and recent news. 3-4 sentences. Write in ${languageName}.

**Layer 2: Deep Technical Analysis**
Examine chart patterns, support/resistance levels, volume analysis, and momentum indicators based on REAL current price action. 3-4 sentences. Write in ${languageName}.

**Layer 3: AI Final Verdict**
Based on all indicators + market sentiment + deep analysis using REAL data, provide your final trading recommendation with justification. 2-3 sentences. Write in ${languageName}.

Respond with JSON in this exact format:
{
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
  "entry": "ACTUAL CURRENT MARKET PRICE as a number (e.g., for BTC at $111,140 use '111140.00')",
  "takeProfit": "realistic take profit price based on current market price and ${durationContext}",
  "stopLoss": "realistic stop loss price based on current market price and ${durationContext}"
}

IMPORTANT: Return ONLY valid JSON, no additional text before or after.`;

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
            content: "You are an expert financial analyst with access to real-time market data and news. Always use ACTUAL CURRENT prices and market conditions in your analysis. Return responses in valid JSON format only.",
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
    };
  } catch (error: any) {
    console.error("Perplexity API error:", error);
    throw new Error(`Perplexity analysis failed: ${error.message}`);
  }
}
