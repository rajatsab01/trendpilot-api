import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import type { Analysis } from "@shared/schema";

interface SymbolSuggestion {
  id: string;
  symbol: string;
  name: string;
}

export default function Analyzer() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const analysisId = searchParams.get("analysisId");

  const [symbol, setSymbol] = useState("");
  const [duration, setDuration] = useState<"long_term" | "short_term" | "scalping">("short_term");
  const [market, setMarket] = useState<"stock_equities" | "commodity" | "forex" | "derivatives_futures" | "bond" | "cryptocurrency" | "">("");
  const [includeTakeProfit, setIncludeTakeProfit] = useState(false);
  const [includeStopLoss, setIncludeStopLoss] = useState(false);
  const [symbolSuggestions, setSymbolSuggestions] = useState<SymbolSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef<{ symbol: string; market: string }>({ symbol: '', market: '' });

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

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      toast({
        title: t.symbolRequired,
        description: t.pleaseEnterSymbol,
        variant: "destructive",
      });
      return;
    }
    if (!market) {
      toast({
        title: t.marketRequired,
        description: t.pleaseSelectMarket,
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

  // Debounced symbol search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Update latest query ref
    latestQueryRef.current = { symbol, market: market || '' };

    // Don't search if no symbol or no market or if viewing analysis results
    if (!symbol.trim() || !market || analysisId) {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    // Only support cryptocurrency market for now
    if (market !== 'cryptocurrency') {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    // Capture current query for this fetch
    const querySymbol = symbol;
    const queryMarket = market;

    // Debounce search - wait 500ms after user stops typing
    debounceTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/symbols/search?query=${encodeURIComponent(querySymbol)}&market=${queryMarket}`
        );
        if (response.ok) {
          const data = await response.json();
          
          // Only update state if this query is still the latest (prevents stale results)
          if (latestQueryRef.current.symbol === querySymbol && latestQueryRef.current.market === queryMarket) {
            setSymbolSuggestions(data.suggestions || []);
            setShowSuggestions((data.suggestions || []).length > 0);
            setIsSearching(false);
          } else {
            // Query is stale, stop spinner if needed
            setIsSearching(false);
          }
        } else {
          // Only update if query is still current
          if (latestQueryRef.current.symbol === querySymbol && latestQueryRef.current.market === queryMarket) {
            setIsSearching(false);
          }
        }
      } catch (error) {
        console.error('Symbol search error:', error);
        // Only clear if query is still current
        if (latestQueryRef.current.symbol === querySymbol && latestQueryRef.current.market === queryMarket) {
          setSymbolSuggestions([]);
          setShowSuggestions(false);
          setIsSearching(false);
        } else {
          setIsSearching(false);
        }
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [symbol, market, analysisId]);

  const handleSuggestionClick = (suggestion: SymbolSuggestion) => {
    setSymbol(suggestion.symbol);
    setShowSuggestions(false);
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

          {/* Symbol and Current Price Display - Perplexity Validated */}
          <div className="px-4 pt-6 pb-2">
            <div className="bg-[#1c2620] rounded-2xl p-6 text-center">
              {/* Show if symbol was corrected by Perplexity */}
              {analysis.correctedSymbol && analysis.symbol !== analysis.correctedSymbol && (
                <div className="mb-3 text-[#9eb7a8] text-sm">
                  <span className="text-[#6a7f72]">Searched:</span> <span className="line-through">{analysis.symbol}</span>
                  <span className="mx-2">→</span>
                  <span className="text-[#38e07b]">Found: {analysis.correctedSymbol}</span>
                </div>
              )}
              
              <div className="mb-2">
                <h2 className="text-white text-3xl font-bold tracking-tight" data-testid="text-instrument-name">
                  {analysis.assetName || analysis.instrumentName || analysis.symbol}
                </h2>
                {analysis.correctedSymbol && (
                  <p className="text-[#9eb7a8] text-lg mt-1" data-testid="text-corrected-symbol">
                    {analysis.correctedSymbol}
                  </p>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-[#9eb7a8] text-sm mb-1">{t.currentPrice}</p>
                {analysis.currentPrice && parseFloat(analysis.currentPrice) > 0 ? (
                  <>
                    <p className="text-[#38e07b] text-4xl font-bold tracking-tight" data-testid="text-current-price">
                      ${parseFloat(analysis.currentPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {analysis.priceSource && (
                      <p className="text-[#6a7f72] text-xs mt-2" data-testid="text-price-source">
                        via {analysis.priceSource}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[#9eb7a8] text-2xl font-medium" data-testid="text-current-price-unavailable">
                    {t.priceDataUnavailable}
                  </p>
                )}
              </div>
            </div>
          </div>

          <main className="p-4 space-y-8 pb-24">
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
                      const takeProfit = parseFloat(analysis.takeProfit || "0");
                      const stopLoss = parseFloat(analysis.stopLoss || "0");
                      
                      let risk, reward;
                      if (analysis.recommendation === "BUY") {
                        risk = entry - stopLoss;
                        reward = takeProfit - entry;
                      } else {
                        risk = stopLoss - entry;
                        reward = entry - takeProfit;
                      }
                      
                      if (risk <= 0 || reward <= 0) return "N/A";
                      
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

            {/* Support & Resistance Levels */}
            {((analysis.s1 || analysis.s2 || analysis.s3) || (analysis.r1 || analysis.r2 || analysis.r3)) && (
              <div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">multiline_chart</span>
                  {t.supportResistanceLevels}
                </h2>
                <div className="space-y-4">
                  {/* Resistance Levels */}
                  {(analysis.r1 || analysis.r2 || analysis.r3) && (
                    <div className="bg-[#1c2620] p-4 rounded-2xl">
                      <p className="text-white text-base font-bold mb-3 flex items-center gap-2">
                        <span className="text-red-500">▲</span> {t.resistance}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {analysis.r3 && (
                          <div className="text-center">
                            <p className="text-[#9eb7a8] text-xs">R3</p>
                            <p className="text-red-500 text-base font-bold mt-1" data-testid="text-r3">{analysis.r3}</p>
                          </div>
                        )}
                        {analysis.r2 && (
                          <div className="text-center">
                            <p className="text-[#9eb7a8] text-xs">R2</p>
                            <p className="text-red-500 text-base font-bold mt-1" data-testid="text-r2">{analysis.r2}</p>
                          </div>
                        )}
                        {analysis.r1 && (
                          <div className="text-center">
                            <p className="text-[#9eb7a8] text-xs">R1</p>
                            <p className="text-red-500 text-base font-bold mt-1" data-testid="text-r1">{analysis.r1}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Support Levels */}
                  {(analysis.s1 || analysis.s2 || analysis.s3) && (
                    <div className="bg-[#1c2620] p-4 rounded-2xl">
                      <p className="text-white text-base font-bold mb-3 flex items-center gap-2">
                        <span className="text-[#38e07b]">▼</span> {t.support}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {analysis.s1 && (
                          <div className="text-center">
                            <p className="text-[#9eb7a8] text-xs">S1</p>
                            <p className="text-[#38e07b] text-base font-bold mt-1" data-testid="text-s1">{analysis.s1}</p>
                          </div>
                        )}
                        {analysis.s2 && (
                          <div className="text-center">
                            <p className="text-[#9eb7a8] text-xs">S2</p>
                            <p className="text-[#38e07b] text-base font-bold mt-1" data-testid="text-s2">{analysis.s2}</p>
                          </div>
                        )}
                        {analysis.s3 && (
                          <div className="text-center">
                            <p className="text-[#9eb7a8] text-xs">S3</p>
                            <p className="text-[#38e07b] text-base font-bold mt-1" data-testid="text-s3">{analysis.s3}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

            {/* Analyse More Button */}
            <div className="mt-8">
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
              <div className="relative">
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., BTC, ETH, BTCUSDT"
                  className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent placeholder:text-[#6a7f72] px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b]"
                  data-testid="input-symbol"
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-5 w-5 border-2 border-[#38e07b] border-t-transparent rounded-full"></div>
                  </div>
                )}
                
                {/* Symbol Suggestions Dropdown */}
                {showSuggestions && symbolSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-[#1c2620] rounded-xl border border-[#38e07b]/20 shadow-lg overflow-hidden">
                    <div className="p-2 text-[#9eb7a8] text-xs font-medium border-b border-[#38e07b]/10">
                      Suggested symbols:
                    </div>
                    {symbolSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-3 hover-elevate active-elevate-2 flex items-center justify-between group"
                        data-testid={`suggestion-${suggestion.symbol}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-white text-base font-medium">
                            {suggestion.symbol}
                          </span>
                          <span className="text-[#9eb7a8] text-sm">
                            {suggestion.name}
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[#38e07b] opacity-0 group-hover:opacity-100 transition-opacity">
                          arrow_forward
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

            <div>
              <label className="text-white text-base font-medium mb-2 block">
                Market Selection
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as any)}
                className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b]"
                data-testid="select-market"
              >
                <option value="">Select Market</option>
                <option value="stock_equities">Stock Market (Equities)</option>
                <option value="commodity">Commodity Market</option>
                <option value="forex">Foreign Exchange (Forex) Market</option>
                <option value="derivatives_futures">Derivatives Market (Futures)</option>
                <option value="bond">Bond Market</option>
                <option value="cryptocurrency">Cryptocurrency Market</option>
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
    </div>
  );
}
