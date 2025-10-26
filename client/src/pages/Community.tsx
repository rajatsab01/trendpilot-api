import { useState } from "react";
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

  const userId = localStorage.getItem("userId");

  // Fetch user data to check if admin
  const { data: user } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
  });

  // Fetch community feed
  const { data: feed = [], isLoading } = useQuery<FeedItem[]>({
    queryKey: ["/api/community/feed", userId],
    enabled: !!userId,
  });

  // Fetch user's reports
  const { data: reports = [] } = useQuery<Report[]>({
    queryKey: ["/api/reports", userId],
    enabled: !!userId,
  });

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
                Follow traders to see their published analyses here
              </p>
              <button
                onClick={() => setLocation("/saved")}
                className="px-6 py-2 bg-[#38e07b] text-[#111714] font-semibold rounded-lg hover:bg-[#2fc76a] transition-colors"
                data-testid="button-discover-traders"
              >
                Discover Traders
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleAnalysisClick(item.id)}
                  className="bg-[#1a241f] rounded-xl p-4 border border-[#2a3c33] hover-elevate active-elevate-2 cursor-pointer"
                  data-testid={`feed-item-${item.id}`}
                >
                  {/* Author Info */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#38e07b] flex items-center justify-center">
                      <span className="text-[#111714] font-bold text-sm">
                        {item.author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{item.author.name}</p>
                      <p className="text-[#6a7f72] text-xs">
                        {new Date(item.createdAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.recommendation === "BUY" 
                        ? "bg-[#38e07b]/20 text-[#38e07b]" 
                        : "bg-red-500/20 text-red-500"
                    }`}>
                      {item.recommendation}
                    </span>
                  </div>

                  {/* Analysis Info */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[#6a7f72] text-xs">Symbol</p>
                      <p className="text-white font-bold">{item.symbol}</p>
                    </div>
                    <div>
                      <p className="text-[#6a7f72] text-xs">Timeframe</p>
                      <p className="text-white font-semibold capitalize text-sm">{item.duration.replace("_", " ")}</p>
                    </div>
                  </div>

                  {/* Confidence & Sentiment */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#38e07b] text-sm">speed</span>
                      <span className="text-white text-sm font-semibold">{item.confidence}%</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.sentiment === "Bullish" 
                        ? "bg-[#38e07b]/20 text-[#38e07b]" 
                        : "bg-red-500/20 text-red-500"
                    }`}>
                      {item.sentiment}
                    </div>
                  </div>
                </div>
              ))}
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
      </div>

      <BottomNav />
      <UpdateModal />
    </div>
  );
}
