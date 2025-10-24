import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import type { Analysis } from "@shared/schema";

export default function Analyzer() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const analysisId = searchParams.get("analysisId");

  const [symbol, setSymbol] = useState("");
  const [duration, setDuration] = useState<"long_term" | "short_term" | "scalping">("short_term");
  const [quantity, setQuantity] = useState(100);
  const [selectedBrokerId, setSelectedBrokerId] = useState("");

  const userId = localStorage.getItem("userId");

  // Fetch user data for token check
  const { data: user } = useQuery<{ id: string; tokens: number; name: string; mobile: string; language: string }>({
    queryKey: ["/api/user", userId],
    enabled: !!userId && !analysisId,
  });

  // Fetch user's brokers
  const { data: brokers } = useQuery<Array<{ id: string; name: string; userId: string; apiKey: string | null; webhookUrl: string | null; webhookMessage: string | null }>>({
    queryKey: [`/api/brokers/${userId}`],
    enabled: !!userId,
  });

  // Fetch analysis results
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery<Analysis>({
    queryKey: ["/api/analysis", analysisId],
    enabled: !!analysisId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not found");
      const result = await apiRequest("POST", "/api/analyze", {
        userId,
        symbol,
        duration,
      });
      return await result.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
      setLocation(`/analyzer?analysisId=${data.analysisId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze market. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) {
      toast({
        title: "Symbol Required",
        description: "Please enter a trading symbol",
        variant: "destructive",
      });
      return;
    }
    if (!user || user.tokens < 2) {
      toast({
        title: "Insufficient Tokens",
        description: "You need at least 2 tokens to analyze a symbol",
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
        <div className="text-white">Loading analysis...</div>
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
              onClick={() => setLocation("/analyzer")}
              className="text-white flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1c2620] hover-elevate active-elevate-2"
              data-testid="button-back"
            >
              <span className="material-symbols-outlined">arrow_back_ios_new</span>
            </button>
            <h1 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
              {t.analyzer}
            </h1>
          </header>

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
                      strokeDashoffset={100 - analysis.confidence}
                      strokeLinecap="round"
                      strokeWidth="3"
                    ></circle>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-white" data-testid="text-confidence">
                      {analysis.confidence}%
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
                        className="size-4 rounded bg-[#334139] border-none accent-[#38e07b]"
                        data-testid="checkbox-stop-loss"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#29382f]/50 p-3 rounded-xl border border-[#38e07b]/20">
                  <p className="text-xs text-[#9eb7a8] leading-relaxed">
                    <span className="font-semibold text-[#38e07b]">Disclaimer:</span> Bracket order will only work if the webhook message provided by the broker has the relevant fields like take profit and stop loss.
                  </p>
                </div>

                <div className="bg-[#1c2620] p-4 rounded-2xl flex items-center justify-between">
                  <label className="text-[#9eb7a8] text-base font-normal" htmlFor="quantity">
                    {t.quantity}
                  </label>
                  <input
                    className="w-24 bg-[#334139] text-white text-center rounded-md border-none focus:ring-2 focus:ring-[#38e07b] px-2 py-1"
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    data-testid="input-quantity"
                  />
                </div>

                <div className="bg-[#1c2620] p-4 rounded-2xl flex items-center justify-between">
                  <label className="text-[#9eb7a8] text-base font-normal" htmlFor="broker">
                    {t.brokerChoice}
                  </label>
                  <select
                    className="bg-[#334139] text-white rounded-md border-none focus:ring-2 focus:ring-[#38e07b] px-3 py-1 min-w-[120px]"
                    id="broker"
                    value={selectedBrokerId}
                    onChange={(e) => setSelectedBrokerId(e.target.value)}
                    data-testid="select-broker"
                  >
                    <option value="">{brokers && brokers.length > 0 ? "Select Broker" : "No Brokers"}</option>
                    {brokers && brokers.map((broker) => (
                      <option key={broker.id} value={broker.id}>
                        {broker.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="w-full bg-[#38e07b] text-[#111714] font-bold py-4 rounded-full text-center text-lg hover:bg-opacity-90 transition-colors"
                  data-testid="button-execute"
                >
                  {t.execute}
                </button>
              </div>
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
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL, TSLA, GOOGL"
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
              {analyzeMutation.isPending ? "Analyzing..." : t.analyzeMarket}
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
