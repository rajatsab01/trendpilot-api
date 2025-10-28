import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import { useLanguage } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";
import ReportModal from "@/components/ReportModal";
import ReactionButtons from "@/components/ReactionButtons";
import type { Analysis, User, Report } from "@shared/schema";
import { format } from "date-fns";

type FeedItem = Analysis & { author: User };
type PinnedTraderWithNotifications = {
  user: User;
  unreadCount: number;
};

export default function Community() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const { t } = useLanguage();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ userId?: string; analysisId?: string; type: "abuse_user" | "abuse_post" | "bug" }>({ type: "bug" });
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [alias, setAlias] = useState("");
  const [isAcceptingRules, setIsAcceptingRules] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const userId = localStorage.getItem("userId");

  // Fetch user data to check if admin and rules acceptance
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
  });

  // Fetch saved analyses to check minimum requirement
  const { data: analyses = [] } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses", userId],
    enabled: !!userId,
  });

  // Fetch community feed
  const { data: feed = [], isLoading } = useQuery<FeedItem[]>({
    queryKey: ["/api/community/feed", userId],
    enabled: !!userId && user?.rulesAccepted === 1,
  });

  // Fetch pinned traders with notification counts
  const { data: pinnedTradersWithNotifications = [] } = useQuery<PinnedTraderWithNotifications[]>({
    queryKey: ["/api/community/pinned-with-notifications", userId],
    queryFn: async () => {
      const response = await fetch(`/api/community/pinned-with-notifications/${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && user?.rulesAccepted === 1,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch user's reports
  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["/api/reports", userId],
    enabled: !!userId,
  });

  // Check if user has accepted rules and has minimum saved analyses
  useEffect(() => {
    if (user && user.rulesAccepted !== 1) {
      setShowRulesModal(true);
      setAlias(user.alias || "");
    }
  }, [user]);

  const handleAcceptRules = async () => {
    if (!userId) return;

    // Check minimum saved analyses
    if (analyses.length < 10) {
      toast({
        title: t.minimumRequirement,
        description: t.need10Trades,
        variant: "destructive",
      });
      return;
    }

    // Validate alias
    if (!alias || alias.trim().length === 0) {
      toast({
        title: t.aliasRequired,
        description: t.enterCommunityUsername,
        variant: "destructive",
      });
      return;
    }

    if (alias.length > 10) {
      toast({
        title: t.aliasTooLong,
        description: t.usernameTooLong,
        variant: "destructive",
      });
      return;
    }

    setIsAcceptingRules(true);

    try {
      // Update alias first
      await apiRequest("POST", "/api/community/alias", {
        userId,
        alias: alias.trim(),
      });

      // Accept rules
      await apiRequest("POST", "/api/community/accept-rules", {
        userId,
      });

      toast({
        title: t.welcomeToCommunity,
        description: t.shareDiscoverInsights,
      });

      setShowRulesModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
    } catch (error: any) {
      toast({
        title: t.error,
        description: error.message || t.failedToJoinCommunity,
        variant: "destructive",
      });
    } finally {
      setIsAcceptingRules(false);
    }
  };

  const handleAnalysisClick = (analysisId: string) => {
    setLocation(`/analyzer?analysisId=${analysisId}&fromCommunity=true`);
  };

  const handleTraderClick = async (traderId: string) => {
    // Mark notifications as read for this trader
    if (userId) {
      try {
        await apiRequest("POST", "/api/community/mark-trader-notifications-read", {
          userId,
          traderId,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/community/pinned-with-notifications", userId] });
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
      }
    }
    setLocation(`/trader/${traderId}`);
  };

  const handleReportUser = async (reportedUserId: string) => {
    const versionOk = await guardAction();
    if (!versionOk) return;

    setReportTarget({ userId: reportedUserId, type: "abuse_user" });
    setShowReportModal(true);
  };

  const handleReportAnalysis = async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const versionOk = await guardAction();
    if (!versionOk) return;

    setReportTarget({ analysisId, type: "abuse_post" });
    setShowReportModal(true);
  };

  if (!user) {
    return null;
  }

  // Group analyses by trader
  const traderGroups = feed.reduce((acc, item) => {
    const traderId = item.author.id;
    if (!acc[traderId]) {
      acc[traderId] = {
        user: item.author,
        analyses: []
      };
    }
    acc[traderId].analyses.push(item);
    return acc;
  }, {} as Record<string, { user: User, analyses: FeedItem[] }>);

  // Filter groups based on search query
  const filteredTraderGroups = Object.values(traderGroups).filter(({ user, analyses }) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const usernameMatch = user.alias?.toLowerCase().includes(query) || false;
    const symbolMatch = analyses.some(a => a.symbol.toLowerCase().includes(query));
    
    return usernameMatch || symbolMatch;
  });

  return (
    <div className="min-h-screen bg-[#111714] pb-20">
      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c2620] rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-white text-2xl font-bold">{t.joinCommunity}</h2>
            
            <div className="space-y-2">
              <p className="text-[#9eb7a8] text-sm">
                {t.toAccessCommunity}
              </p>
              <ul className="list-disc list-inside text-[#9eb7a8] text-sm space-y-1">
                <li>{t.atLeast10Trades.replace('{count}', analyses.length.toString())}</li>
                <li>{t.uniqueUsername}</li>
                <li>{t.acceptRules}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <label className="text-white text-sm font-medium">{t.chooseUsername}</label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder={t.enterUsername}
                maxLength={10}
                className="w-full bg-[#111714] text-white rounded-xl px-4 py-3 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none"
                data-testid="input-alias"
              />
            </div>

            <div className="bg-[#111714] rounded-xl p-4 space-y-2">
              <h3 className="text-white font-semibold text-sm">{t.communityRules}</h3>
              <ul className="list-disc list-inside text-[#9eb7a8] text-xs space-y-1">
                <li>{t.rule1}</li>
                <li>{t.rule2}</li>
                <li>{t.rule3}</li>
                <li>{t.rule4}</li>
              </ul>
            </div>

            <button
              onClick={handleAcceptRules}
              disabled={isAcceptingRules || analyses.length < 10 || !alias.trim()}
              className="w-full py-3 bg-[#38e07b] text-[#111714] font-semibold rounded-lg hover:bg-[#2fc76a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="button-accept-rules"
            >
              {isAcceptingRules ? t.processing : t.iAgreeJoinCommunity}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Header */}
        <div className="px-4 pt-4">
          <h1 className="text-white text-2xl font-bold">{t.community}</h1>
        </div>

        {/* Pinned Traders Section - Show ONLY pinned traders with notifications */}
        {pinnedTradersWithNotifications.length > 0 && !searchQuery && (
          <div className="space-y-2 px-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38e07b] text-lg">push_pin</span>
              <h2 className="text-white font-semibold text-sm">{t.pinnedTraders}</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
              {pinnedTradersWithNotifications.map(({ user: trader, unreadCount }) => (
                <button
                  key={trader.id}
                  onClick={() => handleTraderClick(trader.id)}
                  className="flex-shrink-0 bg-[#1a241f] rounded-lg p-2 border border-[#38e07b]/30 hover-elevate active-elevate-2 w-[120px]"
                  data-testid={`pinned-trader-${trader.id}`}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative w-10 h-10">
                      <div className="w-10 h-10 rounded-full bg-[#38e07b]/20 flex items-center justify-center">
                        {unreadCount > 0 ? (
                          <span className="text-[#38e07b] text-sm font-bold">
                            {unreadCount}
                          </span>
                        ) : (
                          <span className="text-[#38e07b] text-sm font-bold">
                            {trader.alias?.charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center w-full">
                      <p className="text-white font-semibold text-xs truncate">
                        {trader.alias || 'Anonymous'}
                      </p>
                      {unreadCount > 0 && (
                        <p className="text-[#38e07b] text-[10px] font-semibold">
                          {unreadCount} new
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6a7f72]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchByUsername}
              className="w-full bg-[#1a241f] text-white rounded-xl pl-11 pr-4 py-2.5 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72] text-sm"
              data-testid="input-search-community"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a7f72] hover:text-white"
                data-testid="button-clear-search"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#9eb7a8]">{t.loadingFeed}</div>
          </div>
        ) : feed.length === 0 ? (
          <div className="px-4">
            <div className="bg-[#1a241f] rounded-xl p-8 text-center border border-[#2a3c33]">
              <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">group</span>
              <h3 className="text-white font-semibold mb-2">{t.noAnalysesYet}</h3>
              <p className="text-[#9eb7a8] text-sm mb-4">
                {t.communityGrowing}
              </p>
              <button
                onClick={() => setLocation("/analyzer")}
                className="px-6 py-2 bg-[#38e07b] text-[#111714] font-semibold rounded-lg hover:bg-[#2fc76a] transition-colors"
                data-testid="button-start-analyzing"
              >
                {t.startAnalyzing}
              </button>
            </div>
          </div>
        ) : filteredTraderGroups.length === 0 && searchQuery.trim() ? (
          <div className="px-4">
            <div className="bg-[#1a241f] rounded-xl p-6 text-center border border-[#2a3c33]">
              <span className="material-symbols-outlined text-[#6a7f72] text-4xl mb-2 block">search_off</span>
              <h3 className="text-white font-semibold text-sm mb-1">{t.noResultsFound}</h3>
              <p className="text-[#9eb7a8] text-xs">
                {t.noMatchingTraders.replace('{query}', searchQuery)}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Feed grouped by trader - each trader gets 1 horizontal scrollable row */}
            {filteredTraderGroups.map(({ user: trader, analyses }) => (
              <div key={trader.id} className="space-y-2">
                {/* Trader Header */}
                <div className="px-4 flex items-center justify-between">
                  <button
                    onClick={() => handleTraderClick(trader.id)}
                    className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-lg p-1.5 -ml-1.5"
                    data-testid={`trader-header-${trader.id}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#38e07b]/20 flex items-center justify-center">
                      <span className="text-[#38e07b] text-xs font-bold">
                        {trader.alias?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">
                        {trader.alias || 'Anonymous'}
                      </p>
                      <p className="text-[#6a7f72] text-xs">
                        {analyses.length} {analyses.length === 1 ? 'trade' : 'trades'}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleReportUser(trader.id)}
                    className="text-[#6a7f72] hover:text-white p-1"
                    data-testid={`button-report-trader-${trader.id}`}
                  >
                    <span className="material-symbols-outlined text-lg">flag</span>
                  </button>
                </div>

                {/* Horizontal Scrollable Row of Analyses */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      onClick={() => handleAnalysisClick(analysis.id)}
                      className="flex-shrink-0 w-[280px] bg-[#1a241f] rounded-xl p-3 border border-[#2a3c33] hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`analysis-card-${analysis.id}`}
                    >
                      <div className="space-y-2">
                        {/* Symbol and Action */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                analysis.recommendation === "BUY"
                                  ? "bg-[#38e07b]/20 text-[#38e07b]"
                                  : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {analysis.recommendation}
                            </div>
                            <span className="text-white font-bold text-sm">
                              {analysis.correctedSymbol || analysis.symbol}
                            </span>
                          </div>
                          <button
                            onClick={(e) => handleReportAnalysis(analysis.id, e)}
                            className="text-[#6a7f72] hover:text-white"
                          >
                            <span className="material-symbols-outlined text-base">flag</span>
                          </button>
                        </div>

                        {/* Analysis snippet */}
                        <p className="text-[#9eb7a8] text-xs line-clamp-2">
                          {analysis.analysis}
                        </p>

                        {/* Price and time */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#6a7f72]">
                            {analysis.candleClosePrice && `₹${analysis.candleClosePrice}`}
                          </span>
                          <span className="text-[#6a7f72]">
                            {analysis.createdAt && format(new Date(analysis.createdAt), "MMM dd")}
                          </span>
                        </div>

                        {/* Reactions */}
                        <ReactionButtons
                          analysisId={analysis.id}
                          userId={userId!}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <ReportModal
          isOpen={showReportModal}
          userId={userId!}
          defaultType={reportTarget.type}
          reportedUserId={reportTarget.userId}
          reportedAnalysisId={reportTarget.analysisId}
          onClose={() => setShowReportModal(false)}
        />
      )}

      <UpdateModal />
      <BottomNav />
    </div>
  );
}
