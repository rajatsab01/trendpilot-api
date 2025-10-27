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

  // Fetch pinned traders
  type PinnedTrader = {
    id: string;
    name: string;
    alias: string | null;
    publishedCount: number;
  };
  
  const { data: pinnedTraders = [] } = useQuery<PinnedTrader[]>({
    queryKey: ["/api/community/pinned-traders", userId],
    queryFn: async () => {
      const response = await fetch(`/api/community/pinned/${userId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!userId && user?.rulesAccepted === 1,
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

      <div className="p-4 space-y-4">
        <h1 className="text-white text-2xl font-bold">{t.community}</h1>

        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6a7f72]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchByUsername}
            className="w-full bg-[#1a241f] text-white rounded-xl pl-11 pr-4 py-3 border border-[#2a3c33] focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72]"
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

        {/* Pinned Traders Section */}
        {pinnedTraders.length > 0 && !searchQuery && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#38e07b] text-lg">push_pin</span>
              <h2 className="text-white font-semibold text-sm">{t.pinnedTraders}</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {pinnedTraders.map((trader) => (
                <button
                  key={trader.id}
                  onClick={() => setLocation(`/trader/${trader.id}`)}
                  className="flex-shrink-0 bg-[#1a241f] rounded-xl p-3 border border-[#38e07b]/30 hover-elevate active-elevate-2 min-w-[140px]"
                  data-testid={`pinned-trader-${trader.id}`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-[#38e07b]/20 flex items-center justify-center">
                      <span className="text-[#38e07b] text-lg font-bold">
                        {trader.alias?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm truncate max-w-[120px]">
                        {trader.alias || 'Anonymous'}
                      </p>
                      <p className="text-[#6a7f72] text-xs">
                        {trader.publishedCount} {trader.publishedCount === 1 ? t.post : t.posts}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#9eb7a8]">{t.loadingFeed}</div>
          </div>
        ) : feed.length === 0 ? (
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
        ) : (
          <div className="space-y-3">
            {(() => {
              // Group analyses by user
              const userGroups = feed.reduce((acc, item) => {
                const userId = item.author.id;
                if (!acc[userId]) {
                  acc[userId] = {
                    user: item.author,
                    analyses: []
                  };
                }
                acc[userId].analyses.push(item);
                return acc;
              }, {} as Record<string, { user: User, analyses: FeedItem[] }>);

              // Filter groups based on search query
              const filteredGroups = Object.values(userGroups).filter(({ user, analyses }) => {
                if (!searchQuery.trim()) return true;
                
                const query = searchQuery.toLowerCase().trim();
                const usernameMatch = user.alias?.toLowerCase().includes(query) || false;
                const symbolMatch = analyses.some(a => a.symbol.toLowerCase().includes(query));
                
                return usernameMatch || symbolMatch;
              });

              // Show "no results" if search returns empty
              if (filteredGroups.length === 0 && searchQuery.trim()) {
                return (
                  <div className="bg-[#1a241f] rounded-xl p-8 text-center border border-[#2a3c33]">
                    <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">search_off</span>
                    <h3 className="text-white font-semibold mb-2">{t.noResultsFound}</h3>
                    <p className="text-[#9eb7a8] text-sm">
                      {t.noMatchingTraders.replace('{query}', searchQuery)}
                    </p>
                  </div>
                );
              }

              return filteredGroups.map(({ user: traderUser, analyses }) => (
                <div
                  key={traderUser.id}
                  className="bg-[#1a241f] rounded-xl p-4 border border-[#2a3c33]"
                  data-testid={`trader-card-${traderUser.id}`}
                >
                  {/* Trader Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#38e07b] flex items-center justify-center flex-shrink-0">
                      <span className="text-[#111714] font-bold">
                        {traderUser.alias?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {traderUser.alias || 'Anonymous'}
                      </p>
                      <p className="text-[#6a7f72] text-xs">
                        {analyses.length} {analyses.length === 1 ? t.analysis : t.analyses} {t.published}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReportUser(traderUser.id)}
                      className="p-2 text-[#6a7f72] hover:text-red-500 hover-elevate active-elevate-2 rounded-lg"
                      data-testid={`button-report-user-${traderUser.id}`}
                      title={t.reportUser}
                    >
                      <span className="material-symbols-outlined text-lg">flag</span>
                    </button>
                    <button
                      onClick={() => setLocation(`/trader/${traderUser.id}`)}
                      className="px-3 py-1.5 bg-[#29382f] text-[#38e07b] text-xs font-semibold rounded-lg hover-elevate active-elevate-2"
                      data-testid={`button-view-trader-${traderUser.id}`}
                    >
                      {t.viewProfile}
                    </button>
                  </div>

                  {/* Analysis Cards with Reactions */}
                  <div className="space-y-3">
                    {analyses.slice(0, 3).map((analysis) => (
                      <div
                        key={analysis.id}
                        className="bg-[#111714] rounded-lg p-3 border border-[#2a3c33]"
                      >
                        {/* Analysis Header */}
                        <div className="flex items-start justify-between mb-2">
                          <button
                            onClick={() => handleAnalysisClick(analysis.id)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                analysis.recommendation === "BUY"
                                  ? "bg-[#38e07b]/20 text-[#38e07b]"
                                  : "bg-red-500/20 text-red-500"
                              }`}>
                                {analysis.recommendation}
                              </span>
                              <span className="text-white font-semibold">
                                {analysis.symbol}
                              </span>
                            </div>
                            <p className="text-[#9eb7a8] text-xs mt-1 line-clamp-2">
                              {analysis.marketSentiment?.substring(0, 100)}...
                            </p>
                          </button>
                          <button
                            onClick={(e) => handleReportAnalysis(analysis.id, e)}
                            className="p-1 text-[#6a7f72] hover:text-red-500"
                            data-testid={`button-report-analysis-${analysis.id}`}
                            title="Report analysis"
                          >
                            <span className="material-symbols-outlined text-sm">flag</span>
                          </button>
                        </div>

                        {/* Timestamp */}
                        {analysis.createdAt && (
                          <p className="text-[#6a7f72] text-xs mb-2">
                            <span className="material-symbols-outlined text-xs align-middle mr-1">schedule</span>
                            {format(new Date(analysis.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        )}

                        {/* Reaction Buttons */}
                        <ReactionButtons 
                          analysisId={analysis.id} 
                          userId={userId}
                          showCounts={true}
                        />
                      </div>
                    ))}
                    {analyses.length > 3 && (
                      <button
                        onClick={() => setLocation(`/trader/${traderUser.id}`)}
                        className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-[#29382f] text-[#9eb7a8] hover-elevate active-elevate-2"
                      >
                        {t.viewMore.replace('{count}', (analyses.length - 3).toString()).replace('{item}', analyses.length - 3 === 1 ? t.analysis : t.analyses)}
                      </button>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {/* Your Reports Section */}
      {reports.length > 0 && (
        <div className="p-4 space-y-4 mt-4 border-t border-[#2a3c33]">
          <h2 className="text-white font-semibold text-lg">Your Reports</h2>
          <div className="space-y-2">
            {reports.slice(0, 3).map((report) => (
              <div
                key={report.id}
                className="bg-[#1a241f] rounded-lg p-3 border border-[#2a3c33]"
                data-testid={`report-${report.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-semibold text-sm">{report.subject}</p>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    report.status === "resolved" 
                      ? "bg-[#38e07b]/20 text-[#38e07b]" 
                      : report.status === "reviewing"
                      ? "bg-blue-500/20 text-blue-500"
                      : "bg-yellow-500/20 text-yellow-500"
                  }`}>
                    {report.status}
                  </span>
                </div>
                <p className="text-[#9eb7a8] text-xs line-clamp-2">{report.message}</p>
                <p className="text-[#6a7f72] text-xs mt-2">
                  {new Date(report.createdAt!).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        userId={userId!}
        reportedUserId={reportTarget.userId || null}
        reportedAnalysisId={reportTarget.analysisId || null}
      />

      {/* Version Guard Modal */}
      <UpdateModal />

      <BottomNav />
    </div>
  );
}
