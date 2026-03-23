import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import { useLanguage } from "@/context/LanguageContext";
import BottomNav from "@/components/BottomNav";
import ReportModal from "@/components/ReportModal";
import type { Analysis, User } from "@shared/schema";
import { APP_VERSION } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { communityDisplayName } from "@/lib/utils";

type FeedItem = Analysis & { author: User };

type TraderProfile = {
  user: {
    id: string;
    name: string;
    alias: string | null;
    isBanned: number;
    lastSeen: string | null;
  };
  stats: {
    followers: number;
    following: number;
    publishedAnalyses: number;
  };
  relationship: {
    isFollowing: boolean;
    isBlocked: boolean;
  };
};

export default function TraderProfile({ params }: { params?: { traderId?: string } }) {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/trader/:traderId");
  const { toast } = useToast();
  const { guardAction, UpdateModal } = useVersionGuard();
  const { t } = useLanguage();
  const [showReportModal, setShowReportModal] = useState(false);

  const userId = localStorage.getItem("userId");
  const traderId = params?.traderId ?? routeParams?.traderId ?? "";

  // Fetch trader profile
  const { data: profile, isLoading: profileLoading } = useQuery<TraderProfile>({
    queryKey: ["/api/community/user", traderId, userId],
    queryFn: async () => {
      const response = await fetch(`/api/community/user/${traderId}?currentUserId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch profile");
      return response.json();
    },
    enabled: !!userId && !!traderId,
  });

  // Fetch trader's published analyses
  const { data: analyses = [], isLoading: analysesLoading } = useQuery<FeedItem[]>({
    queryKey: ["/api/community/user", traderId, "analyses"],
    enabled: !!traderId,
  });

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async ({ action }: { action: "follow" | "unfollow" }) => {
      return apiRequest("POST", `/api/community/${action}`, {
        followerId: userId,
        followingId: traderId,
        appVersion: APP_VERSION,
      });
    },
    onSuccess: async (_, { action }) => {
      // Invalidate profile cache with correct key (includes userId)
      await queryClient.invalidateQueries({ queryKey: ["/api/community/user", traderId, userId] });
      
      toast({
        title: t.success,
        description: action === "follow" ? t.followingTrader : t.unfollowedTrader,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    },
  });

  // Block/Unblock mutation
  const blockMutation = useMutation({
    mutationFn: async ({ action }: { action: "block" | "unblock" }) => {
      return apiRequest("POST", `/api/community/${action}`, {
        blockerId: userId,
        blockedId: traderId,
        appVersion: APP_VERSION,
      });
    },
    onSuccess: async (_, { action }) => {
      // Invalidate profile cache with correct key (includes userId)
      await queryClient.invalidateQueries({ queryKey: ["/api/community/user", traderId, userId] });
      
      toast({
        title: t.success,
        description: action === "block" ? t.blockedTrader : t.unblockedTrader,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update block status",
        variant: "destructive",
      });
    },
  });

  // Check if trader is pinned
  const { data: isPinned = false } = useQuery<boolean>({
    queryKey: ["/api/community/pinned", userId, traderId],
    enabled: !!userId && !!traderId && userId !== traderId,
  });

  // Pin/Unpin mutation
  const pinMutation = useMutation({
    mutationFn: async ({ action }: { action: "pin" | "unpin" }) => {
      if (action === "pin") {
        return apiRequest("POST", "/api/community/pin", {
          userId,
          traderId,
          appVersion: APP_VERSION,
        });
      } else {
        return apiRequest("DELETE", `/api/community/pin/${userId}/${traderId}`, {
          appVersion: APP_VERSION,
        });
      }
    },
    onSuccess: async (_, { action }) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/community/pinned", userId, traderId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/community/pinned-traders", userId] });
      
      toast({
        title: "Success",
        description: action === "pin" ? "Pinned trader for quick access" : "Unpinned trader",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pin status",
        variant: "destructive",
      });
    },
  });

  const handleFollow = async () => {
    const versionOk = await guardAction();
    if (!versionOk) return;

    const action = profile?.relationship.isFollowing ? "unfollow" : "follow";
    followMutation.mutate({ action });
  };

  const handleBlock = async () => {
    const versionOk = await guardAction();
    if (!versionOk) return;

    const action = profile?.relationship.isBlocked ? "unblock" : "block";
    blockMutation.mutate({ action });
  };

  const handlePin = async () => {
    const versionOk = await guardAction();
    if (!versionOk) return;

    const action = isPinned ? "unpin" : "pin";
    pinMutation.mutate({ action });
  };

  const handleMessage = async () => {
    const versionOk = await guardAction();
    if (!versionOk) return;

    setLocation(`/messages/${traderId}`);
  };

  const displayName = communityDisplayName(profile?.user);
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col pb-20">
      <UpdateModal />

      {/* Header */}
      <div className="bg-[#1a241f] border-b border-[#2a3c33] p-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setLocation("/community")}
          className="text-white"
          data-testid="button-back"
        >
          <span className="material-symbols-outlined text-2xl">arrow_back</span>
        </button>
        <h1 className="text-white font-semibold text-lg">{t.traderProfile}</h1>
        {userId !== traderId && (
          <button
            onClick={() => setShowReportModal(true)}
            className="text-[#6a7f72] hover:text-red-500 hover-elevate active-elevate-2 p-1 rounded-lg"
            data-testid="button-report-user"
            title={t.reportUser}
          >
            <span className="material-symbols-outlined text-xl">flag</span>
          </button>
        )}
        {userId === traderId && <div className="w-6" />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {profileLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[#9eb7a8]">{t.loadingProfile}</div>
          </div>
        ) : !profile ? (
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">person_off</span>
            <h3 className="text-white font-semibold mb-2">{t.traderNotFound}</h3>
            <p className="text-[#9eb7a8] text-sm mb-4">
              {t.traderNotFoundDesc}
            </p>
            <button
              onClick={() => setLocation("/community")}
              className="bg-[#38e07b] text-[#111714] px-6 py-2 rounded-xl font-semibold"
              data-testid="button-back-to-community"
            >
              {t.backToCommunity}
            </button>
          </div>
        ) : (
          <div className="pb-4">
            {/* Instagram-style: cover strip + overlapping avatar + stats + actions */}
            <div className="relative">
              <div className="h-28 bg-gradient-to-br from-[#1c3028] via-[#111714] to-[#0d1512] border-b border-[#2a3c33]" />
              <div className="px-4 -mt-10 flex flex-col items-stretch">
                <div className="flex items-end justify-between gap-3">
                  <div className="w-[88px] h-[88px] rounded-full bg-[#111714] p-1 ring-2 ring-[#38e07b]/40 shadow-lg shrink-0">
                    <div className="w-full h-full rounded-full bg-[#38e07b]/20 flex items-center justify-center">
                      <span className="text-[#38e07b] text-3xl font-bold">{avatarLetter}</span>
                    </div>
                  </div>
                  {userId !== traderId && (
                    <div className="flex flex-wrap gap-2 justify-end pb-1">
                      <button
                        type="button"
                        onClick={handleFollow}
                        disabled={followMutation.isPending || profile.relationship.isBlocked}
                        className={`px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 ${
                          profile.relationship.isFollowing
                            ? "bg-[#2a3c33] text-white border border-[#3d5248]"
                            : "bg-[#38e07b] text-[#111714]"
                        }`}
                        data-testid="button-follow"
                      >
                        {profile.relationship.isFollowing ? t.unfollow : t.follow}
                      </button>
                      <button
                        type="button"
                        onClick={handleMessage}
                        disabled={profile.relationship.isBlocked}
                        className="px-4 py-2 rounded-full text-sm font-semibold bg-[#2a3c33] text-white border border-[#3d5248] disabled:opacity-50"
                        data-testid="button-message"
                      >
                        {t.message}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 space-y-1">
                  <h2 className="text-white font-bold text-xl tracking-tight">{displayName}</h2>
                  {profile.user.alias ? (
                    <p className="text-[#9eb7a8] text-sm">@{profile.user.alias}</p>
                  ) : null}
                  {profile.user.isBanned === 1 && (
                    <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-md">
                      {t.banned}
                    </span>
                  )}
                </div>

                <div className="flex justify-around py-4 mt-2 border-y border-[#2a3c33] text-center">
                  <div>
                    <div className="text-white font-bold text-lg leading-tight">{profile.stats.publishedAnalyses}</div>
                    <div className="text-[#9eb7a8] text-xs uppercase tracking-wide">{t.analyses}</div>
                  </div>
                  <div className="w-px bg-[#2a3c33] self-stretch my-1" />
                  <div>
                    <div className="text-white font-bold text-lg leading-tight">{profile.stats.followers}</div>
                    <div className="text-[#9eb7a8] text-xs uppercase tracking-wide">{t.followers}</div>
                  </div>
                  <div className="w-px bg-[#2a3c33] self-stretch my-1" />
                  <div>
                    <div className="text-white font-bold text-lg leading-tight">{profile.stats.following}</div>
                    <div className="text-[#9eb7a8] text-xs uppercase tracking-wide">{t.following}</div>
                  </div>
                </div>

                {userId !== traderId && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <button
                      type="button"
                      onClick={handlePin}
                      disabled={pinMutation.isPending || profile.relationship.isBlocked}
                      className={`py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50 ${
                        isPinned
                          ? "bg-[#38e07b]/15 text-[#38e07b] border border-[#38e07b]/50"
                          : "bg-[#1a241f] text-white border border-[#2a3c33]"
                      }`}
                      data-testid="button-pin"
                    >
                      <span className="material-symbols-outlined text-lg">push_pin</span>
                      {isPinned ? t.pinned : t.pin}
                    </button>
                    <button
                      type="button"
                      onClick={handleBlock}
                      disabled={blockMutation.isPending}
                      className="py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/30"
                      data-testid="button-block"
                    >
                      {profile.relationship.isBlocked ? t.unblock : t.block}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 mt-6">
              <div className="flex items-center gap-2 mb-3 border-b border-[#2a3c33] pb-2">
                <span className="material-symbols-outlined text-[#38e07b] text-xl">grid_view</span>
                <h3 className="text-white font-semibold">{t.publishedAnalyses}</h3>
              </div>

              {analysesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-[#9eb7a8]">{t.loadingAnalyses}</div>
                </div>
              ) : analyses.length === 0 ? (
                <div className="bg-[#1a241f] rounded-xl p-8 text-center border border-[#2a3c33]">
                  <span className="material-symbols-outlined text-[#6a7f72] text-5xl mb-3 block">analytics</span>
                  <h3 className="text-white font-semibold mb-2">{t.noPublishedAnalyses}</h3>
                  <p className="text-[#9eb7a8] text-sm">{t.noPublishedAnalysesDesc}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {analyses.map((analysis) => (
                    <button
                      type="button"
                      key={analysis.id}
                      onClick={() => setLocation(`/dashboard?analysisId=${analysis.id}&fromCommunity=true`)}
                      className="bg-[#1a241f] rounded-xl p-3 border border-[#2a3c33] text-left hover:border-[#38e07b]/45 hover:bg-[#1f2a24] transition-colors min-h-[120px] flex flex-col"
                      data-testid={`analysis-card-${analysis.id}`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-2">
                        <span className="text-white font-bold text-sm truncate">{analysis.correctedSymbol || analysis.symbol}</span>
                        <span
                          className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            analysis.recommendation === "BUY"
                              ? "bg-[#38e07b]/20 text-[#38e07b]"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {analysis.recommendation}
                        </span>
                      </div>
                      <p className="text-[#9eb7a8] text-xs line-clamp-2 flex-1">
                        {analysis.assetName || analysis.instrumentName || analysis.market}
                      </p>
                      <p className="text-[#6a7f72] text-[10px] mt-2">
                        {analysis.createdAt
                          ? formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })
                          : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        userId={userId!}
        reportedUserId={traderId}
        defaultType="abuse_user"
        title="Report User"
      />

      <BottomNav />
    </div>
  );
}
