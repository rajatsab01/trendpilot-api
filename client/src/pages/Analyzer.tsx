import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import BottomNav from "@/components/BottomNav";
import ReactionButtons from "@/components/ReactionButtons";
import { Bookmark, BookmarkCheck, Download } from "lucide-react";
import type { Analysis, User } from "@shared/schema";
import { APP_VERSION, DEGRADED_ANALYSIS_MARKER } from "@shared/schema";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { resolveChartSymbol, stripAnalysisMetaPrefix } from "@/lib/utils";
const trendPilotLogo = "/trendpilot-logo.png";

/** Reward:risk from entry → tp vs risk entry → stop. Null if levels are incoherent. */
function rewardRiskRatio(
  entryStr: string | null | undefined,
  stopStr: string | null | undefined,
  tpStr: string | null | undefined,
  recommendation: string | null | undefined,
): number | null {
  const entry = parseFloat(String(entryStr ?? ""));
  const sl = parseFloat(String(stopStr ?? ""));
  const tp = parseFloat(String(tpStr ?? ""));
  if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp)) return null;
  let risk: number;
  let reward: number;
  if (recommendation === "BUY") {
    risk = entry - sl;
    reward = tp - entry;
  } else if (recommendation === "SELL") {
    risk = sl - entry;
    reward = entry - tp;
  } else {
    return null;
  }
  if (risk <= 0 || reward <= 0) return null;
  return reward / risk;
}

type AnalyzerProps = {
  /** When embedded in Dashboard, parent must clear `?analysisId=` from its own state (wouter path alone does not update). */
  onExitToDashboard?: () => void;
};

export default function Analyzer({ onExitToDashboard }: AnalyzerProps) {
  const [, setLocation] = useLocation();

  const goDashboard = () => {
    if (onExitToDashboard) onExitToDashboard();
    else setLocation("/dashboard", { replace: true });
  };
  const { t } = useLanguage();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const searchParams = new URLSearchParams(window.location.search);
  const analysisId = searchParams.get("analysisId");
  const fromSaved = searchParams.get("fromSaved") === "true";

  const [includeTakeProfit, setIncludeTakeProfit] = useState(false);
  const [includeStopLoss, setIncludeStopLoss] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [hideDegradedBanner, setHideDegradedBanner] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("hideDegradedBanner") === "true";
    } catch {
      return false;
    }
  });

  const userId = localStorage.getItem("userId");

  // Fetch user data for token check
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
  });

  // Redirect to login if no userId found in localStorage
  useEffect(() => {
    if (!userId) {
      console.log("No userId found, redirecting to login...");
      setLocation("/login");
    }
  }, [userId, setLocation]);

  // Handle 404/NotFound error by redirecting to login (session mismatch after restart)
  useEffect(() => {
    if (error) {
      const msg = error.message || "";
      if (msg.includes("404") || msg.includes("Not Found")) {
        console.log("User session invalid (404), redirecting to login...");
        localStorage.removeItem("userId");
        localStorage.removeItem("loginCompleted");
        setLocation("/login");
      }
    }
  }, [error, setLocation]);

  // Fetch analysis results
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery<Analysis>({
    queryKey: ["/api/analysis", analysisId],
    enabled: !!analysisId,
  });

  // #region agent log
  useEffect(() => {
    if (!analysis) return;
    fetch("http://127.0.0.1:7488/ingest/e93706f7-1198-47c5-b616-5c4e0f8abc3e", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4683df" },
      body: JSON.stringify({
        sessionId: "4683df",
        runId: "pre-fix",
        hypothesisId: "H9",
        location: "client/pages/Analyzer.tsx:analysis-loaded",
        message: "analysis loaded in Analyzer",
        data: {
          analysisId,
          symbol: analysis.symbol,
          recommendation: analysis.recommendation,
          probabilityScore: analysis.probabilityScore,
          explanatoryNotesPrefix: String(analysis.explanatoryNotes || "").slice(0, 40),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [analysis, analysisId]);
  // #endregion

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiRequest("POST", `/api/analysis/${id}/save`, {
        appVersion: APP_VERSION,
      });
      return await result.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/analysis", analysisId] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyses/saved", userId || ""] });
      toast({
        title: t.success,
        description: data.isSaved ? t.analysisSaved : t.analysisUnsaved,
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToUpdateAnalysis,
        variant: "destructive",
      });
    },
  });

  const handleExportPDF = async () => {
    if (!analysis) return;

    setIsExportingPDF(true);
    try {
      const element = document.getElementById("pdf-export-content");
      if (!element) throw new Error("PDF export content not found");

      toast({
        title: t.exportingPDF,
        description: t.pdfExportInProgressDesc,
      });

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#111714",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `TrendPilot_${analysis.symbol}_${new Date().toISOString().split("T")[0]}_${Date.now()}.pdf`;
      pdf.save(fileName);

      toast({
        title: t.pdfExported,
        description: t.pdfExportedDesc,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: t.pdfExportFailed,
        description: t.pdfExportFailed,
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleSaveClick = async (analysis: Analysis) => {
    const versionOk = await guardAction();
    if (!versionOk) return;

    if (fromSaved && analysis.isSaved === 1) {
      const confirmed = window.confirm(t.unsaveConfirm);
      if (!confirmed) return;
    }
    saveMutation.mutate(analysis.id);
  };

  useEffect(() => {
    if (!analysisId) {
      if (onExitToDashboard) onExitToDashboard();
      else setLocation("/dashboard", { replace: true });
    }
  }, [analysisId, onExitToDashboard, setLocation]);

  if (!analysisId) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <div className="text-[#9eb7a8] text-sm">{t.loading || "Loading..."}</div>
      </div>
    );
  }

  // 🔄 Loading State
  if (analysisId && isLoadingAnalysis) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <div className="text-white">{t.loadingAnalysis}</div>
      </div>
    );
  }

  // Show analysis results if we have an analysis
  if (analysisId && analysis) {
    const isBullish = analysis.sentiment === "Bullish";
    const sentimentColor = isBullish ? "text-[#38e07b]" : "text-red-500";

    // Get currency symbol based on analysis currency
    const getCurrencySymbol = (currency: string): string => {
      const currencySymbols: Record<string, string> = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CNY': '¥',
        'AUD': 'A$',
        'CAD': 'C$',
        'CHF': 'Fr',
        'HKD': 'HK$',
        'SGD': 'S$',
        'KRW': '₩',
        'BRL': 'R$',
        'MXN': 'Mex$',
        'ZAR': 'R',
        'RUB': '₽',
        'TRY': '₺',
        'SAR': '﷼',
        'AED': 'د.إ',
        'NZD': 'NZ$',
      };
      return currencySymbols[currency] || currency + ' ';
    };

    // For forex pairs, display price in the quote currency (2nd currency in pair)
    // For other assets, display in user's preferred currency
    const isForexPair = analysis.market?.toLowerCase() === 'forex';
    const displayCurrency = isForexPair ? analysis.sourceCurrency : analysis.currency;
    
    // Debug logging for currency display
    console.log('🔍 Analyzer Currency Debug:', {
      symbol: analysis.correctedSymbol || analysis.symbol,
      market: analysis.market,
      isForexPair,
      sourceCurrency: analysis.sourceCurrency,
      userCurrency: analysis.currency,
      displayCurrency,
    });
    
    const currencySymbol = getCurrencySymbol(displayCurrency || 'USD');
    console.log(`💵 Currency symbol: "${currencySymbol}" for currency: ${displayCurrency || 'USD'}`);

    const fmtNarrative = (raw: string | null | undefined, replaceUsdInCopy = false) => {
      let s = stripAnalysisMetaPrefix(raw ?? "");
      if (!s) return "";
      if (isForexPair) return s.replace(/[₹$£¥€₽]/g, currencySymbol);
      if (replaceUsdInCopy) return s.replace(/\$/g, currencySymbol);
      return s;
    };

    const rawNotes = analysis.explanatoryNotes ?? "";
    const isDegradedPlan = rawNotes.startsWith(DEGRADED_ANALYSIS_MARKER);
    const notesWithoutMarker = isDegradedPlan
      ? rawNotes.slice(DEGRADED_ANALYSIS_MARKER.length)
      : rawNotes;

    let degradedReasonInline: string | null = null;
    let notesBody = notesWithoutMarker;
    if (isDegradedPlan) {
      const firstLine = (notesWithoutMarker.split("\n")[0] || "").trim();
      const m = firstLine.match(/^Reason:\s*(.+)\s*$/i);
      if (m?.[1]) {
        degradedReasonInline = m[1].trim();
        notesBody = notesWithoutMarker.slice((notesWithoutMarker.indexOf("\n") + 1) || 0).trimStart();
        // If we had "Reason: X\n\n...", remove the extra leading blank line.
        notesBody = notesBody.replace(/^\n+/, "");
      }
    }
    let lastDegradedReason: string | null = null;
    try {
      const s = sessionStorage.getItem("lastDegradedReason") || "";
      lastDegradedReason = s.trim() ? s.trim() : null;
    } catch {
      /* ignore */
    }

    const displayMarketSentiment = fmtNarrative(analysis.marketSentiment);
    const displayDeepAnalysis = fmtNarrative(analysis.deepAnalysis);
    const displayAiVerdict = fmtNarrative(analysis.analysis);
    const displayTrailing = fmtNarrative(analysis.trailingStopStrategy, true);
    const displayExplanatory = fmtNarrative(notesBody, true);

    // Format price with correct currency symbol and decimal places
    // Forex: 4 decimals (e.g., £0.7500) - precision matters in forex
    // Others: 2 decimals (e.g., ₹1234.56)
    const formatPrice = (price: string | number | undefined | null): string => {
      if (!price) return 'N/A';
      
      // Remove any existing currency symbols from the price string
      const cleanPrice = typeof price === 'string' 
        ? price.replace(/[₹$£¥€₽Fr]/g, '').trim()
        : price.toString();
      
      const numericPrice = parseFloat(cleanPrice);
      if (isNaN(numericPrice)) return price.toString();
      
      const decimals = isForexPair ? 4 : 2;
      return `${currencySymbol}${numericPrice.toFixed(decimals)}`;
    };

    // Chart URL configuration - Yahoo Finance for stocks/commodities/forex
    const getYahooChartUrl = (symbol: string, duration?: string): string => {
      const timeRangeMap: Record<string, string> = {
        'scalping': '1d',
        'short_term': '5d',
        'long_term': '6m'
      };
      const timeRange = duration ? (timeRangeMap[duration.toLowerCase()] || '1d') : '1d';
      return `https://chart.yahoo.com/z?s=${encodeURIComponent(symbol)}&t=${timeRange}&q=c&l=on&z=l&p=s`;
    };

    // Use config-driven chart symbol resolver
    // This automatically handles stocks (uses name), commodities (GC=F→TVC:GOLD), forex, crypto
    const tradingViewSymbol = resolveChartSymbol(analysis);

    return (
      <div className="min-h-screen bg-[#111714] flex flex-col">
        <div className="flex-grow">
          <header className="flex items-center p-4 justify-between sticky top-0 bg-[#111714]/80 backdrop-blur-sm z-10">
            <button
              onClick={goDashboard}
              className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1c2620] hover-elevate active-elevate-2"
              data-testid="button-back"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
              {t.analyzer}
            </h1>
          </header>

          {isDegradedPlan && !hideDegradedBanner && (
            <div className="mx-4 mt-4 rounded-2xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm leading-relaxed flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-200 mt-0.5">info</span>
              <div className="flex-1">
                {t.degradedAnalyzerBanner}
                {(degradedReasonInline || lastDegradedReason) && (
                  <div className="mt-2 text-amber-100/90 text-xs select-text break-words whitespace-pre-line">
                    Reason: {degradedReasonInline || lastDegradedReason}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="text-amber-200/80 hover:text-amber-100 transition-colors"
                aria-label="Dismiss"
                onClick={() => {
                  setHideDegradedBanner(true);
                  try {
                    sessionStorage.setItem("hideDegradedBanner", "true");
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Price Chart - TradingView for ALL markets */}
          <div className="px-4 pt-6 pb-2">
            <div className="bg-[#1c2620] rounded-2xl overflow-hidden">
              <div className="p-3 border-b border-[#111714] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38e07b] text-lg">show_chart</span>
                <p className="text-[#9eb7a8] text-sm font-medium">
                  Price Chart (TradingView)
                </p>
              </div>
              <div className="p-2">
                {/* TradingView widget for ALL markets */}
                <div className="w-full h-96" data-testid="tradingview-chart">
                  <iframe
                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tradingViewSymbol.replace("/", "")}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=trendpilot&utm_medium=widget`}
                    className="w-full h-full rounded-lg border-0"
                    allowtransparency="true"
                    title="TradingView Chart"
                  ></iframe>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Export Section - Starts from here */}
          <div id="pdf-export-content" className="bg-[#111714]">
            {/* TrendPilot Branding Header for PDF */}
            <div className="px-4 pt-6 pb-4 text-center border-b border-[#1c2620]">
              <div className="flex items-center justify-center gap-3 mb-2">
                <img 
                  src="/trendpilot-logo.png"
                  alt="TrendPilot Logo"
                  className="h-16 w-16 object-contain rounded-lg"
                />
                <h1 className="text-[#38e07b] text-3xl font-bold tracking-tight">TrendPilot</h1>
              </div>
              <p className="text-[#9eb7a8] text-sm">{t.aiPoweredAnalyzer || "AI-Powered Trading Analyzer"}</p>
            </div>

            {/* Symbol and Price Display - Perplexity Validated */}
            <div className="px-4 pt-2 pb-2 space-y-3">
            {/* Symbol Display */}
            <div className="bg-[#1c2620] rounded-2xl p-6 text-center">
              {/* Show if symbol was corrected by Perplexity */}
              {analysis.correctedSymbol && analysis.symbol !== analysis.correctedSymbol && (
                <div className="mb-3 text-[#9eb7a8] text-sm">
                  <span className="text-[#6a7f72]">Searched:</span> <span className="line-through">{analysis.symbol}</span>
                  <span className="mx-2">→</span>
                  <span className="text-[#38e07b]">Found: {analysis.correctedSymbol}</span>
                </div>
              )}
              
              <div>
                <h2 className="text-white text-3xl font-bold tracking-tight" data-testid="text-instrument-name">
                  {analysis.assetName || analysis.instrumentName || analysis.symbol}
                </h2>
                {analysis.correctedSymbol && (
                  <p className="text-[#9eb7a8] text-lg mt-1" data-testid="text-corrected-symbol">
                    {analysis.correctedSymbol}
                  </p>
                )}
              </div>
            </div>

            {/* Current Live Market Price */}
            {analysis.livePrice && parseFloat(analysis.livePrice) > 0 && (
              <div className="bg-[#1c2620] rounded-2xl p-6 text-center border-2 border-[#38e07b]">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#38e07b] text-sm">candlestick_chart</span>
                  <p className="text-[#9eb7a8] text-sm">{t.currentMarketPrice}</p>
                </div>
                <p className="text-[#38e07b] text-4xl font-bold tracking-tight" data-testid="text-live-price">
                  {formatPrice(analysis.livePrice)}
                </p>
              </div>
            )}

            {/* Analysis Price (Candle Close) */}
            {analysis.candleClosePrice && parseFloat(analysis.candleClosePrice) > 0 && (
              <div className="bg-[#1c2620] rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[#6a7f72] text-xs">analytics</span>
                  <p className="text-[#6a7f72] text-xs">{t.analysisBasedOn}</p>
                </div>
                <p className="text-white text-2xl font-bold tracking-tight" data-testid="text-analysis-price">
                  {formatPrice(analysis.candleClosePrice)}
                </p>
                {/* Display timeframe and timestamp */}
                <div className="mt-2 text-[#6a7f72] text-xs">
                  {analysis.timeframe && (
                    <span className="inline-block bg-[#111714] px-2 py-1 rounded">
                      {analysis.timeframe} candle close
                    </span>
                  )}
                  {analysis.candleCloseTime && (
                    <span className="block mt-1" data-testid="text-timestamp">
                      {analysis.candleCloseTime}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Explanation Box - Why Closed Candles */}
            <div className="bg-[#111714] rounded-2xl p-4 border border-[#1c2620]">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#38e07b] text-xl mt-0.5">info</span>
                <div className="flex-1">
                  <p className="text-[#9eb7a8] text-sm leading-relaxed">
                    {t.closedCandleExplanation}
                  </p>
                  
                  {/* Currency Conversion Info */}
                  {analysis.sourceCurrency && analysis.currency && (
                    <p className="text-[#6a7f72] text-xs mt-3 pt-3 border-t border-[#1c2620]">
                      {isForexPair ? (
                        <>
                          <span className="material-symbols-outlined text-[#38e07b] text-xs align-middle mr-1">currency_exchange</span>
                          <span className="text-[#9eb7a8]">Forex pair - prices shown in {analysis.sourceCurrency}</span>
                        </>
                      ) : analysis.sourceCurrency === analysis.currency ? (
                        <>
                          <span className="material-symbols-outlined text-[#38e07b] text-xs align-middle mr-1">currency_exchange</span>
                          <span className="text-[#9eb7a8]">Prices shown in native exchange currency ({analysis.sourceCurrency})</span>
                        </>
                      ) : analysis.exchangeRate ? (
                        <>
                          <span className="material-symbols-outlined text-[#38e07b] text-xs align-middle mr-1">currency_exchange</span>
                          <span className="text-[#9eb7a8]">Prices converted from {analysis.sourceCurrency} to {analysis.currency} at 1 {analysis.sourceCurrency} = {analysis.exchangeRate} {analysis.currency}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[#38e07b] text-xs align-middle mr-1">currency_exchange</span>
                          <span className="text-[#9eb7a8]">Prices converted from {analysis.sourceCurrency} to {analysis.currency}</span>
                        </>
                      )}
                    </p>
                  )}
                  
                  {analysis.nextCandleCloseTime && (
                    <p className="text-[#6a7f72] text-xs mt-2">
                      <span className="text-[#38e07b]">⏰ {t.nextCandleCloses}:</span> {analysis.nextCandleCloseTime}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <main id="analysis-content" className="p-4 space-y-8 pb-24">
            <div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
                {t.leadingIndicators}
              </h2>
              <div className="space-y-3 rounded-2xl bg-[#1c2620] p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#9eb7a8] text-base font-normal">{t.rsi}</span>
                  <span className="text-white text-base font-medium" data-testid="text-rsi">
                    {analysis.rsi}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9eb7a8] text-base font-normal">{t.macd}</span>
                  <span className="text-white text-base font-medium" data-testid="text-macd">
                    {analysis.macd}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9eb7a8] text-base font-normal">
                    {t.stochastic}
                  </span>
                  <span className="text-white text-base font-medium" data-testid="text-stochastic">
                    {analysis.stochastic}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#9eb7a8] text-base font-normal">
                    {t.bollingerBands}
                  </span>
                  <span className="text-white text-base font-medium" data-testid="text-bollinger">
                    {analysis.bollingerBands}
                  </span>
                </div>
              </div>
            </div>

            {displayMarketSentiment && (
              <div className="rounded-2xl bg-[#1c2620] p-4">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">sentiment_satisfied</span>
                  {t.marketSentiments}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed whitespace-pre-line" data-testid="text-market-sentiment">
                  {displayMarketSentiment}
                </p>
              </div>
            )}

            {displayDeepAnalysis && (
              <div className="rounded-2xl bg-[#1c2620] p-4">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">analytics</span>
                  {t.deepAnalysis}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed whitespace-pre-line" data-testid="text-deep-analysis">
                  {displayDeepAnalysis}
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-[#1c2620] p-4">
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38e07b]">psychology</span>
                {t.aiAnalysisHeader}
              </h2>
              <div className="flex items-center justify-around mb-4">
                <div className="relative w-40 h-40">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 36 36"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      className="stroke-current text-[#29382f]"
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeWidth="3"
                    ></circle>
                    <circle
                      className={`stroke-current ${sentimentColor}`}
                      cx="18"
                      cy="18"
                      fill="none"
                      r="16"
                      strokeDasharray="100"
                      strokeDashoffset={100 - Math.min(Math.max(analysis.probabilityScore || 0, 0), 100)}
                      strokeLinecap="round"
                      strokeWidth="3"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white" data-testid="text-confidence">
                      {Math.min(Math.max(analysis.probabilityScore || 0, 0), 100)}%
                    </span>
                    <span className={`text-lg font-medium ${sentimentColor}`} data-testid="text-sentiment">
                      {analysis.sentiment === "Bullish" ? t.bullish : t.bearish}
                    </span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[#9eb7a8] text-sm font-normal">{t.buyOrSell}</p>
                  <p
                    className={`text-2xl font-bold mt-2 ${sentimentColor}`}
                    data-testid="text-recommendation"
                  >
                    {analysis.recommendation === "BUY" ? t.buy : t.sell}
                  </p>
                </div>
              </div>
              <p className="text-[#9eb7a8] text-base font-normal leading-relaxed text-center whitespace-pre-line" data-testid="text-ai-analysis">
                {displayAiVerdict}
              </p>
            </div>

            <div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
                {t.bracketTrade}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="bg-[#1c2620] p-2 sm:p-4 rounded-2xl text-center min-w-0">
                    <p className="text-[#9eb7a8] text-xs sm:text-sm font-normal">{t.entry}</p>
                    <p className="text-white text-xs sm:text-lg font-bold mt-1 break-all leading-tight" data-testid="text-entry">
                      {formatPrice(analysis.entry)}
                    </p>
                    <div className="flex justify-center mt-2">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                        data-testid="checkbox-entry"
                      />
                    </div>
                  </div>
                  <div className="bg-[#1c2620] p-2 sm:p-4 rounded-2xl text-center min-w-0">
                    <p className="text-[#9eb7a8] text-xs sm:text-sm font-normal">{t.takeProfit}</p>
                    <p className="text-[#38e07b] text-xs sm:text-lg font-bold mt-1 break-all leading-tight" data-testid="text-take-profit">
                      {formatPrice(analysis.takeProfit)}
                    </p>
                    <div className="flex justify-center mt-2">
                      <input
                        type="checkbox"
                        checked={includeTakeProfit}
                        onChange={(e) => setIncludeTakeProfit(e.target.checked)}
                        className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                        data-testid="checkbox-take-profit"
                      />
                    </div>
                  </div>
                  <div className="bg-[#1c2620] p-2 sm:p-4 rounded-2xl text-center min-w-0">
                    <p className="text-[#9eb7a8] text-xs sm:text-sm font-normal">{t.stopLoss}</p>
                    <p className="text-red-500 text-xs sm:text-lg font-bold mt-1 break-all leading-tight" data-testid="text-stop-loss">
                      {formatPrice(analysis.stopLoss)}
                    </p>
                    <div className="flex justify-center mt-2">
                      <input
                        type="checkbox"
                        checked={includeStopLoss}
                        onChange={(e) => setIncludeStopLoss(e.target.checked)}
                        className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                        data-testid="checkbox-stop-loss"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multiple Take Profit Targets */}
            {(analysis.tp1 || analysis.tp2 || analysis.tp3) && (
              <div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">flag</span>
                  {t.multipleTakeProfitTargets}
                </h2>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {analysis.tp1 && (
                    <div className="bg-[#1c2620] p-2 sm:p-4 rounded-2xl text-center min-w-0">
                      <p className="text-[#9eb7a8] text-xs sm:text-sm font-normal">TP1</p>
                      <p className="text-[#6a7f72] text-[10px] sm:text-xs mt-0.5 font-normal tabular-nums">
                        {(() => {
                          const r = rewardRiskRatio(analysis.entry, analysis.stopLoss, analysis.tp1, analysis.recommendation);
                          return r != null ? t.tpApproxRiskReward.replace("{ratio}", r.toFixed(2)) : "—";
                        })()}
                      </p>
                      <p className="text-[#38e07b] text-xs sm:text-lg font-bold mt-1 break-all leading-tight" data-testid="text-tp1">
                        {formatPrice(analysis.tp1)}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">{t.bookProfit}</p>
                    </div>
                  )}
                  {analysis.tp2 && (
                    <div className="bg-[#1c2620] p-2 sm:p-4 rounded-2xl text-center min-w-0">
                      <p className="text-[#9eb7a8] text-xs sm:text-sm font-normal">TP2</p>
                      <p className="text-[#6a7f72] text-[10px] sm:text-xs mt-0.5 font-normal tabular-nums">
                        {(() => {
                          const r = rewardRiskRatio(analysis.entry, analysis.stopLoss, analysis.tp2, analysis.recommendation);
                          return r != null ? t.tpApproxRiskReward.replace("{ratio}", r.toFixed(2)) : "—";
                        })()}
                      </p>
                      <p className="text-[#38e07b] text-xs sm:text-lg font-bold mt-1 break-all leading-tight" data-testid="text-tp2">
                        {formatPrice(analysis.tp2)}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">{t.trailToBreakeven}</p>
                    </div>
                  )}
                  {analysis.tp3 && (
                    <div className="bg-[#1c2620] p-2 sm:p-4 rounded-2xl text-center min-w-0">
                      <p className="text-[#9eb7a8] text-xs sm:text-sm font-normal">TP3</p>
                      <p className="text-[#6a7f72] text-[10px] sm:text-xs mt-0.5 font-normal tabular-nums">
                        {(() => {
                          const r = rewardRiskRatio(analysis.entry, analysis.stopLoss, analysis.tp3, analysis.recommendation);
                          return r != null ? t.tpApproxRiskReward.replace("{ratio}", r.toFixed(2)) : "—";
                        })()}
                      </p>
                      <p className="text-[#38e07b] text-xs sm:text-lg font-bold mt-1 break-all leading-tight" data-testid="text-tp3">
                        {formatPrice(analysis.tp3)}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">{t.maxTarget}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Risk-Reward Ratio — actual math from displayed entry, stop, TP3 (not a fixed 1:3 label) */}
            <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
              <p className="text-[#9eb7a8] text-sm font-normal mb-2">{t.riskRewardRatio}</p>
              <p className="text-[#9eb7a8] text-xs font-normal mb-1 opacity-90">{t.riskRewardToTp3Label}</p>
              <p className="text-[#38e07b] text-2xl font-bold tabular-nums" data-testid="text-risk-reward">
                {(() => {
                  const r = rewardRiskRatio(
                    analysis.entry,
                    analysis.stopLoss,
                    analysis.tp3 || analysis.takeProfit,
                    analysis.recommendation,
                  );
                  return r != null ? `1:${r.toFixed(2)}` : "N/A";
                })()}
              </p>
              <p className="text-[#6a7f72] text-xs font-normal mt-3 leading-relaxed text-left whitespace-pre-line">
                {t.riskRewardFootnote}
              </p>
            </div>

            {/* Probability Score Meter (signal confidence, not TP-hit probability) */}
            {analysis.probabilityScore !== null && analysis.probabilityScore !== undefined && (
              <div className="rounded-2xl bg-[#1c2620] p-6">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">percent</span>
                  {t.tradeConfidence}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#9eb7a8] text-base">{t.signalConfidence}</span>
                    <span className="text-white text-2xl font-bold" data-testid="text-probability-score">
                      {analysis.probabilityScore}%
                    </span>
                  </div>
                  <p className="text-[#6a7f72] text-xs leading-relaxed whitespace-pre-line">
                    {t.confidenceMeaning}
                  </p>
                </div>
              </div>
            )}

            {/* Support & Resistance Chart */}
            {((analysis.s1 || analysis.s2 || analysis.s3) || (analysis.r1 || analysis.r2 || analysis.r3)) && (
              <div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">multiline_chart</span>
                  {t.supportResistanceLevels}
                </h2>
                <div className="bg-[#1c2620] p-6 rounded-2xl">
                  {/* Price Levels Chart */}
                  <div className="space-y-3">
                      {/* Resistance R3 */}
                      {analysis.r3 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border-l-4 border-red-500" data-testid="text-r3">
                          <div className="flex-1">
                            <p className="text-red-400 text-xs font-medium">R3</p>
                            <p className="text-red-500 text-lg font-bold">{formatPrice(analysis.r3)}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                        </div>
                      )}
                      {/* Resistance R2 */}
                      {analysis.r2 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border-l-4 border-orange-500" data-testid="text-r2">
                          <div className="flex-1">
                            <p className="text-orange-400 text-xs font-medium">R2</p>
                            <p className="text-orange-500 text-lg font-bold">{formatPrice(analysis.r2)}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-orange-500/50"></div>
                        </div>
                      )}
                      {/* Resistance R1 */}
                      {analysis.r1 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border-l-4 border-yellow-500" data-testid="text-r1">
                          <div className="flex-1">
                            <p className="text-yellow-400 text-xs font-medium">R1</p>
                            <p className="text-yellow-500 text-lg font-bold">{formatPrice(analysis.r1)}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                        </div>
                      )}
                      
                      {/* Entry Price - Center */}
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#38e07b]/20 border-2 border-[#38e07b]" data-testid="text-entry-price">
                        <div className="flex-1 text-center">
                          <p className="text-[#38e07b] text-xs font-bold uppercase tracking-wide">Entry Price</p>
                          <p className="text-white text-2xl font-bold mt-1">{formatPrice(analysis.entry)}</p>
                        </div>
                      </div>
                      
                      {/* Support S1 */}
                      {analysis.s1 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-lime-500/10 border-l-4 border-lime-500" data-testid="text-s1">
                          <div className="flex-1">
                            <p className="text-lime-400 text-xs font-medium">S1</p>
                            <p className="text-lime-500 text-lg font-bold">{formatPrice(analysis.s1)}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-lime-500/50"></div>
                        </div>
                      )}
                      {/* Support S2 */}
                      {analysis.s2 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border-l-4 border-emerald-500" data-testid="text-s2">
                          <div className="flex-1">
                            <p className="text-emerald-400 text-xs font-medium">S2</p>
                            <p className="text-emerald-500 text-lg font-bold">{formatPrice(analysis.s2)}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                        </div>
                      )}
                      {/* Support S3 */}
                      {analysis.s3 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#38e07b]/10 border-l-4 border-[#38e07b]" data-testid="text-s3">
                          <div className="flex-1">
                            <p className="text-[#38e07b] text-xs font-medium">S3</p>
                            <p className="text-[#38e07b] text-lg font-bold">{formatPrice(analysis.s3)}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-[#38e07b]/50"></div>
                        </div>
                      )}
                  </div>
                  
                  {/* Legend */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="text-[#9eb7a8]">Strong Resistance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#38e07b]"></div>
                      <span className="text-[#9eb7a8]">Strong Support</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trailing Stop Strategy */}
            {displayTrailing && (
              <div className="rounded-2xl bg-[#1c2620] p-4">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">trending_up</span>
                  {t.trailingStopStrategy}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed whitespace-pre-line" data-testid="text-trailing-stop">
                  {displayTrailing}
                </p>
              </div>
            )}

            {/* Explanatory Notes / Disclaimers — full legal text (translations) + optional technical / model notes */}
            <div className="rounded-2xl bg-[#1c2620] p-4 border-2 border-[#38e07b]/30">
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#38e07b]">info</span>
                {t.importantNotesDisclaimers}
              </h2>
              <p className="text-[#9eb7a8] text-base font-normal leading-relaxed whitespace-pre-wrap" data-testid="text-disclaimer-full">
                {t.disclaimerText}
              </p>
              {displayExplanatory ? (
                <p
                  className="text-[#9eb7a8] text-sm font-normal leading-relaxed mt-4 pt-4 border-t border-white/10 whitespace-pre-line"
                  data-testid="text-explanatory-notes"
                >
                  {displayExplanatory}
                </p>
              ) : null}
            </div>

            {/* Action Buttons: Save, Share, Analyse More */}
            <div className="mt-8 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveClick(analysis)}
                  disabled={saveMutation.isPending || analysis.isSaved === 1}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-4 rounded-full text-center text-lg transition-colors ${
                    analysis.isSaved === 1 
                      ? 'bg-[#38e07b] text-[#111714] border-2 border-[#38e07b] cursor-not-allowed opacity-90' 
                      : 'bg-[#1a2d24] text-[#38e07b] border-2 border-[#38e07b] hover:bg-[#38e07b] hover:text-[#111714]'
                  } ${saveMutation.isPending ? 'opacity-50' : ''}`}
                  data-testid="button-save-analysis"
                >
                  {analysis.isSaved === 1 ? (
                    <BookmarkCheck className="w-6 h-6" />
                  ) : (
                    <Bookmark className="w-6 h-6" />
                  )}
                  <span>{analysis.isSaved === 1 ? `${t.saved} ✓` : t.save}</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  className={`flex-1 flex items-center justify-center gap-2 font-bold py-4 rounded-full text-center text-lg transition-colors bg-[#1a2d24] text-[#38e07b] border-2 border-[#38e07b] hover:bg-[#38e07b] hover:text-[#111714] ${isExportingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="button-export-pdf"
                >
                  <Download className="w-6 h-6" />
                  <span>{isExportingPDF ? t.exportingPDF : t.sharePDF}</span>
                </button>
              </div>

              {/* Reaction Buttons - Only show for published analyses */}
              {analysis.isPublished === 1 && (
                <div className="bg-[#1c2620] rounded-xl p-4 border border-[#2a3c33]">
                  <p className="text-[#9eb7a8] text-sm mb-3">Community Reactions</p>
                  <ReactionButtons 
                    analysisId={analysis.id} 
                    userId={userId} 
                    showCounts={true}
                  />
                </div>
              )}
              <button
                onClick={goDashboard}
                className="w-full bg-[#38e07b] text-[#111714] font-bold py-4 rounded-full text-center text-lg hover:bg-opacity-90 transition-colors"
                data-testid="button-analyse-more"
              >
                {t.analyseMore}
              </button>
            </div>
          </main>
          </div>
          {/* End of PDF Export Content */}
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <div className="flex-grow flex flex-col items-center justify-center px-6 pb-24">
        <p className="text-[#9eb7a8] text-center mb-4">
          {t.analysisFailed || "Unable to load this analysis."}
        </p>
        <button
          type="button"
          onClick={goDashboard}
          className="bg-[#38e07b] text-[#111714] font-bold py-3 px-6 rounded-full"
          data-testid="button-back-to-dashboard"
        >
          {t.home}
        </button>
      </div>
      <BottomNav />
      <UpdateModal />
    </div>
  );
}
