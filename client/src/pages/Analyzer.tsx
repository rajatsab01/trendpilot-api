import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import BottomNav from "@/components/BottomNav";
import ReactionButtons from "@/components/ReactionButtons";
import { Bookmark, BookmarkCheck, Share2, Download } from "lucide-react";
import type { Analysis } from "@shared/schema";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import trendPilotLogo from "@assets/trendpilot-logo.png";
import { convertToTradingViewSymbol } from "@/lib/utils";

export default function Analyzer() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const searchParams = new URLSearchParams(window.location.search);
  const analysisId = searchParams.get("analysisId");
  const fromSaved = searchParams.get("fromSaved") === "true";

  const [symbol, setSymbol] = useState("");
  const [duration, setDuration] = useState<"long_term" | "short_term" | "scalping">("short_term");
  const [market, setMarket] = useState<"stock" | "commodity" | "forex" | "cryptocurrency">("stock");
  const [includeTakeProfit, setIncludeTakeProfit] = useState(false);
  const [includeStopLoss, setIncludeStopLoss] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const userId = localStorage.getItem("userId");

  // Fetch user data for token check
  const { data: user } = useQuery<{ id: string; tokens: number; name: string; mobile: string; language: string }>({
    queryKey: ["/api/user", userId],
    enabled: !!userId && !analysisId,
  });

  // Fetch analysis results
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery<Analysis>({
    queryKey: ["/api/analysis", analysisId],
    enabled: !!analysisId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error(t.userNotFound);
      const result = await apiRequest("POST", "/api/analyze", {
        userId,
        symbol,
        duration,
        market,
      });
      return await result.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
      setLocation(`/analyzer?analysisId=${data.analysisId}`);
    },
    onError: (error: any) => {
      toast({
        title: t.analysisFailed,
        description: error.message || t.failedToAnalyzeMarket,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await apiRequest("POST", `/api/analysis/${id}/save`, {});
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
      if (!element) {
        throw new Error("PDF export content not found");
      }

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

      const fileName = `TrendPilot_${analysis.symbol}_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`;
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
    // VERSION CHECKPOINT: Check version before allowing save
    const versionOk = await guardAction();
    if (!versionOk) {
      // Version mismatch - modal will show, block the action
      return;
    }
    
    // If opened from saved page and currently saved, show confirmation before unsaving
    if (fromSaved && analysis.isSaved === 1) {
      const confirmed = window.confirm(t.unsaveConfirm);
      if (!confirmed) return;
    }
    saveMutation.mutate(analysis.id);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VERSION CHECKPOINT: Check version before allowing analysis
    const versionOk = await guardAction();
    if (!versionOk) {
      // Version mismatch - modal will show, block the action
      return;
    }
    
    if (!symbol.trim()) {
      toast({
        title: t.symbolRequired,
        description: t.pleaseEnterSymbol,
        variant: "destructive",
      });
      return;
    }
    if (!user || user.tokens < 2) {
      toast({
        title: t.insufficientTokensTitle,
        description: t.needTokensToAnalyze,
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate();
  };


  // Show loading state while fetching analysis
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

    const currencySymbol = getCurrencySymbol(analysis.currency || 'USD');

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

    const chartSymbol = analysis.correctedSymbol || analysis.symbol;
    
    // Use TradingView for ALL markets now (crypto, stocks, commodities, forex)
    // For Indian stocks, try using just the base symbol without exchange prefix
    // This lets TradingView auto-detect the correct exchange (NSE/BSE)
    let tradingViewSymbol = convertToTradingViewSymbol(chartSymbol, analysis.market);
    
    if (analysis.market === 'stock' && (chartSymbol.includes('.NS') || chartSymbol.includes('.BO'))) {
      // Extract base symbol (e.g., "TATAMOTORS" from "TATAMOTORS.NS")
      const baseSymbol = chartSymbol.split('.')[0];
      tradingViewSymbol = baseSymbol; // Let TradingView auto-detect NSE/BSE
    }

    return (
      <div className="min-h-screen bg-[#111714] flex flex-col">
        <div className="flex-grow">
          <header className="flex items-center p-4 justify-between sticky top-0 bg-[#111714]/80 backdrop-blur-sm z-10">
            <button
              onClick={() => setLocation("/dashboard")}
              className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1c2620] hover-elevate active-elevate-2"
              data-testid="button-back"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
              {t.analyzer}
            </h1>
          </header>

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
                    src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tradingViewSymbol}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=trendpilot&utm_medium=widget`}
                    className="w-full h-full rounded-lg border-0"
                    allowTransparency
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
                  src={trendPilotLogo}
                  alt="TrendPilot Logo"
                  className="h-16 w-16 object-contain rounded-lg"
                />
                <h1 className="text-[#38e07b] text-3xl font-bold tracking-tight">TrendPilot</h1>
              </div>
              <p className="text-[#9eb7a8] text-sm">AI-Powered Trading Advisory</p>
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
                  {currencySymbol}{parseFloat(analysis.livePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  {currencySymbol}{parseFloat(analysis.candleClosePrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      {analysis.sourceCurrency === 'FOREX_PAIR' ? (
                        <>
                          <span className="material-symbols-outlined text-[#38e07b] text-xs align-middle mr-1">currency_exchange</span>
                          <span className="text-[#9eb7a8]">Forex pair analysis - prices shown as exchange rate</span>
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

            {analysis.marketSentiment && (
              <div className="rounded-2xl bg-[#1c2620] p-4">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">sentiment_satisfied</span>
                  {t.marketSentiments}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed" data-testid="text-market-sentiment">
                  {analysis.marketSentiment}
                </p>
              </div>
            )}

            {analysis.deepAnalysis && (
              <div className="rounded-2xl bg-[#1c2620] p-4">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">analytics</span>
                  {t.deepAnalysis}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed" data-testid="text-deep-analysis">
                  {analysis.deepAnalysis}
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
              <p className="text-[#9eb7a8] text-base font-normal leading-relaxed text-center" data-testid="text-ai-analysis">
                {analysis.analysis}
              </p>
            </div>

            <div>
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4">
                {t.bracketTrade}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                    <p className="text-[#9eb7a8] text-sm font-normal">{t.entry}</p>
                    <p className="text-white text-lg font-bold mt-1" data-testid="text-entry">
                      {analysis.entry}
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
                  <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                    <p className="text-[#9eb7a8] text-sm font-normal">{t.takeProfit}</p>
                    <p className="text-[#38e07b] text-lg font-bold mt-1" data-testid="text-take-profit">
                      {analysis.takeProfit}
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
                  <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                    <p className="text-[#9eb7a8] text-sm font-normal">{t.stopLoss}</p>
                    <p className="text-red-500 text-lg font-bold mt-1" data-testid="text-stop-loss">
                      {analysis.stopLoss}
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

                <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                  <p className="text-[#9eb7a8] text-sm font-normal mb-2">{t.riskRewardRatio}</p>
                  <p className="text-[#38e07b] text-2xl font-bold" data-testid="text-risk-reward">
                    {(() => {
                      const entry = parseFloat(analysis.entry || "0");
                      const tp3 = parseFloat(analysis.tp3 || "0");
                      const stopLoss = parseFloat(analysis.stopLoss || "0");
                      
                      let risk, reward;
                      if (analysis.recommendation === "BUY") {
                        risk = entry - stopLoss;
                        reward = tp3 - entry;
                      } else {
                        risk = stopLoss - entry;
                        reward = entry - tp3;
                      }
                      
                      if (risk <= 0 || reward <= 0 || isNaN(risk) || isNaN(reward)) return "N/A";
                      
                      const ratio = reward / risk;
                      return `1:${ratio.toFixed(2)}`;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Probability Score Meter */}
            {analysis.probabilityScore !== null && analysis.probabilityScore !== undefined && (
              <div className="rounded-2xl bg-[#1c2620] p-6">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">percent</span>
                  {t.tradeProbability}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#9eb7a8] text-base">{t.successProbability}</span>
                    <span className="text-white text-2xl font-bold" data-testid="text-probability-score">
                      {analysis.probabilityScore}%
                    </span>
                  </div>
                  {/* Probability bar */}
                  <div className="w-full bg-[#29382f] rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#38e07b] to-[#2ab865] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Math.max(analysis.probabilityScore, 0), 100)}%` }}
                      data-testid="bar-probability"
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-[#9eb7a8] mt-1">
                    <span>{t.low}</span>
                    <span>{t.moderate}</span>
                    <span>{t.high}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Multiple Take Profit Targets */}
            {(analysis.tp1 || analysis.tp2 || analysis.tp3) && (
              <div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">flag</span>
                  {t.multipleTakeProfitTargets}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {analysis.tp1 && (
                    <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                      <p className="text-[#9eb7a8] text-sm font-normal">TP1 (1:1)</p>
                      <p className="text-[#38e07b] text-lg font-bold mt-1" data-testid="text-tp1">
                        {analysis.tp1}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">{t.bookProfit}</p>
                    </div>
                  )}
                  {analysis.tp2 && (
                    <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                      <p className="text-[#9eb7a8] text-sm font-normal">TP2 (1:2)</p>
                      <p className="text-[#38e07b] text-lg font-bold mt-1" data-testid="text-tp2">
                        {analysis.tp2}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">{t.trailToBreakeven}</p>
                    </div>
                  )}
                  {analysis.tp3 && (
                    <div className="bg-[#1c2620] p-4 rounded-2xl text-center">
                      <p className="text-[#9eb7a8] text-sm font-normal">TP3 (1:3)</p>
                      <p className="text-[#38e07b] text-lg font-bold mt-1" data-testid="text-tp3">
                        {analysis.tp3}
                      </p>
                      <p className="text-[#6a7f72] text-xs mt-1">{t.maxTarget}</p>
                    </div>
                  )}
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
                            <p className="text-red-500 text-lg font-bold">{analysis.r3}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                        </div>
                      )}
                      {/* Resistance R2 */}
                      {analysis.r2 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border-l-4 border-orange-500" data-testid="text-r2">
                          <div className="flex-1">
                            <p className="text-orange-400 text-xs font-medium">R2</p>
                            <p className="text-orange-500 text-lg font-bold">{analysis.r2}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-orange-500/50"></div>
                        </div>
                      )}
                      {/* Resistance R1 */}
                      {analysis.r1 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border-l-4 border-yellow-500" data-testid="text-r1">
                          <div className="flex-1">
                            <p className="text-yellow-400 text-xs font-medium">R1</p>
                            <p className="text-yellow-500 text-lg font-bold">{analysis.r1}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                        </div>
                      )}
                      
                      {/* Entry Price - Center */}
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#38e07b]/20 border-2 border-[#38e07b]" data-testid="text-entry-price">
                        <div className="flex-1 text-center">
                          <p className="text-[#38e07b] text-xs font-bold uppercase tracking-wide">Entry Price</p>
                          <p className="text-white text-2xl font-bold mt-1">{analysis.entry}</p>
                        </div>
                      </div>
                      
                      {/* Support S1 */}
                      {analysis.s1 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-lime-500/10 border-l-4 border-lime-500" data-testid="text-s1">
                          <div className="flex-1">
                            <p className="text-lime-400 text-xs font-medium">S1</p>
                            <p className="text-lime-500 text-lg font-bold">{analysis.s1}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-lime-500/50"></div>
                        </div>
                      )}
                      {/* Support S2 */}
                      {analysis.s2 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border-l-4 border-emerald-500" data-testid="text-s2">
                          <div className="flex-1">
                            <p className="text-emerald-400 text-xs font-medium">S2</p>
                            <p className="text-emerald-500 text-lg font-bold">{analysis.s2}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                        </div>
                      )}
                      {/* Support S3 */}
                      {analysis.s3 && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#38e07b]/10 border-l-4 border-[#38e07b]" data-testid="text-s3">
                          <div className="flex-1">
                            <p className="text-[#38e07b] text-xs font-medium">S3</p>
                            <p className="text-[#38e07b] text-lg font-bold">{analysis.s3}</p>
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
            {analysis.trailingStopStrategy && (
              <div className="rounded-2xl bg-[#1c2620] p-4">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">trending_up</span>
                  {t.trailingStopStrategy}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed" data-testid="text-trailing-stop">
                  {analysis.trailingStopStrategy}
                </p>
              </div>
            )}

            {/* Explanatory Notes / Disclaimers */}
            {analysis.explanatoryNotes && (
              <div className="rounded-2xl bg-[#1c2620] p-4 border-2 border-[#38e07b]/30">
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">info</span>
                  {t.importantNotesDisclaimers}
                </h2>
                <p className="text-[#9eb7a8] text-base font-normal leading-relaxed" data-testid="text-explanatory-notes">
                  {analysis.explanatoryNotes}
                </p>
              </div>
            )}

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
                onClick={() => setLocation("/dashboard")}
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

  // Show analysis input form
  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <div className="flex-grow">
        <header className="flex items-center p-4 justify-between sticky top-0 bg-[#111714]/80 backdrop-blur-sm z-10">
          <button
            onClick={() => setLocation("/dashboard")}
            className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1c2620] hover-elevate active-elevate-2"
            data-testid="button-back"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            {t.analyzer}
          </h1>
        </header>

        <main className="p-6 space-y-6 pb-24">
          <div className="bg-[#1c2620] p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-white text-lg font-bold">{t.availableTokens}</h2>
              <span className="text-[#38e07b] text-2xl font-bold" data-testid="text-analyzer-tokens">
                {user?.tokens || 0}
              </span>
            </div>
            <p className="text-[#9eb7a8] text-sm">{t.analysisMessage}</p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-6">
            <div>
              <label className="text-white text-base font-medium mb-2 block">
                {t.tradingSymbol}
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., BTC, AAPL, EURUSD, GOLD"
                className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent placeholder:text-[#6a7f72] px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b]"
                data-testid="input-symbol"
              />
            </div>

            <div>
              <label className="text-white text-base font-medium mb-2 block">
                {t.duration}
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value as any)}
                className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b]"
                data-testid="select-duration"
              >
                <option value="long_term">{t.longTerm}</option>
                <option value="short_term">{t.shortTerm}</option>
                <option value="scalping">{t.scalping}</option>
              </select>
            </div>


            <button
              type="submit"
              disabled={analyzeMutation.isPending || !user || user.tokens < 2}
              className="w-full bg-[#38e07b] text-[#111714] font-bold py-4 rounded-full text-center text-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-analyze"
            >
              {analyzeMutation.isPending ? t.analyzing : t.analyzeMarket}
            </button>

            {user && user.tokens < 2 && (
              <p className="text-red-500 text-sm text-center">
                {t.insufficientTokens}
              </p>
            )}
          </form>
        </main>
      </div>

      <BottomNav />
      <UpdateModal />
    </div>
  );
}
