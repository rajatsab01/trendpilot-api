import OpenAI from "openai";

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
  language: string = "en"
): Promise<MarketAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }

  try {
    const durationContext = {
      long_term: "long-term investment (months to years)",
      short_term: "short-term trading (days to weeks)",
      scalping: "scalping (minutes to hours)",
    }[duration] || "short-term trading";

    const languageName = languageMap[language] || "English";

    const prompt = `You are an expert financial analyst with real-time market data access. Analyze the trading symbol "${symbol}" for ${durationContext}.

CRITICAL REQUIREMENTS:
1. Use REAL CURRENT market data - look up the actual current price, 52-week range, and recent price action for ${symbol}
2. Calculate REALISTIC technical indicator values based on current market conditions
3. Generate bracket order prices (entry, take profit, stop loss) based on ACTUAL current market price
4. Provide your ENTIRE analysis in ${languageName}

For reference:
- If analyzing stocks: Research current stock price, P/E ratio, volume, recent news
- If analyzing crypto: Research current crypto price in USD, 24h change, market cap, trading volume
- Base ALL analysis on real current market conditions, NOT hypothetical values

Provide a comprehensive 3-layer analysis:

**Layer 1: Market Sentiment**
Analyze overall market conditions, trends, news sentiment, and macro factors affecting this symbol based on CURRENT real market data. 3-4 sentences. Write in ${languageName}.

**Layer 2: Deep Technical Analysis**
Examine chart patterns, support/resistance levels, volume analysis, and momentum indicators based on REAL current price action. 3-4 sentences. Write in ${languageName}.

**Layer 3: AI Final Verdict**
Based on all indicators + market sentiment + deep analysis using REAL data, provide your final trading recommendation with justification. 2-3 sentences. Write in ${languageName}.

IMPORTANT: All numeric values MUST be based on actual current market prices. For example:
- If ${symbol} is trading at $111,140 (like BTC), your entry should be near that price (e.g., "111140.00")
- If ${symbol} is trading at ₹1431 (like RELIANCE), your entry should be near that price (e.g., "1431.20")
- Take profit and stop loss MUST be realistic percentages from current price (typically 1-3% for scalping, 3-7% for short-term, 10%+ for long-term)

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
  "entry": "ACTUAL CURRENT MARKET PRICE (e.g., for BTC at $111,140 use '111140.00', for RELIANCE at ₹1431 use '1431.20')",
  "takeProfit": "realistic take profit based on actual entry price",
  "stopLoss": "realistic stop loss based on actual entry price"
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
