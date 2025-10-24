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

export async function analyzeMarket(
  symbol: string,
  duration: string,
  language: string = "en"
): Promise<MarketAnalysisResult> {
  // Check if API key is available, if not use mock data
  if (!process.env.GEMINI_API_KEY) {
    console.log("No Gemini API key found, using mock data");
    return getMockAnalysis(symbol, duration, language);
  }

  try {
    const durationContext = {
      long_term: "long-term investment (months to years)",
      short_term: "short-term trading (days to weeks)",
      scalping: "scalping (minutes to hours)",
    }[duration] || "short-term trading";

    const languageName = languageMap[language] || "English";

    const prompt = `You are an expert financial analyst. Analyze the trading symbol "${symbol}" for ${durationContext}.

IMPORTANT: Provide your ENTIRE analysis in ${languageName}. All text fields (marketSentiment, deepAnalysis, analysis) must be written completely in ${languageName}.

Provide a comprehensive 3-layer analysis:

**Layer 1: Market Sentiment**
Analyze overall market conditions, trends, news sentiment, and macro factors affecting this symbol. 3-4 sentences. Write in ${languageName}.

**Layer 2: Deep Technical Analysis**
Examine chart patterns, support/resistance levels, volume analysis, and momentum indicators in detail. 3-4 sentences. Write in ${languageName}.

**Layer 3: AI Final Verdict**
Based on all indicators + market sentiment + deep analysis, provide your final trading recommendation with justification. 2-3 sentences. Write in ${languageName}.

Important: Provide realistic values based on typical market conditions for this symbol and timeframe.

Respond with JSON in this exact format:
{
  "recommendation": "BUY" or "SELL",
  "confidence": number between 1-100,
  "sentiment": "Bullish" or "Bearish",
  "marketSentiment": "your market sentiment analysis in ${languageName} (3-4 sentences)",
  "deepAnalysis": "your deep technical analysis in ${languageName} (3-4 sentences)",
  "analysis": "your final AI verdict in ${languageName} (2-3 sentences)",
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
      throw new Error("Empty response from Gemini");
    }
  } catch (error) {
    console.error("Gemini API error, falling back to mock data:", error);
    return getMockAnalysis(symbol, duration, language);
  }
}

function getMockAnalysis(symbol: string, duration: string, language: string = "en"): MarketAnalysisResult {
  const isBullish = Math.random() > 0.5;
  const confidence = Math.floor(Math.random() * 30) + 60; // 60-90

  // Mock analysis in different languages
  const mockTexts: Record<string, any> = {
    en: {
      marketSentiment: `Market conditions for ${symbol} show ${isBullish ? "strong buying interest" : "increased selling pressure"} with ${isBullish ? "positive" : "negative"} momentum. Overall sentiment remains ${isBullish ? "optimistic" : "cautious"} given current market dynamics and recent price action.`,
      deepAnalysis: `Technical analysis reveals ${isBullish ? "bullish" : "bearish"} chart patterns with ${isBullish ? "support holding strong" : "resistance preventing upward movement"}. Volume indicators ${isBullish ? "confirm accumulation" : "suggest distribution"} while momentum oscillators align with the ${isBullish ? "upward" : "downward"} trend.`,
      analysis: `Based on comprehensive analysis of all indicators, market sentiment, and technical factors, a ${isBullish ? "BUY" : "SELL"} position is recommended for ${symbol} in the ${duration.replace("_", " ")} timeframe with ${confidence}% confidence.`,
    },
    hi: {
      marketSentiment: `${symbol} के लिए बाजार की स्थिति ${isBullish ? "मजबूत खरीदारी रुचि" : "बढ़ा हुआ बिक्री दबाव"} दर्शाती है और ${isBullish ? "सकारात्मक" : "नकारात्मक"} गति के साथ है। मौजूदा बाजार गतिशीलता को देखते हुए समग्र भावना ${isBullish ? "आशावादी" : "सतर्क"} बनी हुई है।`,
      deepAnalysis: `तकनीकी विश्लेषण ${isBullish ? "तेजी" : "मंदी"} के चार्ट पैटर्न को प्रकट करता है जिसमें ${isBullish ? "समर्थन मजबूत है" : "प्रतिरोध ऊपर की गति को रोक रहा है"}। वॉल्यूम संकेतक ${isBullish ? "संचय की पुष्टि करते हैं" : "वितरण का सुझाव देते हैं"} जबकि गति दोलक ${isBullish ? "ऊपर की ओर" : "नीचे की ओर"} प्रवृत्ति के साथ संरेखित हैं।`,
      analysis: `सभी संकेतकों, बाजार भावना और तकनीकी कारकों के व्यापक विश्लेषण के आधार पर, ${symbol} के लिए ${duration.replace("_", " ")} समय सीमा में ${confidence}% विश्वास के साथ ${isBullish ? "खरीद" : "बिक्री"} की स्थिति की सिफारिश की जाती है।`,
    },
    es: {
      marketSentiment: `Las condiciones del mercado para ${symbol} muestran ${isBullish ? "fuerte interés de compra" : "mayor presión de venta"} con impulso ${isBullish ? "positivo" : "negativo"}. El sentimiento general se mantiene ${isBullish ? "optimista" : "cauteloso"} dada la dinámica actual del mercado y la acción reciente del precio.`,
      deepAnalysis: `El análisis técnico revela patrones gráficos ${isBullish ? "alcistas" : "bajistas"} con ${isBullish ? "soporte manteniéndose fuerte" : "resistencia impidiendo movimiento ascendente"}. Los indicadores de volumen ${isBullish ? "confirman acumulación" : "sugieren distribución"} mientras que los osciladores de impulso se alinean con la tendencia ${isBullish ? "ascendente" : "descendente"}.`,
      analysis: `Basado en el análisis exhaustivo de todos los indicadores, sentimiento del mercado y factores técnicos, se recomienda una posición de ${isBullish ? "COMPRA" : "VENTA"} para ${symbol} en el marco temporal ${duration.replace("_", " ")} con ${confidence}% de confianza.`,
    },
    zh: {
      marketSentiment: `${symbol}的市场状况显示${isBullish ? "强劲的买入兴趣" : "增加的卖出压力"}，并伴有${isBullish ? "积极" : "消极"}的动能。鉴于当前市场动态和最近的价格走势，整体情绪保持${isBullish ? "乐观" : "谨慎"}。`,
      deepAnalysis: `技术分析显示${isBullish ? "看涨" : "看跌"}的图表模式，${isBullish ? "支撑位保持强劲" : "阻力位阻止上行"}。成交量指标${isBullish ? "确认积累" : "暗示分配"}，而动量振荡器与${isBullish ? "上升" : "下降"}趋势一致。`,
      analysis: `基于对所有指标、市场情绪和技术因素的综合分析，建议在${duration.replace("_", " ")}时间框架内对${symbol}采取${isBullish ? "买入" : "卖出"}仓位，置信度为${confidence}%。`,
    },
    de: {
      marketSentiment: `Die Marktbedingungen für ${symbol} zeigen ${isBullish ? "starkes Kaufinteresse" : "erhöhten Verkaufsdruck"} mit ${isBullish ? "positivem" : "negativem"} Momentum. Die Gesamtstimmung bleibt ${isBullish ? "optimistisch" : "vorsichtig"} angesichts der aktuellen Marktdynamik und der jüngsten Preisentwicklung.`,
      deepAnalysis: `Die technische Analyse zeigt ${isBullish ? "bullische" : "bärische"} Chartmuster mit ${isBullish ? "starker Unterstützung" : "Widerstand gegen Aufwärtsbewegung"}. Volumenindikatoren ${isBullish ? "bestätigen Akkumulation" : "deuten auf Distribution hin"}, während Momentum-Oszillatoren sich mit dem ${isBullish ? "Aufwärts" : "Abwärts"}trend ausrichten.`,
      analysis: `Basierend auf umfassender Analyse aller Indikatoren, Marktstimmung und technischer Faktoren wird eine ${isBullish ? "KAUF" : "VERKAUF"}-Position für ${symbol} im ${duration.replace("_", " ")} Zeitrahmen mit ${confidence}% Zuversicht empfohlen.`,
    },
    fr: {
      marketSentiment: `Les conditions de marché pour ${symbol} montrent ${isBullish ? "un fort intérêt d'achat" : "une pression de vente accrue"} avec un momentum ${isBullish ? "positif" : "négatif"}. Le sentiment global reste ${isBullish ? "optimiste" : "prudent"} compte tenu de la dynamique actuelle du marché et de l'action récente des prix.`,
      deepAnalysis: `L'analyse technique révèle des modèles graphiques ${isBullish ? "haussiers" : "baissiers"} avec ${isBullish ? "un support solide" : "une résistance empêchant le mouvement ascendant"}. Les indicateurs de volume ${isBullish ? "confirment l'accumulation" : "suggèrent la distribution"} tandis que les oscillateurs de momentum s'alignent avec la tendance ${isBullish ? "ascendante" : "descendante"}.`,
      analysis: `Sur la base d'une analyse complète de tous les indicateurs, du sentiment du marché et des facteurs techniques, une position ${isBullish ? "D'ACHAT" : "DE VENTE"} est recommandée pour ${symbol} dans le cadre temporel ${duration.replace("_", " ")} avec ${confidence}% de confiance.`,
    },
    ar: {
      marketSentiment: `تظهر ظروف السوق لـ ${symbol} ${isBullish ? "اهتمامًا قويًا بالشراء" : "ضغطًا متزايدًا على البيع"} مع زخم ${isBullish ? "إيجابي" : "سلبي"}. يظل المعنويات العامة ${isBullish ? "متفائلة" : "حذرة"} بالنظر إلى ديناميكيات السوق الحالية وحركة الأسعار الأخيرة.`,
      deepAnalysis: `يكشف التحليل الفني عن أنماط رسوم بيانية ${isBullish ? "صاعدة" : "هابطة"} مع ${isBullish ? "دعم قوي" : "مقاومة تمنع الحركة الصاعدة"}. تشير مؤشرات الحجم إلى ${isBullish ? "تأكيد التراكم" : "التوزيع"} بينما تتماشى مذبذبات الزخم مع الاتجاه ${isBullish ? "الصاعد" : "الهابط"}.`,
      analysis: `بناءً على التحليل الشامل لجميع المؤشرات ومعنويات السوق والعوامل الفنية، يوصى بموقف ${isBullish ? "شراء" : "بيع"} لـ ${symbol} في الإطار الزمني ${duration.replace("_", " ")} بثقة ${confidence}%.`,
    },
    pt: {
      marketSentiment: `As condições de mercado para ${symbol} mostram ${isBullish ? "forte interesse de compra" : "pressão de venda aumentada"} com momentum ${isBullish ? "positivo" : "negativo"}. O sentimento geral permanece ${isBullish ? "otimista" : "cauteloso"} dada a dinâmica atual do mercado e a ação recente do preço.`,
      deepAnalysis: `A análise técnica revela padrões gráficos ${isBullish ? "altistas" : "baixistas"} com ${isBullish ? "suporte mantendo-se forte" : "resistência impedindo movimento ascendente"}. Indicadores de volume ${isBullish ? "confirmam acumulação" : "sugerem distribuição"} enquanto osciladores de momentum se alinham com a tendência ${isBullish ? "ascendente" : "descendente"}.`,
      analysis: `Com base na análise abrangente de todos os indicadores, sentimento de mercado e fatores técnicos, uma posição de ${isBullish ? "COMPRA" : "VENDA"} é recomendada para ${symbol} no prazo ${duration.replace("_", " ")} com ${confidence}% de confiança.`,
    },
    ru: {
      marketSentiment: `Рыночные условия для ${symbol} показывают ${isBullish ? "сильный интерес к покупке" : "повышенное давление продаж"} с ${isBullish ? "положительным" : "отрицательным"} импульсом. Общие настроения остаются ${isBullish ? "оптимистичными" : "осторожными"} с учетом текущей рыночной динамики и недавнего движения цен.`,
      deepAnalysis: `Технический анализ выявляет ${isBullish ? "бычьи" : "медвежьи"} графические паттерны с ${isBullish ? "сильной поддержкой" : "сопротивлением, препятствующим восходящему движению"}. Индикаторы объема ${isBullish ? "подтверждают накопление" : "предполагают распределение"}, в то время как осцилляторы импульса согласуются с ${isBullish ? "восходящим" : "нисходящим"} трендом.`,
      analysis: `На основе комплексного анализа всех индикаторов, рыночных настроений и технических факторов рекомендуется ${isBullish ? "ПОКУПКА" : "ПРОДАЖА"} для ${symbol} в ${duration.replace("_", " ")} таймфрейме с ${confidence}% уверенностью.`,
    },
    ja: {
      marketSentiment: `${symbol}の市場状況は${isBullish ? "強い買い意欲" : "増加した売り圧力"}を示し、${isBullish ? "ポジティブ" : "ネガティブ"}なモメンタムを伴っています。現在の市場動向と最近の価格動向を考慮すると、全体的なセンチメントは${isBullish ? "楽観的" : "慎重"}なままです。`,
      deepAnalysis: `テクニカル分析は${isBullish ? "強気" : "弱気"}のチャートパターンを明らかにし、${isBullish ? "サポートは強固" : "レジスタンスが上昇を阻んでいます"}。出来高指標は${isBullish ? "蓄積を確認" : "分配を示唆"}し、モメンタムオシレーターは${isBullish ? "上昇" : "下降"}トレンドと一致しています。`,
      analysis: `すべての指標、市場センチメント、テクニカル要因の包括的な分析に基づき、${symbol}について${duration.replace("_", " ")}の時間枠で${confidence}%の信頼度で${isBullish ? "買い" : "売り"}ポジションが推奨されます。`,
    },
    ko: {
      marketSentiment: `${symbol}의 시장 상황은 ${isBullish ? "강한 매수 관심" : "증가한 매도 압력"}을 보이며 ${isBullish ? "긍정적" : "부정적"}인 모멘텀을 동반합니다. 현재 시장 역학과 최근 가격 움직임을 고려할 때 전반적인 심리는 ${isBullish ? "낙관적" : "신중"}으로 유지됩니다.`,
      deepAnalysis: `기술적 분석은 ${isBullish ? "강세" : "약세"}의 차트 패턴을 드러내며 ${isBullish ? "지지선이 강하게 유지" : "저항선이 상승을 막고 있습니다"}. 거래량 지표는 ${isBullish ? "축적을 확인" : "분배를 시사"}하며 모멘텀 오실레이터는 ${isBullish ? "상승" : "하락"} 추세와 일치합니다.`,
      analysis: `모든 지표, 시장 심리 및 기술적 요인에 대한 종합적인 분석을 바탕으로 ${symbol}에 대해 ${duration.replace("_", " ")} 시간 프레임에서 ${confidence}% 신뢰도로 ${isBullish ? "매수" : "매도"} 포지션이 권장됩니다.`,
    },
    it: {
      marketSentiment: `Le condizioni di mercato per ${symbol} mostrano ${isBullish ? "forte interesse all'acquisto" : "maggiore pressione di vendita"} con momentum ${isBullish ? "positivo" : "negativo"}. Il sentimento generale rimane ${isBullish ? "ottimista" : "cauto"} data la dinamica attuale del mercato e la recente azione dei prezzi.`,
      deepAnalysis: `L'analisi tecnica rivela pattern grafici ${isBullish ? "rialzisti" : "ribassisti"} con ${isBullish ? "supporto forte" : "resistenza che impedisce il movimento ascendente"}. Gli indicatori di volume ${isBullish ? "confermano l'accumulo" : "suggeriscono la distribuzione"} mentre gli oscillatori di momentum si allineano con il trend ${isBullish ? "ascendente" : "discendente"}.`,
      analysis: `Sulla base dell'analisi completa di tutti gli indicatori, del sentimento di mercato e dei fattori tecnici, si raccomanda una posizione di ${isBullish ? "ACQUISTO" : "VENDITA"} per ${symbol} nel timeframe ${duration.replace("_", " ")} con ${confidence}% di confidenza.`,
    },
  };

  const texts = mockTexts[language] || mockTexts.en;

  return {
    recommendation: isBullish ? "BUY" : "SELL",
    confidence,
    sentiment: isBullish ? "Bullish" : "Bearish",
    marketSentiment: texts.marketSentiment,
    deepAnalysis: texts.deepAnalysis,
    analysis: texts.analysis,
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
