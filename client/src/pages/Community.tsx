import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import BottomNav from "@/components/BottomNav";
import type { Analysis, User, Report } from "@shared/schema";

type FeedItem = Analysis & { author: User };

export default function Community() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<"bug" | "feedback" | "feature_request" | "abuse">("bug");
  const [reportSubject, setReportSubject] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [alias, setAlias] = useState("");
  const [isAcceptingRules, setIsAcceptingRules] = useState(false);

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
        title: "Minimum Requirement",
        description: "You need at least 10 saved trades to access the community. Keep trading!",
        variant: "destructive",
      });
      return;
    }

    // Validate alias
    if (!alias || alias.trim().length === 0) {
      toast({
        title: "Alias Required",
        description: "Please enter a username for the community",
        variant: "destructive",
      });
      return;
    }

    if (alias.length > 10) {
      toast({
        title: "Alias Too Long",
        description: "Username must be 10 characters or less",
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
        title: "Welcome to the Community!",
        description: "You can now share and discover trading insights",
      });

      setShowRulesModal(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join community",
        variant: "destructive",
      });
    } finally {
      setIsAcceptingRules(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // VERSION CHECKPOINT
    const versionOk = await guardAction();
    if (!versionOk) return;

    if (!userId) return;

    setIsSubmitting(true);

    try {
      await apiRequest("POST", "/api/reports", {
        userId,
        type: reportType,
        subject: reportSubject,
        message: reportMessage,
      });

      toast({
        title: "Report Submitted",
        description: "Thank you! We'll review your feedback soon.",
      });

      setShowReportModal(false);
      setReportSubject("");
      setReportMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/reports", userId] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnalysisClick = (analysisId: string) => {
    setLocation(`/analyzer?analysisId=${analysisId}&fromCommunity=true`);
  };

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111714] border-b border-[#2a3c33] px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-white text-xl font-bold">Community</h1>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#29382f] text-white rounded-lg hover-elevate active-elevate-2"
              data-testid="button-report"
            >
              <span className="material-symbols-outlined text-sm">flag</span>
              <span className="text-sm">Report</span>
            </button>
          </div>
        </div>

        {/* Admin Panel Link */}
        {user?.isAdmin === 1 && (
          <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-[#38e07b]/20 to-[#29382f] rounded-xl border border-[#38e07b]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#38e07b] text-2xl">admin_panel_settings</span>
                <div>
                  <p className="text-white font-semibold text-sm">Admin Panel</p>
                  <p className="text-[#9eb7a8] text-xs">View and manage user reports</p>
                </div>
              </div>
              <button
                onClick={() => setLocation("/admin")}
                className="px-4 py-2 bg-[#38e07b] text-[#111714] font-semibold rounded-lg hover:bg-[#2fc76a] transition-colors"
                data-testid="button-admin-panel"
              >
                Open
              </button>
            </div>
          </div>
        )}

        {/* Community Feed */}
        <div className="p-4 space-y-4">
          <h2 className="text-white font-semibold text-lg">Trading Feed</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-[#9eb7a8]">Loading feed...</div>
            </div>
          ) : feed.length === 0 ? (
            <div className="bg-[#1a241f] rounded-xl p-8 text-center border border-[#2a3c33]">
              <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">group</span>
              <h3 className="text-white font-semibold mb-2">No Analyses Yet</h3>
              <p className="text-[#9eb7a8] text-sm mb-4">
                The community is growing! Published analyses will appear here
              </p>
              <button
                onClick={() => setLocation("/analyzer")}
                className="px-6 py-2 bg-[#38e07b] text-[#111714] font-semibold rounded-lg hover:bg-[#2fc76a] transition-colors"
                data-testid="button-start-analyzing"
              >
                Start Analyzing
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

                return Object.values(userGroups).map(({ user, analyses }) => (
                  <div
                    key={user.id}
                    className="bg-[#1a241f] rounded-xl p-4 border border-[#2a3c33]"
                    data-testid={`trader-card-${user.id}`}
                  >
                    {/* Trader Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#38e07b] flex items-center justify-center flex-shrink-0">
                        <span className="text-[#111714] font-bold">
                          {(user.alias || user.name).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">
                          {user.alias || user.name}
                        </p>
                        <p className="text-[#6a7f72] text-xs">
                          {analyses.length} {analyses.length === 1 ? 'analysis' : 'analyses'} published
                        </p>
                      </div>
                      <button
                        onClick={() => setLocation(`/trader/${user.id}`)}
                        className="px-3 py-1.5 bg-[#29382f] text-[#38e07b] text-xs font-semibold rounded-lg hover-elevate active-elevate-2"
                        data-testid={`button-view-trader-${user.id}`}
                      >
                        View Profile
                      </button>
                    </div>

                    {/* Analysis Chips */}
                    <div className="space-y-2">
                      <p className="text-[#9eb7a8] text-xs font-medium">Recent Analyses</p>
                      <div className="flex flex-wrap gap-2">
                        {analyses.slice(0, 6).map((analysis) => (
                          <button
                            key={analysis.id}
                            onClick={() => handleAnalysisClick(analysis.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold hover-elevate active-elevate-2 ${
                              analysis.recommendation === "BUY"
                                ? "bg-[#38e07b]/20 text-[#38e07b] border border-[#38e07b]/30"
                                : "bg-red-500/20 text-red-500 border border-red-500/30"
                            }`}
                            data-testid={`analysis-chip-${analysis.id}`}
                          >
                            {analysis.recommendation} {analysis.symbol}
                          </button>
                        ))}
                        {analyses.length > 6 && (
                          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#29382f] text-[#9eb7a8]">
                            +{analyses.length - 6} more
                          </div>
                        )}
                      </div>
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
        {showReportModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f1c] rounded-xl max-w-md w-full p-6 border border-[#2a3530]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-bold text-lg">Report Issue</h2>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-[#9eb7a8] hover:text-white"
                  data-testid="button-close-report"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full bg-[#29382f] text-white rounded-lg px-4 py-3 border border-transparent focus:ring-2 focus:ring-[#38e07b] outline-none"
                    data-testid="select-report-type"
                  >
                    <option value="bug">Bug Report</option>
                    <option value="feedback">Feedback</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="abuse">Report Abuse</option>
                  </select>
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Subject</label>
                  <input
                    type="text"
                    value={reportSubject}
                    onChange={(e) => setReportSubject(e.target.value)}
                    placeholder="Brief description"
                    required
                    className="w-full bg-[#29382f] text-white rounded-lg px-4 py-3 border border-transparent focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72]"
                    data-testid="input-report-subject"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Message</label>
                  <textarea
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    placeholder="Describe the issue in detail (min 10 characters)"
                    required
                    minLength={10}
                    rows={4}
                    className="w-full bg-[#29382f] text-white rounded-lg px-4 py-3 border border-transparent focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72] resize-none"
                    data-testid="textarea-report-message"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#38e07b] text-[#111714] font-bold py-3 rounded-lg hover:bg-[#2fc76a] transition-colors disabled:opacity-50"
                  data-testid="button-submit-report"
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Community Rules Modal */}
        {showRulesModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1f1c] rounded-xl max-w-md w-full p-6 border border-[#38e07b]">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-[#38e07b] text-3xl">group</span>
                <h2 className="text-white font-bold text-xl">Welcome to the Community</h2>
              </div>

              {/* Saved Trades Check */}
              <div className="bg-[#29382f] rounded-lg p-4 mb-4 border border-[#2a3c33]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-[#38e07b]">
                    {analyses.length >= 10 ? "check_circle" : "cancel"}
                  </span>
                  <p className="text-white font-semibold">Minimum Requirement</p>
                </div>
                <p className="text-[#9eb7a8] text-sm">
                  You have <span className="text-[#38e07b] font-bold">{analyses.length}</span> saved {analyses.length === 1 ? "trade" : "trades"}.
                  {analyses.length < 10 && ` You need ${10 - analyses.length} more to access the community.`}
                </p>
              </div>

              {/* Community Rules */}
              <div className="bg-[#29382f] rounded-lg p-4 mb-4 space-y-3">
                <h3 className="text-white font-semibold text-sm mb-3">Community Guidelines</h3>
                <div className="space-y-2 text-[#9eb7a8] text-xs">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-sm">check</span>
                    <p>Share genuine insights and trading analysis</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-sm">check</span>
                    <p>Respect other traders and their opinions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                    <p>No spam, promotional content, or market manipulation</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                    <p>No harassment, profanity, or inappropriate content</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                    <p>No guaranteed returns or financial advice claims</p>
                  </div>
                </div>
              </div>

              {/* Username Input */}
              <div className="mb-4">
                <label className="text-white text-sm font-medium mb-2 block">
                  Choose Your Username <span className="text-[#6a7f72]">(max 10 characters)</span>
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value.slice(0, 10))}
                  placeholder="TrendMaster"
                  maxLength={10}
                  className="w-full bg-[#29382f] text-white rounded-lg px-4 py-3 border border-transparent focus:ring-2 focus:ring-[#38e07b] outline-none placeholder:text-[#6a7f72]"
                  data-testid="input-community-alias"
                />
                <p className="text-[#6a7f72] text-xs mt-1">{alias.length}/10 characters</p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                <p className="text-yellow-500 text-xs">
                  <span className="material-symbols-outlined text-sm align-middle mr-1">warning</span>
                  Violation of community rules may result in account suspension or ban
                </p>
              </div>

              {/* Accept Button */}
              <button
                onClick={handleAcceptRules}
                disabled={isAcceptingRules || analyses.length < 10 || !alias.trim()}
                className="w-full bg-[#38e07b] text-[#111714] font-bold py-3 rounded-lg hover:bg-[#2fc76a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-accept-rules"
              >
                {isAcceptingRules ? "Joining..." : "I Accept - Join Community"}
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
      <UpdateModal />
    </div>
  );
}
