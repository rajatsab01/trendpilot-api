import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/translations";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import type { User } from "@shared/schema";
import logoImage from "@assets/logo 3_1761320611938.png";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { toast } = useToast();
  const [symbol, setSymbol] = useState("");
  const [duration, setDuration] = useState("short_term");
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCountdown, setAdCountdown] = useState(60);
  const [tokenAnimation, setTokenAnimation] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const userId = localStorage.getItem("userId");

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user", userId],
    enabled: !!userId,
  });

  // PWA install prompt handling
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Countdown timer for ad
  useEffect(() => {
    if (showAdModal && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(adCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showAdModal && adCountdown === 0) {
      // Ad finished, add tokens
      handleAdComplete();
    }
  }, [showAdModal, adCountdown]);

  const watchAdMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/watch-ad", {
        userId,
      });
      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.error || "Failed to add tokens");
      }
      return await result.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user", userId] });
      setTokenAnimation(true);
      setTimeout(() => setTokenAnimation(false), 1000);
      toast({
        title: "Tokens Added!",
        description: "You earned 2 tokens for watching the ad!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Daily Limit Reached",
        description: error.message || "Failed to add tokens",
        variant: "destructive",
      });
    },
  });

  const handleWatchAd = () => {
    setShowAdModal(true);
    setAdCountdown(60);
  };

  const handleAdComplete = () => {
    setShowAdModal(false);
    watchAdMutation.mutate();
  };

  const handleSkipAd = () => {
    setShowAdModal(false);
    setAdCountdown(60);
    toast({
      title: "Ad Skipped",
      description: "Watch the full ad to earn tokens",
    });
  };

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

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setShowSettings(false);
    toast({
      title: "Language Changed",
      description: "Language has been updated successfully",
    });
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    // Always clear the prompt regardless of outcome to prevent reuse
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const languages = [
    { code: "en" as Language, name: "English", flag: "🇬🇧" },
    { code: "es" as Language, name: "Español", flag: "🇪🇸" },
    { code: "zh" as Language, name: "中文", flag: "🇨🇳" },
    { code: "hi" as Language, name: "हिन्दी", flag: "🇮🇳" },
    { code: "ar" as Language, name: "العربية", flag: "🇸🇦" },
    { code: "fr" as Language, name: "Français", flag: "🇫🇷" },
    { code: "de" as Language, name: "Deutsch", flag: "🇩🇪" },
    { code: "pt" as Language, name: "Português", flag: "🇧🇷" },
    { code: "ru" as Language, name: "Русский", flag: "🇷🇺" },
    { code: "ja" as Language, name: "日本語", flag: "🇯🇵" },
    { code: "ko" as Language, name: "한국어", flag: "🇰🇷" },
    { code: "it" as Language, name: "Italiano", flag: "🇮🇹" },
  ];

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
          <div className="flex items-center justify-end mb-2">
            <button 
              onClick={() => setShowSettings(true)}
              className="text-white hover-elevate active-elevate-2 p-2 rounded-full" 
              data-testid="button-settings"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
          <div className="flex flex-col items-center mb-2">
            <div className="w-20 h-20 mb-2">
              <img 
                src={logoImage} 
                alt="Trend Pilot Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-[#38e07b] text-2xl font-bold leading-tight tracking-tight">
              Trend Pilot
            </h1>
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
            <p 
              className={`text-white text-base font-bold transition-all duration-500 ${
                tokenAnimation ? 'scale-150 text-[#38e07b]' : 'scale-100'
              }`}
              data-testid="text-tokens"
            >
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
              onClick={handleWatchAd}
              disabled={watchAdMutation.isPending}
              className="flex items-center justify-center rounded-full h-12 px-6 bg-[#29382f] text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-opacity-80 transition-opacity disabled:opacity-50"
              data-testid="button-watch-ad"
            >
              <span className="material-symbols-outlined mr-2">smart_display</span>
              <span className="truncate">{t.watchAd}</span>
            </button>
            
            {/* Charity Button */}
            <button
              onClick={() => setLocation("/charity")}
              className="flex items-center justify-center rounded-full h-12 px-6 bg-gradient-to-r from-[#38e07b] to-[#2ac96c] text-[#111714] text-sm font-bold leading-normal tracking-[0.015em] hover:opacity-90 transition-opacity shadow-lg"
              data-testid="button-charity"
            >
              <span className="material-symbols-outlined mr-2">favorite</span>
              <span className="truncate">{t.charityBringsLuck}</span>
            </button>
          </div>
        </main>
      </div>

      <BottomNav />

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="bg-[#1c2620] rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto mb-4 bg-[#29382f] rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-[#38e07b] text-5xl">
                  smart_display
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {adCountdown > 0 ? "Watching Ad..." : "Ad Complete!"}
              </h2>
              <p className="text-[#9eb7a8] text-sm">
                {adCountdown > 0 
                  ? "Please wait while the ad plays" 
                  : "You earned 2 tokens!"}
              </p>
            </div>

            <div className="mb-6">
              <div className="text-6xl font-bold text-[#38e07b] mb-2">
                {adCountdown}
              </div>
              <div className="text-sm text-[#9eb7a8]">seconds remaining</div>
              
              {/* Progress bar */}
              <div className="mt-4 h-2 bg-[#29382f] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#38e07b] transition-all duration-1000"
                  style={{ width: `${((60 - adCountdown) / 60) * 100}%` }}
                />
              </div>
            </div>

            {/* Demo Ad Content */}
            <div className="mb-6 p-4 bg-[#29382f] rounded-xl">
              <p className="text-white text-sm mb-2">📢 Demo Ad</p>
              <p className="text-[#9eb7a8] text-xs">
                This is a simulated ad experience. In production, real ads from Google AdSense will be displayed here.
              </p>
            </div>

            {adCountdown > 5 && (
              <button
                onClick={handleSkipAd}
                className="text-[#9eb7a8] text-sm hover:text-white transition-colors"
              >
                Skip (lose reward)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings Dialog with Language Selection and PWA Install */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="bg-[#1c2620] border-[#38e07b]/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#38e07b]">
              {t.settings || "Settings"}
            </DialogTitle>
            <DialogDescription className="text-[#9eb7a8]">
              {t.selectLanguage || "Select your preferred language"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center justify-between py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
                  lang.code === language
                    ? "bg-[#38e07b] text-[#111714]"
                    : "bg-[#29382f] text-white hover-elevate active-elevate-2"
                }`}
                data-testid={`button-change-language-${lang.code}`}
              >
                <span className="text-2xl mr-2">{lang.flag}</span>
                <span className="flex-1 text-left">{lang.name}</span>
              </button>
            ))}
          </div>
          
          {isInstallable && (
            <div className="mt-6 pt-6 border-t border-[#38e07b]/20">
              <button
                onClick={handleInstallApp}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#38e07b] text-[#111714] font-bold hover:bg-opacity-90 transition-colors"
                data-testid="button-install-app"
              >
                <span className="material-symbols-outlined">download</span>
                <span>Pin App to Home Screen</span>
              </button>
              <p className="text-xs text-[#9eb7a8] text-center mt-2">
                Install for quick access from your home screen
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
