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

  const { data: savedAnalyses = [], isLoading } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses/saved", userId || ""],
    enabled: !!userId,
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

  return (
    <div className="min-h-screen bg-[#111714] pb-24">
      <header className="bg-[#1c2620] border-b border-[#29382f] px-4 py-6">
        <h1 className="text-white text-2xl font-bold">Saved Analyses</h1>
        <p className="text-[#9eb7a8] text-sm mt-1">
          Track your saved trades and performance
        </p>
      </header>

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
                  onClick={() => setLocation(`/analyzer?analysisId=${analysis.id}`)}
                  className="bg-[#1c2620] border border-[#29382f] rounded-2xl p-4 cursor-pointer hover:border-[#38e07b] transition-colors"
                  data-testid={`card-saved-analysis-${analysis.id}`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">
                          {analysis.symbol}
                        </span>
                        {isBullish ? (
                          <TrendingUp className="w-5 h-5 text-[#38e07b]" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <p className={`text-sm font-medium mt-1 ${isBullish ? "text-[#38e07b]" : "text-red-500"}`}>
                        {analysis.sentiment}
                      </p>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
                      <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                      <span className={`text-sm font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Price Info */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-[#111714] rounded-lg p-2">
                      <p className="text-[#9eb7a8] text-xs mb-1">Entry Price</p>
                      <p className="text-white font-bold text-sm">
                        {analysis.entry || "N/A"}
                      </p>
                    </div>
                    <div className="bg-[#111714] rounded-lg p-2">
                      <p className="text-[#9eb7a8] text-xs mb-1">Current Price</p>
                      <p className="text-white font-bold text-sm">
                        {analysis.currentPrice || analysis.livePrice || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Targets */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-[#111714] rounded-lg p-2">
                      <p className="text-[#9eb7a8] text-xs mb-1">TP1</p>
                      <p className="text-[#38e07b] font-bold text-xs">
                        {analysis.tp1 || "N/A"}
                      </p>
                    </div>
                    <div className="bg-[#111714] rounded-lg p-2">
                      <p className="text-[#9eb7a8] text-xs mb-1">TP2</p>
                      <p className="text-[#38e07b] font-bold text-xs">
                        {analysis.tp2 || "N/A"}
                      </p>
                    </div>
                    <div className="bg-[#111714] rounded-lg p-2">
                      <p className="text-[#9eb7a8] text-xs mb-1">SL</p>
                      <p className="text-red-500 font-bold text-xs">
                        {analysis.stopLoss || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Profit/Loss */}
                  {analysis.actualProfit && (
                    <div className="bg-[#111714] rounded-lg p-2">
                      <p className="text-[#9eb7a8] text-xs mb-1">Profit/Loss</p>
                      <p className={`font-bold text-sm ${
                        parseFloat(analysis.actualProfit) >= 0 ? "text-[#38e07b]" : "text-red-500"
                      }`}>
                        {parseFloat(analysis.actualProfit) >= 0 ? "+" : ""}
                        {analysis.actualProfit}%
                      </p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="mt-3 pt-3 border-t border-[#29382f]">
                    <p className="text-[#9eb7a8] text-xs">
                      {analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : "N/A"} at{" "}
                      {analysis.createdAt ? new Date(analysis.createdAt).toLocaleTimeString() : "N/A"}
                    </p>
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
