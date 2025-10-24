import OpenAI from "openai";
import { fetchMarketData } from "./marketData";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

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

export async function analyzeMarketWithOpenAI(
  symbol: string,
  duration: string,
  market: "crypto" | "indian_nse" | "indian_bse" | "us" | "japan" | "singapore" | "currency",
  language: string = "en"
): Promise<MarketAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    // Fetch real market data
    const marketData = await fetchMarketData(symbol, market);
    
    if (marketData.error) {
      throw new Error(`Market data unavailable: ${marketData.error}`);
    }

    const durationContext = {
      long_term: "long-term investment (months to years)",
      short_term: "short-term trading (days to weeks)",
      scalping: "scalping (minutes to hours)",
    }[duration] || "short-term trading";

    const languageName = languageMap[language] || "English";

    // Build market context string with real data
    const marketContext = `
REAL-TIME MARKET DATA FOR ${marketData.symbol}:
- Current Price: ${marketData.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
${marketData.priceChange24h ? `- 24h Price Change: ${marketData.priceChange24h > 0 ? '+' : ''}${marketData.priceChange24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${marketData.priceChangePercentage24h?.toFixed(2)}%)` : ''}
${marketData.volume24h ? `- 24h Trading Volume: ${marketData.volume24h.toLocaleString('en-US')}` : ''}
${marketData.high24h ? `- 24h High: ${marketData.high24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
${marketData.low24h ? `- 24h Low: ${marketData.low24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
${marketData.marketCap ? `- Market Cap: ${marketData.marketCap.toLocaleString('en-US')}` : ''}
`;

    const prompt = `You are an expert financial analyst. Analyze the trading symbol "${marketData.symbol}" for ${durationContext}.

${marketContext}

CRITICAL REQUIREMENTS:
1. Use the REAL market data provided above - Current Price is ${marketData.currentPrice.toFixed(2)}
2. Calculate REALISTIC technical indicator values based on the current market data and price action
3. Generate bracket order prices (entry, take profit, stop loss) based on the ACTUAL current price of ${marketData.currentPrice.toFixed(2)}
4. Provide your ENTIRE analysis in ${languageName}
5. For entry price, use the current market price: ${marketData.currentPrice.toFixed(2)}
6. Calculate take profit and stop loss as realistic percentages from current price:
   - For scalping: 0.5-1.5% moves
   - For short-term: 2-5% moves
   - For long-term: 8-15% moves

Provide a comprehensive 3-layer analysis:

**Layer 1: Market Sentiment**
Analyze overall market conditions, trends, news sentiment, and macro factors affecting this symbol based on CURRENT real market data. 3-4 sentences. Write in ${languageName}.

**Layer 2: Deep Technical Analysis**
Examine chart patterns, support/resistance levels, volume analysis, and momentum indicators based on REAL current price action. 3-4 sentences. Write in ${languageName}.

**Layer 3: AI Final Verdict**
Based on all indicators + market sentiment + deep analysis using REAL data, provide your final trading recommendation with justification. 2-3 sentences. Write in ${languageName}.

IMPORTANT: All numeric values MUST be based on the real current market price provided above.
- Entry price: ${marketData.currentPrice.toFixed(2)} (the actual current market price)
- Take profit and stop loss: Calculate based on current price and duration type
- Example: For ${durationContext}, if recommending BUY at ${marketData.currentPrice.toFixed(2)}, take profit might be ${(marketData.currentPrice * 1.03).toFixed(2)} (3% up) and stop loss might be ${(marketData.currentPrice * 0.98).toFixed(2)} (2% down)

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
  "entry": "${marketData.currentPrice.toFixed(2)}",
  "takeProfit": "realistic take profit price based on ${marketData.currentPrice.toFixed(2)} and ${durationContext}",
  "stopLoss": "realistic stop loss price based on ${marketData.currentPrice.toFixed(2)} and ${durationContext}"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert financial analyst with access to real-time market data. Always use ACTUAL CURRENT prices and market conditions in your analysis. Never use hypothetical or example values.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const rawJson = completion.choices[0]?.message?.content;

    if (rawJson) {
      const data = JSON.parse(rawJson);
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
          takeProfit: data.takeProfit,
          stopLoss: data.stopLoss,
        },
      };
    } else {
      throw new Error("Empty response from OpenAI");
    }
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI analysis failed: ${error.message}`);
  }
}
