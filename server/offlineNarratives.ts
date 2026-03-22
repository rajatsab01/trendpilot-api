/**
 * Localized prose for Perplexity offline / quota fallback.
 * Must match UI language when the live model is unavailable.
 */
import { normalizeLangCode, type SupportedLang } from "./translations";

export interface OfflineNarrativeCtx {
  timeframe: string;
  symbol: string;
  recommendation: "BUY" | "SELL";
  sentiment: "Bullish" | "Bearish";
  bbN: number;
  macdN: number;
  /** 1 = long bias math, -1 = short */
  mult: number;
}

export interface OfflineNarrativeBundle {
  marketSentiment: string;
  newsHighlights: string;
  deepAnalysis: string;
  analysis: string;
  trailingStopStrategy: string;
}

function bb(bbN: number): string {
  return bbN.toFixed(1);
}

function mac(m: number): string {
  return m.toFixed(4);
}

const en = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `On this ${c.timeframe} chart, Bollinger %B is near ${bb(c.bbN)}. Structure favors buyers while the latest swing low holds; a clear break below would weaken the long view.`
      : `On this ${c.timeframe} chart, Bollinger %B is near ${bb(c.bbN)}. Structure favors sellers while the latest swing high caps rallies; sustained strength above it would shift the read.`,
  newsHighlights: `Symbol-specific headlines need the live AI research service (Perplexity). It is not available on this server—often because PERPLEXITY_API_KEY is missing in development, or the provider returned an error. The chart and price levels in this report still use market data for the symbol. For breaking news, use a trusted financial source.`,
  deepAnalysis: `Using the ${c.timeframe} structure, Bollinger %B is about ${bb(c.bbN)} and MACD is ${mac(c.macdN)}. Together that supports a ${c.recommendation} bias versus the recent range. A close beyond the suggested stop area would invalidate this read.`,
  analysis: `The model leans ${c.recommendation} on ${c.symbol} using the bracket shown below. Weakness at the entry zone or strong opposing flow can invalidate the setup—wait for a clean retest if the structure breaks down.`,
  trailingStopStrategy: `After the first target, consider moving the stop toward breakeven, then trailing it under ${c.mult > 0 ? "each higher low" : "each lower high"} as the move extends. If momentum fades into an overbought or oversold extreme, tighten risk rather than widening it.`,
});

const hi = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `इस ${c.timeframe} चार्ट पर अल्पकालिक रुख हल्का सकारात्मक है: बॉलिंगर %B लगभग ${bb(c.bbN)} है। पोज़िशन बढ़ाने से पहले देखें कि कीमत नवीनतम स्विंग लो पर टिकी रहती है या नहीं; नीचे साफ़ टूटने पर लॉन्ग दृष्टिकोण कमज़ोर हो सकता है।`
      : `इस ${c.timeframe} चार्ट पर रुख सतर्क है: बॉलिंगर %B लगभग ${bb(c.bbN)} है। नवीनतम स्विंग हाई पर नज़र रखें; उसके ऊपर लगातार मज़बूती शॉर्ट दबाव को कमज़ोर कर सकती है।`,
  newsHighlights: `लाइव रिसर्च सेवा ऑफ़लाइन होने के कारण शीर्षक समाचार उपलब्ध नहीं हैं। इस रिपोर्ट के स्तरों और संकेतकों को केवल प्रारंभिक बिंदु मानें; पूँजी लगाने से पहले कमाई, मैक्रो या कंपनी-विशेष घटनाओं के लिए विश्वसनीय समाचार स्रोत जाँचें।`,
  deepAnalysis: `${c.timeframe} संरचना में बॉलिंगर %B लगभग ${bb(c.bbN)} है और MACD ${mac(c.macdN)} है। यह हाल की रेंज के मुकाबले ${c.recommendation === "BUY" ? "खरीदारी" : "बिकवाली"} की ओर झुकाव दर्शाता है। सुझाए गए स्टॉप क्षेत्र के पार बंद होने पर इस दृष्टिकोण को अमान्य मानें।`,
  analysis: `मॉडल ${c.symbol} पर ${c.recommendation === "BUY" ? "खरीदारी" : "बिकवाली"} की ओर संकेत देता है। यदि कीमत प्रवेश क्षेत्र पर मज़बूत विपरीत प्रवाह पर बार-बार अस्वीकार होती है, तो सेटअप कमज़ोर मानें और साफ़ संरचना का इंतज़ार करें।`,
  trailingStopStrategy: `पहले लक्ष्य के बाद स्टॉप को ब्रेकईवन की ओर लाने पर विचार करें, फिर चाल के साथ ${c.mult > 0 ? "प्रत्येक उच्चतर लो" : "प्रत्येक निम्नतर हाई"} के नीचे ट्रेल करें। अति-खरीद या अति-बिक्री में गति कम होने पर जोखिम कस लें, चौड़ा न करें।`,
});

const es = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `En el gráfico ${c.timeframe}, el tono a corto plazo es levemente favorable: el %B de Bollinger ronda ${bb(c.bbN)}. Observe si el precio mantiene el último mínimo antes de aumentar tamaño; una ruptura clara debajo debilitaría el sesgo alcista.`
      : `En el gráfico ${c.timeframe}, el tono es cauteloso: el %B de Bollinger ronda ${bb(c.bbN)}. Vigile el último máximo; una fortaleza sostenida por encima debilitaría el sesgo bajista desde aquí.`,
  newsHighlights: `No hay titulares en vivo mientras el servicio de investigación está desconectado. Use niveles e indicadores solo como punto de partida; confirme noticias relevantes en fuentes fiables antes de asignar capital.`,
  deepAnalysis: `En la estructura ${c.timeframe}, el %B de Bollinger es ~${bb(c.bbN)} y el MACD es ${mac(c.macdN)}. En conjunto apoya un sesgo ${c.recommendation} frente al rango reciente. Un cierre más allá de la zona de stop sugerida invalida la idea.`,
  analysis: `El modelo se inclina a ${c.recommendation} en ${c.symbol} con el bracket indicado. Si el precio rechaza repetidamente la zona de entrada con flujo contrario fuerte, espere una estructura más clara.`,
  trailingStopStrategy: `Tras el primer objetivo, acerque el stop hacia el punto de equilibrio y luego arrástrelo por debajo de ${c.mult > 0 ? "cada mínimo creciente" : "cada máximo decreciente"}. Si el impulso se agota en extremos, reduzca el riesgo.`,
});

const zh = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `在此${c.timeframe}图表上，短线氛围略偏多：布林带%B约为${bb(c.bbN)}。加仓前观察价格能否守住最近摆动低点；若向下跌破，则看多逻辑减弱。`
      : `在此${c.timeframe}图表上，氛围偏谨慎：布林带%B约为${bb(c.bbN)}。关注最近摆动高点；若持续站稳上方，则不宜在此一味做空。`,
  newsHighlights: `实时研究服务离线时无法提供新闻标题。请将报告中的价位与指标仅作参考，下单前请在可靠渠道核实财报、宏观及公司事件。`,
  deepAnalysis: `从${c.timeframe}结构看，布林带%B约${bb(c.bbN)}，MACD为${mac(c.macdN)}，整体相对近期区间偏向${c.recommendation}。若收盘明显突破建议止损区，应视为失效。`,
  analysis: `模型对${c.symbol}偏向${c.recommendation}，以下方括号为准。若价格在入场区反复被强反向成交拒绝，应视为形态走弱并等待更清晰结构。`,
  trailingStopStrategy: `触及第一目标后，可将止损向盈亏平衡靠拢，随后在走势延伸过程中${c.mult > 0 ? "沿每次抬高的低点" : "沿每次降低的高点"}下方跟踪。若动能进入极端超买/超卖，应收紧风险而非放大。`,
});

const de = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `Auf dem ${c.timeframe}-Chart wirkt die kurzfristige Stimmung leicht unterstützend: Bollinger-%B liegt bei etwa ${bb(c.bbN)}. Prüfen Sie, ob der Kurs das jüngste Swing-Tief hält, bevor Sie die Positionsgröße erhöhen; ein klarer Bruch nach unten schwächt das Long-Szenario.`
      : `Auf dem ${c.timeframe}-Chart ist die Stimmung vorsichtig: Bollinger-%B liegt bei etwa ${bb(c.bbN)}. Beobachten Sie das jüngste Swing-Hoch; anhaltende Stärke darüber spricht gegen aggressive Shorts von hier.`,
  newsHighlights: `Schlagzeilen stehen nicht zur Verfügung, solange der Live-Recherchedienst offline ist. Nutzen Sie Levels und Indikatoren nur als Ausgangspunkt und prüfen Sie relevante Nachrichten vor Kapitalbindung.`,
  deepAnalysis: `In der ${c.timeframe}-Struktur liegen Bollinger-%B bei etwa ${bb(c.bbN)} und der MACD bei ${mac(c.macdN)}. Zusammen sprechen sie für eine ${c.recommendation}-Tendenz zur aktuellen Range. Ein Schlusskurs jenseits der vorgeschlagenen Stop-Zone wäre eine klare Invalidierung.`,
  analysis: `Das Modell tendiert zu ${c.recommendation} bei ${c.symbol} gemäß dem untenstehenden Rahmen. Wird die Einstiegszone wiederholt mit starkem Gegenfluss abgewiesen, gilt das Setup als geschwächt.`,
  trailingStopStrategy: `Nach dem ersten Ziel den Stop Richtung Break-even ziehen und dann unter ${c.mult > 0 ? "jedem höheren Tief" : "jedem niedrigeren Hoch"} nachziehen. Bei nachlassendem Momentum in Extremzonen Risiko eher straffen.`,
});

const fr = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `Sur le graphique ${c.timeframe}, le ton court terme est légèrement favorable : le %B de Bollinger est vers ${bb(c.bbN)}. Vérifiez que le prix tient le dernier creux avant d'augmenter la taille ; une cassure nette en dessous affaiblit le biais long.`
      : `Sur le graphique ${c.timeframe}, le ton est prudent : le %B de Bollinger est vers ${bb(c.bbN)}. Surveillez le dernier sommet ; une force durable au-dessus affaiblit la pression vendeuse ici.`,
  newsHighlights: `Les titres ne sont pas disponibles tant que le service de recherche en direct est hors ligne. Utilisez niveaux et indicateurs comme point de départ, puis vérifiez l'actualité sur des sources fiables avant d'engager du capital.`,
  deepAnalysis: `Sur la structure ${c.timeframe}, le %B de Bollinger est d'environ ${bb(c.bbN)} et le MACD est ${mac(c.macdN)}. Ensemble cela soutient un biais ${c.recommendation} par rapport à la fourchette récente. Une clôture au-delà de la zone de stop proposée invalide la lecture.`,
  analysis: `Le modèle penche vers ${c.recommendation} sur ${c.symbol} avec le cadre ci-dessous. Si le prix rejette plusieurs fois la zone d'entrée avec un flux opposé fort, attendez une structure plus nette.`,
  trailingStopStrategy: `Après le premier objectif, rapprochez le stop du seuil de rentabilité, puis tranchez sous ${c.mult > 0 ? "chaque creux plus haut" : "chaque sommet plus bas"}. Si l'élan faiblit en zone extrême, resserrez le risque.`,
});

const ar = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `على مخطط ${c.timeframe} يبدو المزاج قصير الأجل داعمًا قليلًا: مؤشر بولينجر %B قرب ${bb(c.bbN)}. راقب ما إذا كان السعر يحافظ على آخر قاع تأرجح قبل زيادة الحجم؛ كسر حاسم للأسفل يضعف التوجه الصاعد.`
      : `على مخطط ${c.timeframe} المزاج حذر: بولينجر %B قرب ${bb(c.bbN)}. راقب أعلى تأرجح أخير؛ استمرار القوة فوقه يقلل من جدوى البيع من هنا.`,
  newsHighlights: `لا تتوفر عناوين أخبار أثناء تعطل خدمة البحث المباشر. اعتبر المستويات والمؤشرات نقطة انطلاق فقط، ثم راجع مصادر موثوقة قبل الالتزام برأس مال.`,
  deepAnalysis: `في هيكل ${c.timeframe}، بولينجر %B نحو ${bb(c.bbN)} وMACD ${mac(c.macdN)}. معًا يدعمان ميلًا ${c.recommendation} مقارنة بالنطاق الأخير. إغلاق واضح خارج منطقة الوقف المقترحة يلغي القراءة.`,
  analysis: `النموذج يميل إلى ${c.recommendation} على ${c.symbol} وفق الإطار أدناه. إذا رفض السعر منطقة الدخول مرارًا بتدفق معاكس قوي، انتظر هيكلًا أوضح.`,
  trailingStopStrategy: `بعد الهدف الأول، قدّم الوقف نحو التعادل ثم تتبع تحت ${c.mult > 0 ? "كل قاع أعلى" : "كل قمة أدنى"}. إذا خفت الزخم في أطراف متطرفة، شدد المخاطر.`,
});

const pt = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `No gráfico ${c.timeframe}, o tom de curto prazo parece levemente favorável: o %B de Bollinger está perto de ${bb(c.bbN)}. Veja se o preço mantém o último fundo antes de aumentar tamanho; rompimento claro abaixo enfraquece o viés de compra.`
      : `No gráfico ${c.timeframe}, o tom é cauteloso: o %B de Bollinger está perto de ${bb(c.bbN)}. Observe o último topo; força sustentada acima enfraquece pressão vendedora daqui.`,
  newsHighlights: `Manchetes não estão disponíveis com o serviço de pesquisa offline. Use níveis e indicadores só como ponto de partida; confirme notícias em fontes confiáveis antes de alocar capital.`,
  deepAnalysis: `Na estrutura ${c.timeframe}, o %B de Bollinger é cerca de ${bb(c.bbN)} e o MACD é ${mac(c.macdN)}. Juntos sustentam um viés ${c.recommendation} versus a faixa recente. Fechamento além da zona de stop sugerida invalida a leitura.`,
  analysis: `O modelo inclina-se a ${c.recommendation} em ${c.symbol} conforme o quadro abaixo. Se o preço rejeitar repetidamente a zona de entrada com fluxo oposto forte, espere estrutura mais limpa.`,
  trailingStopStrategy: `Após o primeiro alvo, aproxime o stop do break-even e depois arraste sob ${c.mult > 0 ? "cada fundo mais alto" : "cada topo mais baixo"}. Se o momentum esmorecer em extremos, aperte o risco.`,
});

const ru = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `На графике ${c.timeframe} краткосрочный тон слегка поддерживает покупки: %B Боллинджера около ${bb(c.bbN)}. Проверьте, держит ли цена последний локальный минимум перед увеличением объёма; чистый пробой вниз ослабит бычий сценарий.`
      : `На графике ${c.timeframe} тон осторожный: %B Боллинджера около ${bb(c.bbN)}. Следите за последним максимумом; устойчивость выше ослабляет давление продавцов отсюда.`,
  newsHighlights: `Заголовки недоступны, пока сервис исследований офлайн. Уровни и индикаторы используйте как отправную точку; перед размещением капитала проверьте новости по надёжным источникам.`,
  deepAnalysis: `В структуре ${c.timeframe} %B Боллинджера ~${bb(c.bbN)}, MACD ${mac(c.macdN)}. Вместе это поддерживает уклон ${c.recommendation} относительно текущего диапазона. Закрытие за пределами предложенной зоны стопа отменяет идею.`,
  analysis: `Модель склоняется к ${c.recommendation} по ${c.symbol} согласно рамке ниже. Если цена многократно отвергает зону входа сильным встречным потоком, дождитесь более ясной структуры.`,
  trailingStopStrategy: `После первой цели подтяните стоп к безубытку, затем трейлите под ${c.mult > 0 ? "каждым более высоким минимумом" : "каждым более низким максимумом"}. При угасании импульса в экстремумах сужайте риск.`,
});

const ja = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `${c.timeframe}チャートでは短期的にやや支援的：ボリンジャー%Bは約${bb(c.bbN)}。ポジションを増やす前に直近のスイング安を維持できるか確認してください。明確に下抜けるとロング視点は弱まります。`
      : `${c.timeframe}チャートでは慎重なトーン：ボリンジャー%Bは約${bb(c.bbN)}。直近のスイング高を注視してください。その上で持続的に強いと、ここからのショートは抑えめが妥当です。`,
  newsHighlights: `ライブ調査サービスがオフラインのためヘッドラインは利用できません。水準と指標は出発点として扱い、資金を載せる前に信頼できるニュースで確認してください。`,
  deepAnalysis: `${c.timeframe}構造ではボリンジャー%Bは約${bb(c.bbN)}、MACDは${mac(c.macdN)}。直近レンジに対し${c.recommendation}寄りの読みを支えます。提案ストップ域を外側に終値で割り込むと無効化と見なします。`,
  analysis: `モデルは${c.symbol}で${c.recommendation}寄りです（下のブラケット参照）。エントリー帯を強い逆方向フローで繰り返し拒否される場合は、より明確な形状を待ってください。`,
  trailingStopStrategy: `第1目標後はストップを建値付近へ寄せ、その後${c.mult > 0 ? "切り上がる安値" : "切り下がる高値"}の下でトレール。極端な買われすぎ・売られすぎで勢いが衰えるならリスクを絞る。`,
});

const ko = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `${c.timeframe} 차트에서 단기 분위기는 다소 지지적입니다. 볼린저 %B는 약 ${bb(c.bbN)}입니다. 포지션을 늘리기 전에 최근 스윙 저점을 지키는지 확인하세요. 아래로 명확히 이탈하면 롱 관점이 약해집니다.`
      : `${c.timeframe} 차트에서 분위기는 신중합니다. 볼린저 %B는 약 ${bb(c.bbN)}입니다. 최근 스윙 고점을 주시하세요. 그 위에서 지속적으로 강하면 여기서 공격적 숏은 부담입니다.`,
  newsHighlights: `라이브 리서치 서비스가 오프라인이면 헤드라인을 제공할 수 없습니다. 수준과 지표는 출발점으로만 삼고, 자금을 걸기 전 신뢰할 수 있는 뉴스로 확인하세요.`,
  deepAnalysis: `${c.timeframe} 구조에서 볼린저 %B는 약 ${bb(c.bbN)}이고 MACD는 ${mac(c.macdN)}입니다. 최근 박스 대비 ${c.recommendation} 쪽으로 기울어 있습니다. 제안된 손절 영역 밖으로 종가가 나가면 무효로 보세요.`,
  analysis: `모델은 ${c.symbol}에 대해 아래 브래킷 기준 ${c.recommendation} 쪽입니다. 진입대를 강한 역방향 흐름으로 반복적으로 거부하면 셋업이 약해진 것으로 보고 더 명확한 구조를 기다리세요.`,
  trailingStopStrategy: `첫 목표 후 스탑을 손익분기 쪽으로 옮긴 뒤, ${c.mult > 0 ? "높아지는 저점" : "낮아지는 고점"} 아래로 트레일하세요. 과매수·과매도 극단에서 모멘텀이 꺼지면 리스크를 줄이세요.`,
});

const it = (c: OfflineNarrativeCtx): OfflineNarrativeBundle => ({
  marketSentiment:
    c.sentiment === "Bullish"
      ? `Sul grafico ${c.timeframe} il tono a breve termine è leggermente favorevole: il %B di Bollinger è intorno a ${bb(c.bbN)}. Verificare se il prezzo mantiene l'ultimo minimo oscillante prima di aumentare la size; una rottura netta al ribasso indebolisce il bias long.`
      : `Sul grafico ${c.timeframe} il tono è cauto: il %B di Bollinger è intorno a ${bb(c.bbN)}. Monitorare l'ultimo massimo oscillante; forza sostenuta sopra indebolisce la pressione short da qui.`,
  newsHighlights: `I titoli non sono disponibili mentre il servizio di ricerca live è offline. Usare livelli e indicatori solo come punto di partenza; verificare le notizie su fonti affidabili prima di impegnare capitale.`,
  deepAnalysis: `Nella struttura ${c.timeframe}, il %B di Bollinger è circa ${bb(c.bbN)} e il MACD è ${mac(c.macdN)}. Insieme sostengono un orientamento ${c.recommendation} rispetto al range recente. Una chiusura oltre l'area di stop proposta invalida la lettura.`,
  analysis: `Il modello tende a ${c.recommendation} su ${c.symbol} secondo il bracket sotto. Se il prezzo respinge ripetutamente la zona di ingresso con flusso opposto forte, attendere una struttura più pulita.`,
  trailingStopStrategy: `Dopo il primo obiettivo, avvicinare lo stop al pareggio, poi trascinare sotto ${c.mult > 0 ? "ogni minimo più alto" : "ogni massimo più basso"}. Se il momentum cala in estremi, stringere il rischio.`,
});

const BUILDERS: Record<SupportedLang, (c: OfflineNarrativeCtx) => OfflineNarrativeBundle> = {
  en,
  hi,
  es,
  zh,
  de,
  fr,
  ar,
  pt,
  ru,
  ja,
  ko,
  it,
};

export function getOfflineNarratives(rawLang: string, ctx: OfflineNarrativeCtx): OfflineNarrativeBundle {
  const code = normalizeLangCode(rawLang);
  const fn = BUILDERS[code] ?? BUILDERS.en;
  return fn(ctx);
}