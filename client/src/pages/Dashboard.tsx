import { useState } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import type { User } from "@shared/schema";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("");
  const [duration, setDuration] = useState("short_term");

  const userId = localStorage.getItem("userId");

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
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
        title: "Error",
        description: error.message || "Failed to analyze symbol. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!symbol.trim()) {
      toast({
        title: "Error",
        description: "Please enter a financial symbol",
        variant: "destructive",
      });
      return;
    }

    if (!user || user.tokens < 2) {
      toast({
        title: "Insufficient Tokens",
        description: "You need at least 2 tokens to perform analysis",
        variant: "destructive",
      });
      return;
    }

    analyzeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111714] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <div className="flex flex-col flex-1">
        <header className="flex flex-col p-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12"></div>
            <h1 className="text-[#38e07b] text-2xl font-bold leading-tight tracking-tight flex-1 text-center">
              Trend Pilot
            </h1>
            <div className="flex w-12 items-center justify-end">
              <button
                onClick={() => setLocation("/settings")}
                className="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-white hover-elevate active-elevate-2"
                data-testid="button-settings"
              >
                <span className="material-symbols-outlined text-white">settings</span>
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-[#9eb7a8]">{t.home}</p>
        </header>

        <main className="flex-1 px-4 py-6 space-y-6">
          <div className="space-y-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium text-[#9eb7a8] mb-2">
                {t.financialSymbol}
              </span>
              <input
                className="flex w-full h-14 rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#38e07b] border-none bg-[#29382f] placeholder:text-[#6a7f72] px-4 text-base font-normal leading-normal"
                placeholder={t.symbolPlaceholder}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                data-testid="input-symbol"
              />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium text-[#9eb7a8] mb-2">
                {t.tradeType}
              </span>
              <select
                className="flex w-full h-14 rounded-xl text-white focus:outline-0 focus:ring-2 focus:ring-[#38e07b] border-none bg-[#29382f] px-4 text-base font-normal leading-normal appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239eb7a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: "right 0.5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                  paddingRight: "2.5rem",
                }}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                data-testid="select-duration"
              >
                <option value="scalping">{t.scalping}</option>
                <option value="short_term">{t.shortTerm}</option>
                <option value="long_term">{t.longTerm}</option>
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between bg-[#29382f] rounded-xl p-4">
            <p className="text-[#9eb7a8] text-sm font-medium leading-normal">
              {t.yourTokens}
            </p>
            <p className="text-white text-base font-bold" data-testid="text-tokens">
              {user?.tokens ?? 0}/20
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-6 bg-[#38e07b] text-[#111714] text-base font-bold leading-normal tracking-[0.015em] hover:bg-opacity-90 transition-opacity disabled:opacity-50"
              data-testid="button-enlighten"
            >
              <span className="truncate">
                {analyzeMutation.isPending ? "Analyzing..." : t.enlightenMe}
              </span>
            </button>
            <p className="text-[#9eb7a8] text-xs font-normal leading-normal text-center">
              {t.tokenFee}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => setLocation("/buy-tokens")}
              className="flex items-center justify-center rounded-full h-12 px-6 bg-[#29382f] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-opacity-80 transition-opacity"
              data-testid="button-buy-tokens"
            >
              <span className="material-symbols-outlined mr-2">shopping_cart</span>
              <span className="truncate">{t.buyTokens}</span>
            </button>
            <button
              className="flex items-center justify-center rounded-full h-12 px-6 bg-[#29382f] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-opacity-80 transition-opacity"
              data-testid="button-watch-ad"
            >
              <span className="material-symbols-outlined mr-2">smart_display</span>
              <span className="truncate">{t.watchAd}</span>
            </button>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
