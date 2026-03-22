/**
 * Same legal disclaimer as client translations (disclaimerText) + offline technical note.
 * Used when Perplexity is unavailable so Important Notes stay localized.
 */
import { normalizeLangCode, type SupportedLang } from "./translations";

export const STANDARD_DISCLAIMER: Record<SupportedLang, string> = {
  en: "Trading involves risk of loss and is not suitable for all investors. Past performance is not indicative of future results. Trend Pilot provides AI-guided analysis for informational purposes only and should not be considered financial recommendations. Always do your own research and consult with a qualified professional before making any investment decisions.",
  hi: "ट्रेडिंग में नुकसान का जोखिम शामिल है और यह सभी निवेशकों के लिए उपयुक्त नहीं है। पिछला प्रदर्शन भविष्य के परिणामों का संकेत नहीं है। ट्रेंड पायलट केवल सूचनात्मक उद्देश्यों के लिए AI-निर्देशित विश्लेषण प्रदान करता है और इसे वित्तीय सलाह नहीं माना जाना चाहिए। कोई भी निवेश निर्णय लेने से पहले हमेशा एक योग्य वित्तीय सलाहकार से परामर्श करें।",
  es: "El trading implica riesgo de pérdida y no es adecuado para todos los inversores. El rendimiento pasado no es indicativo de resultados futuros. Trend Pilot proporciona análisis guiado por IA solo con fines informativos y no debe considerarse asesoramiento financiero. Siempre consulte con un asesor financiero calificado antes de tomar cualquier decisión de inversión.",
  zh: "交易涉及损失风险，并不适合所有投资者。过去的表现并不代表未来的结果。Trend Pilot 仅提供 AI 引导的分析供参考，不应被视为财务建议。在做出任何投资决策之前，请始终咨询合格的财务顾问。",
  de: "Der Handel birgt Verlustrisiken und ist nicht für alle Anleger geeignet. Die Wertentwicklung in der Vergangenheit ist kein Hinweis auf zukünftige Ergebnisse. Trend Pilot bietet KI-geführte Analysen nur zu Informationszwecken und sollte nicht als Finanzberatung angesehen werden. Konsultieren Sie immer einen qualifizierten Finanzberater, bevor Sie Investitionsentscheidungen treffen.",
  fr: "Le trading comporte des risques de perte et ne convient pas à tous les investisseurs. Les performances passées ne préjugent pas des résultats futurs. Trend Pilot fournit une analyse guidée par l'IA à des fins informatives uniquement et ne doit pas être considérée comme un conseil financier. Consultez toujours un conseiller financier qualifié avant de prendre toute décision d'investissement.",
  ar: "ينطوي التداول على مخاطر الخسارة وليس مناسباً لجميع المستثمرين. الأداء السابق لا يشير إلى النتائج المستقبلية. يوفر Trend Pilot تحليلاً موجهاً بالذكاء الاصطناعي لأغراض إعلامية فقط ولا ينبغي اعتباره نصيحة مالية. استشر دائماً مستشاراً مالياً مؤهلاً قبل اتخاذ أي قرارات استثمارية.",
  pt: "A negociação envolve risco de perda e não é adequada para todos os investidores. O desempenho passado não é indicativo de resultados futuros. Trend Pilot fornece análise guiada por IA apenas para fins informativos e não deve ser considerado aconselhamento financeiro. Sempre consulte um consultor financeiro qualificado antes de tomar qualquer decisão de investimento.",
  ru: "Торговля связана с риском потерь и подходит не для всех инвесторов. Прошлые результаты не являются показателем будущих результатов. Trend Pilot предоставляет анализ с помощью ИИ только в информационных целях и не должен рассматриваться как финансовый совет. Всегда консультируйтесь с квалифицированным финансовым консультантом перед принятием любых инвестиционных решений.",
  ja: "取引には損失のリスクが伴い、すべての投資家に適しているわけではありません。過去の実績は将来の結果を示すものではありません。Trend PilotはAIガイド分析を情報提供目的でのみ提供し、金融アドバイスとは見なされるべきではありません。投資決定を行う前に、必ず資格のある金融アドバイザーに相談してください。",
  ko: "거래에는 손실 위험이 있으며 모든 투자자에게 적합하지 않습니다. 과거 실적은 미래 결과를 나타내지 않습니다. Trend Pilot은 정보 제공 목적으로만 AI 가이드 분석을 제공하며 재무 조언으로 간주되어서는 안 됩니다. 투자 결정을 내리기 전에 항상 자격을 갖춘 재무 고문과 상담하세요.",
  it: "Il trading comporta rischi di perdita e non è adatto a tutti gli investitori. Le performance passate non sono indicative dei risultati futuri. Trend Pilot fornisce analisi guidate dall'IA solo a scopo informativo e non deve essere considerato una consulenza finanziaria. Consultare sempre un consulente finanziario qualificato prima di prendere qualsiasi decisione di investimento.",
};

const OFFLINE_TECHNICAL_NOTE: Record<SupportedLang, string> = {
  en: "Offline mode: levels use the last closed candles in this report. The app disclaimer applies to all analyses.",
  hi: "अतिरिक्त नोट (ऑफ़लाइन मोड): यह रिपोर्ट लाइव AI सेवा के बिना बनाई गई है। मूल्य स्तर रिपोर्ट में दिखाए गए अंतिम बंद मोमबत्तियों से लिए गए हैं। कृपया ट्रेड करने से पहले लाइव कीमतें, स्प्रेड और महत्वपूर्ण समाचार स्वतंत्र स्रोतों पर सत्यापित करें।",
  es: "Nota adicional (modo sin conexión): Este informe se generó sin el servicio de IA en vivo. Los niveles de precio se derivan de las últimas velas cerradas que se muestran en el informe. Verifique precios en vivo, spreads y noticias relevantes en fuentes independientes antes de operar.",
  zh: "补充说明（离线模式）：本报告在未使用实时 AI 服务的情况下生成。价格水平来自报告中所示的最后已收盘 K 线。交易前请在独立渠道核实实时价格、点差及重要新闻。",
  de: "Zusatz (Offline-Modus): Dieser Bericht wurde ohne den Live-KI-Dienst erstellt. Die Preisniveaus basieren auf den zuletzt geschlossenen Kerzen im Bericht. Bitte prüfen Sie Live-Preise, Spreads und wichtige Nachrichten unabhängig, bevor Sie handeln.",
  fr: "Note complémentaire (mode hors ligne) : ce rapport a été généré sans le service d'IA en direct. Les niveaux de prix proviennent des dernières bougies clôturées affichées. Vérifiez les prix en direct, les spreads et l'actualité sur des sources indépendantes avant de trader.",
  ar: "ملاحظة إضافية (وضع عدم الاتصال): أُنشئ هذا التقرير دون خدمة الذكاء الاصطناعي المباشرة. مستويات الأسعار مأخوذة من آخر الشموع المغلقة المعروضة في التقرير. يُرجى التحقق من الأسعار الفعلية والفروقات والأخبار المهمة من مصادر مستقلة قبل التداول.",
  pt: "Nota adicional (modo offline): este relatório foi gerado sem o serviço de IA ao vivo. Os níveis de preço vêm das últimas velas fechadas mostradas no relatório. Verifique preços ao vivo, spreads e notícias relevantes em fontes independentes antes de negociar.",
  ru: "Дополнительно (автономный режим): отчёт создан без службы ИИ в реальном времени. Уровни цен основаны на последних закрытых свечах в отчёте. Перед сделкой проверьте актуальные цены, спреды и важные новости по независимым источникам.",
  ja: "補足（オフラインモード）: 本レポートはライブAIサービスなしで生成されました。価格帯はレポートに表示された最終確定足に基づきます。取引前にライブ価格・スプレッド・重要ニュースを独自の情報源で確認してください。",
  ko: "추가 안내(오프라인 모드): 이 보고서는 실시간 AI 서비스 없이 생성되었습니다. 가격 수준은 보고서에 표시된 마지막 종가 봉을 기준으로 합니다. 거래 전 실시간 가격, 스프레드, 주요 뉴스를 독립적인 출처에서 확인하세요.",
  it: "Nota aggiuntiva (modalità offline): questo report è stato generato senza il servizio IA in tempo reale. I livelli di prezzo derivano dalle ultime candele chiuse mostrate nel report. Verifica prezzi live, spread e notizie rilevanti su fonti indipendenti prima di operare.",
};

/** Short technical line only — full legal text lives in the app UI (Welcome / Analyzer disclaimer). */
export function getOfflineExplanatoryNotes(langCode: string): string {
  const code = normalizeLangCode(langCode);
  return OFFLINE_TECHNICAL_NOTE[code];
}
