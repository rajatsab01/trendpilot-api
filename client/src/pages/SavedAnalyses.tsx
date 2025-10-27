import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "wouter";
import BottomNav from "@/components/BottomNav";
import type { Analysis } from "@shared/schema";
import { APP_VERSION } from "@shared/schema";
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Trash2, Share2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";

export default function SavedAnalyses() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const userId = localStorage.getItem("userId");

  const { data: savedAnalysesRaw = [], isLoading } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses/saved", userId || ""],
    enabled: !!userId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const result = await apiRequest("DELETE", `/api/analysis/${analysisId}`, {
        appVersion: APP_VERSION,
      });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses/saved", userId || ""] });
      toast({
        title: t.deleted,
        description: t.analysisDeletedSuccessfully,
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToDeleteAnalysis,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const result = await apiRequest("POST", `/api/community/publish/${analysisId}`, {
        appVersion: APP_VERSION,
      });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses/saved", userId || ""] });
      toast({
        title: t.published,
        description: t.analysisPublishedSuccessfully,
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToPublishAnalysis,
        variant: "destructive",
      });
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const result = await apiRequest("POST", `/api/community/unpublish/${analysisId}`, {
        appVersion: APP_VERSION,
      });
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses/saved", userId || ""] });
      toast({
        title: t.unpublished,
        description: t.analysisUnpublishedSuccessfully,
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToUnpublishAnalysis,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent, analysisId: string, symbolName: string) => {
    e.stopPropagation();
    
    const confirmed = window.confirm(`Are you sure you want to delete ${symbolName} analysis? This action cannot be undone.`);
    if (confirmed) {
      deleteMutation.mutate(analysisId);
    }
  };

  const handleTogglePublish = async (e: React.MouseEvent, analysisId: string, isPublished: boolean) => {
    e.stopPropagation();
    
    // VERSION CHECKPOINT
    const versionOk = await guardAction();
    if (!versionOk) return;

    if (isPublished) {
      unpublishMutation.mutate(analysisId);
    } else {
      publishMutation.mutate(analysisId);
    }
  };

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
          label: t.won,
        };
      case "lost":
        return {
          icon: XCircle,
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500",
          label: t.lost,
        };
      case "expired":
        return {
          icon: Clock,
          color: "text-gray-500",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500",
          label: t.expired,
        };
      default:
        return {
          icon: Clock,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500",
          label: t.active,
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <div className="text-white">{t.loadingSavedAnalyses}</div>
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
        <h1 className="text-white text-2xl font-bold">{t.savedAnalyses}</h1>
        <p className="text-[#9eb7a8] text-sm mt-1">
          {t.trackYourSavedTrades}
        </p>
      </header>

      {/* Traffic Light Stats Dashboard */}
      {totalTrades > 0 && (
        <div className="bg-[#1c2620] border-b border-[#29382f] px-4 py-4">
          <div className="grid grid-cols-5 gap-2 mb-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{totalTrades}</div>
              <div className="text-xs text-[#9eb7a8]">{t.total}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#38e07b]">{greenTrades}</div>
              <div className="text-xs text-[#9eb7a8]">{t.won}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{redTrades}</div>
              <div className="text-xs text-[#9eb7a8]">{t.lost}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-500">{yellowTrades}</div>
              <div className="text-xs text-[#9eb7a8]">{t.active}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">{grayTrades}</div>
              <div className="text-xs text-[#9eb7a8]">{t.expired}</div>
            </div>
          </div>
          {totalClosed > 0 && (
            <div className="flex gap-2">
              <div className="flex-1 bg-[#111714] rounded-lg p-2 text-center">
                <div className="text-sm font-medium text-[#38e07b]">{winRate}%</div>
                <div className="text-xs text-[#9eb7a8]">{t.winRate}</div>
              </div>
              <div className="flex-1 bg-[#111714] rounded-lg p-2 text-center">
                <div className="text-sm font-medium text-red-500">{lossRate}%</div>
                <div className="text-xs text-[#9eb7a8]">{t.lossRate}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <main className="px-4 py-6">
        {savedAnalyses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#9eb7a8] text-lg mb-2">{t.noSavedAnalysesYet}</div>
            <p className="text-[#9eb7a8] text-sm mb-6">
              {t.saveAnalysesToTrack}
            </p>
            <button
              onClick={() => setLocation("/analyzer")}
              className="bg-[#38e07b] text-[#111714] font-bold py-3 px-6 rounded-full hover:bg-opacity-90 transition-colors"
              data-testid="button-go-to-analyzer"
            >
              {t.analyzeMarket}
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
                  {/* Line 1: Symbol, Sentiment + Verdict, RRR, Status, Delete */}
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.borderColor} border`}>
                        <StatusIcon className={`w-3 h-3 ${statusConfig.color}`} />
                        <span className={`text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleTogglePublish(e, analysis.id, analysis.isPublished === 1)}
                        disabled={publishMutation.isPending || unpublishMutation.isPending}
                        className={`p-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                          analysis.isPublished === 1
                            ? "bg-[#38e07b]/20 border-[#38e07b]/40 hover:bg-[#38e07b]/30"
                            : "bg-gray-500/10 border-gray-500/30 hover:bg-gray-500/20"
                        }`}
                        data-testid={`button-publish-analysis-${analysis.id}`}
                        title={analysis.isPublished === 1 ? "Unpublish from community" : "Publish to community"}
                      >
                        <Share2 className={`w-4 h-4 ${analysis.isPublished === 1 ? "text-[#38e07b]" : "text-gray-400"}`} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, analysis.id, analysis.symbol)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-full bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        data-testid={`button-delete-analysis-${analysis.id}`}
                        title="Delete analysis"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Line 2: Entry, Current, TP1, TP2, SL */}
                  <div className="flex items-center gap-2 text-xs mb-1">
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

                  {/* Line 3: Timestamp */}
                  {analysis.createdAt && (
                    <div className="flex items-center gap-1 text-[10px] text-[#6a7f72]">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      <span>
                        {new Date(analysis.createdAt).toLocaleDateString(undefined, { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                        {' '}
                        {new Date(analysis.createdAt).toLocaleTimeString(undefined, { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
      <UpdateModal />
    </div>
  );
}
