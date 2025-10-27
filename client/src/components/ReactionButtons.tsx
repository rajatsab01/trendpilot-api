import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useVersionGuard } from "@/hooks/useVersionGuard";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from "@shared/schema";

type ReactionType = "like" | "heart" | "dislike";

interface ReactionButtonsProps {
  analysisId: string;
  userId: string | null;
  showCounts?: boolean;
}

interface ReactionCounts {
  like: number;
  heart: number;
  dislike: number;
}

interface UserReaction {
  id: string;
  userId: string;
  analysisId: string;
  reactionType: ReactionType;
  createdAt: Date;
}

export default function ReactionButtons({ analysisId, userId, showCounts = true }: ReactionButtonsProps) {
  const { toast } = useToast();
  const { guardAction } = useVersionGuard();
  const [optimisticReaction, setOptimisticReaction] = useState<ReactionType | null>(null);

  // Fetch reaction counts
  const { data: counts, isLoading: countsLoading } = useQuery<ReactionCounts>({
    queryKey: ["/api/reactions/counts", analysisId],
    enabled: !!analysisId,
  });

  // Fetch user's reaction
  const { data: userReaction } = useQuery<UserReaction | null>({
    queryKey: ["/api/reactions/user", userId, analysisId],
    enabled: !!userId && !!analysisId,
  });

  // Add reaction mutation
  const addReactionMutation = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      return apiRequest("POST", "/api/reactions", {
        userId,
        analysisId,
        reactionType,
        appVersion: APP_VERSION,
      });
    },
    onMutate: async (reactionType) => {
      // Optimistic update
      setOptimisticReaction(reactionType);
    },
    onSuccess: async () => {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/reactions/counts", analysisId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/reactions/user", userId, analysisId] });
      setOptimisticReaction(null);
    },
    onError: (error: any) => {
      setOptimisticReaction(null);
      toast({
        title: "Error",
        description: error.message || "Failed to add reaction",
        variant: "destructive",
      });
    },
  });

  // Remove reaction mutation
  const removeReactionMutation = useMutation({
    mutationFn: async (reactionType: ReactionType) => {
      return apiRequest("DELETE", `/api/reactions/${userId}/${analysisId}/${reactionType}`, {
        appVersion: APP_VERSION,
      });
    },
    onMutate: async () => {
      // Optimistic update
      setOptimisticReaction(null);
    },
    onSuccess: async () => {
      // Invalidate and refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/reactions/counts", analysisId] });
      await queryClient.invalidateQueries({ queryKey: ["/api/reactions/user", userId, analysisId] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove reaction",
        variant: "destructive",
      });
    },
  });

  const handleReaction = async (reactionType: ReactionType) => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please log in to react to analyses",
        variant: "destructive",
      });
      return;
    }

    const versionOk = await guardAction();
    if (!versionOk) return;

    const currentReaction = optimisticReaction || userReaction?.reactionType;
    
    if (currentReaction === reactionType) {
      // Remove reaction if clicking the same one
      removeReactionMutation.mutate(reactionType);
    } else {
      // Add or change reaction
      addReactionMutation.mutate(reactionType);
    }
  };

  const currentReaction = optimisticReaction || userReaction?.reactionType;
  const displayCounts = counts || { like: 0, heart: 0, dislike: 0 };

  if (countsLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-[#6a7f72] text-xs">Loading reactions...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3" data-testid="reaction-buttons">
      {/* Like Button */}
      <button
        onClick={() => handleReaction("like")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover-elevate active-elevate-2 ${
          currentReaction === "like"
            ? "bg-[#38e07b]/20 border border-[#38e07b]"
            : "bg-[#1a241f] border border-[#2a3c33]"
        }`}
        data-testid="button-reaction-like"
        disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
      >
        <span className={`text-xl ${currentReaction === "like" ? "text-[#38e07b]" : "text-[#6a7f72]"}`}>
          👍
        </span>
        {showCounts && (
          <span className={`text-xs font-semibold ${currentReaction === "like" ? "text-[#38e07b]" : "text-[#9eb7a8]"}`}>
            {displayCounts.like}
          </span>
        )}
      </button>

      {/* Heart Button */}
      <button
        onClick={() => handleReaction("heart")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover-elevate active-elevate-2 ${
          currentReaction === "heart"
            ? "bg-red-500/20 border border-red-500"
            : "bg-[#1a241f] border border-[#2a3c33]"
        }`}
        data-testid="button-reaction-heart"
        disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
      >
        <span className={`text-xl ${currentReaction === "heart" ? "text-red-500" : "text-[#6a7f72]"}`}>
          ❤️
        </span>
        {showCounts && (
          <span className={`text-xs font-semibold ${currentReaction === "heart" ? "text-red-500" : "text-[#9eb7a8]"}`}>
            {displayCounts.heart}
          </span>
        )}
      </button>

      {/* Dislike Button */}
      <button
        onClick={() => handleReaction("dislike")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover-elevate active-elevate-2 ${
          currentReaction === "dislike"
            ? "bg-[#6a7f72]/20 border border-[#6a7f72]"
            : "bg-[#1a241f] border border-[#2a3c33]"
        }`}
        data-testid="button-reaction-dislike"
        disabled={addReactionMutation.isPending || removeReactionMutation.isPending}
      >
        <span className={`text-xl ${currentReaction === "dislike" ? "text-[#6a7f72]" : "text-[#6a7f72]"}`}>
          👎
        </span>
        {showCounts && (
          <span className={`text-xs font-semibold ${currentReaction === "dislike" ? "text-white" : "text-[#9eb7a8]"}`}>
            {displayCounts.dislike}
          </span>
        )}
      </button>
    </div>
  );
}
