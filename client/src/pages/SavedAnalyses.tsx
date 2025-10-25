import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import type { Analysis } from "@shared/schema";
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";

export default function SavedAnalyses() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const userId = localStorage.getItem("userId");

  const { data: savedAnalysesRaw = [], isLoading } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses/saved", userId || ""],
    enabled: !!userId,
  });

  // Sort by newest first
  const savedAnalyses = [...savedAnalysesRaw].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA; // Newest first
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "won":
        return {
          icon: CheckCircle,
          color: "text-[#38e07b]",
          bgColor: "bg-[#38e07b]/10",
          borderColor: "border-[#38e07b]",
          label: "Won",
        };
      case "lost":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500",
          label: "Lost",
        };
      case "expired":
        return {
          icon: Clock,
          color: "text-gray-500",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500",
          label: "Expired",
        };
      default:
        return {
          icon: Clock,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500",
          label: "Active",
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <div className="text-white">Loading saved analyses...</div>
      </div>
    );
  }

  // Calculate stats
  const totalTrades = savedAnalyses.length;
  const greenTrades = savedAnalyses.filter(a => a.tradeStatus === "won").length;
  const redTrades = savedAnalyses.filter(a => a.tradeStatus === "lost").length;
  const yellowTrades = savedAnalyses.filter(a => a.tradeStatus === "active" || !a.tradeStatus).length;
  const grayTrades = savedAnalyses.filter(a => a.tradeStatus === "expired").length;
  
  const totalClosed = greenTrades + redTrades;
  const winRate = totalClosed > 0 ? ((greenTrades / totalClosed) * 100).toFixed(1) : "0.0";
  const lossRate = totalClosed > 0 ? ((redTrades / totalClosed) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-[#111714] pb-24">
      <header className="bg-[#1c2620] border-b border-[#29382f] px-4 py-6">
        <h1 className="text-white text-2xl font-bold">Saved Analyses</h1>
        <p className="text-[#9eb7a8] text-sm mt-1">
          Track your saved trades and performance
        </p>
      </header>

      {/* Traffic Light Stats Dashboard */}
      {totalTrades > 0 && (
        <div className="bg-[#1c2620] border-b border-[#29382f] px-4 py-4">
          <div className="grid grid-cols-5 gap-2 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalTrades}</div>
              <div className="text-xs text-[#9eb7a8]">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#38e07b]">{greenTrades}</div>
              <div className="text-xs text-[#9eb7a8]">Won</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{redTrades}</div>
              <div className="text-xs text-[#9eb7a8]">Lost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{yellowTrades}</div>
              <div className="text-xs text-[#9eb7a8]">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{grayTrades}</div>
              <div className="text-xs text-[#9eb7a8]">Expired</div>
            </div>
          </div>
          {totalClosed > 0 && (
            <div className="flex gap-2">
              <div className="flex-1 bg-[#111714] rounded-lg p-2 text-center">
                <div className="text-sm font-medium text-[#38e07b]">{winRate}%</div>
                <div className="text-xs text-[#9eb7a8]">Win Rate</div>
              </div>
              <div className="flex-1 bg-[#111714] rounded-lg p-2 text-center">
                <div className="text-sm font-medium text-red-500">{lossRate}%</div>
                <div className="text-xs text-[#9eb7a8]">Loss Rate</div>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="px-4 py-6">
        {savedAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#9eb7a8] text-lg mb-2">No saved analyses yet</div>
            <p className="text-[#9eb7a8] text-sm mb-6">
              Save analyses from the analyzer to track them here
            </p>
            <button
              onClick={() => setLocation("/analyzer")}
              className="bg-[#38e07b] text-[#111714] font-bold py-3 px-6 rounded-full hover:bg-opacity-90 transition-colors"
              data-testid="button-go-to-analyzer"
            >
              Analyze Market
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {savedAnalyses.map((analysis) => {
              const isBullish = analysis.sentiment === "Bullish";
              const statusConfig = getStatusConfig(analysis.tradeStatus || "active");
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={analysis.id}
                  onClick={() => setLocation(`/analyzer?analysisId=${analysis.id}&fromSaved=true`)}
                  className="bg-[#1c2620] border border-[#29382f] rounded-xl p-3 cursor-pointer hover:border-[#38e07b] transition-colors"
                  data-testid={`card-saved-analysis-${analysis.id}`}
                >
                  {/* Line 1: Symbol, Sentiment + Verdict, RRR, Status */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-white font-bold text-base truncate">
                        {analysis.symbol}
                      </span>
                      <div className="flex items-center gap-1">
                        {isBullish ? (
                          <TrendingUp className="w-4 h-4 text-[#38e07b]" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-sm font-medium ${isBullish ? "text-[#38e07b]" : "text-red-500"}`}>
                          {analysis.sentiment}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.borderColor} border flex-shrink-0`}>
                      <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                      <span className={`text-xs font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Line 2: Entry, Current, TP1, TP2, SL */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-[#9eb7a8]">Entry:</span>
                      <span className="text-white font-medium">{analysis.entry || "N/A"}</span>
                    </div>
                    <span className="text-[#9eb7a8]">•</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[#9eb7a8]">Now:</span>
                      <span className="text-white font-medium">{analysis.currentPrice || analysis.livePrice || "N/A"}</span>
                    </div>
                    <span className="text-[#9eb7a8]">•</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[#38e07b]">TP1:</span>
                      <span className="text-[#38e07b] font-medium">{analysis.tp1 || "N/A"}</span>
                    </div>
                    <span className="text-[#9eb7a8]">•</span>
                    <div className="flex items-center gap-1">
                      <span className="text-red-500">SL:</span>
                      <span className="text-red-500 font-medium">{analysis.stopLoss || "N/A"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
