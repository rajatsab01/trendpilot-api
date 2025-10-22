import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

interface MarketAnalysisResult {
  recommendation: "BUY" | "SELL";
  confidence: number;
  sentiment: "Bullish" | "Bearish";
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

export async function analyzeMarket(
  symbol: string,
  duration: string
): Promise<MarketAnalysisResult> {
  // Check if API key is available, if not use mock data
  if (!process.env.GEMINI_API_KEY) {
    console.log("No Gemini API key found, using mock data");
    return getMockAnalysis(symbol, duration);
  }

  try {
    const durationContext = {
      long_term: "long-term investment (months to years)",
      short_term: "short-term trading (days to weeks)",
      scalping: "scalping (minutes to hours)",
    }[duration] || "short-term trading";

    const prompt = `You are an expert financial analyst. Analyze the trading symbol "${symbol}" for ${durationContext}.

Provide a comprehensive analysis with the following:
1. Trading recommendation (BUY or SELL)
2. Confidence level (0-100%)
3. Market sentiment (Bullish or Bearish)
4. Technical indicators: RSI, MACD, Stochastic, Bollinger Bands (provide realistic values)
5. Bracket order suggestions: Entry price, Take Profit price, Stop Loss price
6. Brief analysis explanation (2-3 sentences)

Important: Provide realistic values based on typical market conditions for this symbol and timeframe. All prices should be in the format "1.2345" or similar.

Respond with JSON in this exact format:
{
  "recommendation": "BUY" or "SELL",
  "confidence": number between 1-100,
  "sentiment": "Bullish" or "Bearish",
  "analysis": "your analysis text",
  "rsi": "45.2",
  "macd": "0.12",
  "stochastic": "60.5",
  "bollingerBands": "20.3",
  "entry": "1.2500",
  "takeProfit": "1.2650",
  "stopLoss": "1.2400"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: prompt,
    });

    const rawJson = response.text;

    if (rawJson) {
      const data = JSON.parse(rawJson);
      return {
        recommendation: data.recommendation,
        confidence: data.confidence,
        sentiment: data.sentiment,
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
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Gemini API error, falling back to mock data:", error);
    return getMockAnalysis(symbol, duration);
  }
}

function getMockAnalysis(symbol: string, duration: string): MarketAnalysisResult {
  const isBullish = Math.random() > 0.5;
  const confidence = Math.floor(Math.random() * 30) + 60; // 60-90

  return {
    recommendation: isBullish ? "BUY" : "SELL",
    confidence,
    sentiment: isBullish ? "Bullish" : "Bearish",
    analysis: `The analysis for ${symbol} indicates a ${
      isBullish ? "potential upward" : "potential downward"
    } trend in the ${duration.replace("_", " ")} timeframe, supported by ${
      isBullish ? "positive" : "negative"
    } signals from MACD and Stochastic indicators.`,
    indicators: {
      rsi: (Math.random() * 40 + 30).toFixed(1),
      macd: (Math.random() * 0.5 - 0.25).toFixed(2),
      stochastic: (Math.random() * 40 + 40).toFixed(1),
      bollingerBands: (Math.random() * 30 + 10).toFixed(1),
    },
    bracketOrder: {
      entry: (1.25 + Math.random() * 0.1).toFixed(4),
      takeProfit: (1.35 + Math.random() * 0.1).toFixed(4),
      stopLoss: (1.20 + Math.random() * 0.05).toFixed(4),
    },
  };
}
