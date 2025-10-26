import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/translations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const [showSettings, setShowSettings] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

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

  const handleAgree = () => {
    // Check if already installed or browser doesn't support PWA
    const isAppInstalled = localStorage.getItem("pwaInstalled") === "true";
    
    if (isInstallable && !isAppInstalled) {
      // Show install prompt modal
      setShowInstallPrompt(true);
    } else {
      // Go directly to dashboard
      setLocation("/dashboard");
    }
  };
  
  const handleSkipInstall = () => {
    setShowInstallPrompt(false);
    setLocation("/dashboard");
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    // Clear onboarding flags to restart flow from language screen
    localStorage.removeItem("languageCompleted");
    localStorage.removeItem("loginCompleted");
    setShowSettings(false);
    // Redirect to language screen to restart onboarding
    setLocation("/");
  };

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem("pwaInstalled", "true");
      setShowInstallPrompt(false);
      setLocation("/dashboard");
    }
    
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

  return (
    <div className="relative flex min-h-screen flex-col bg-[#111714]">
      <header className="flex items-center justify-end p-4 gap-2">
        <button 
          onClick={() => setShowSettings(true)}
          className="text-white hover-elevate active-elevate-2 p-2 rounded-full" 
          data-testid="button-settings"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
          {t.aiGuidedTrading}
        </h2>
        <p className="text-[#9eb7a8] leading-relaxed max-w-lg mx-auto">
          {t.aiDescription}
        </p>
      </main>

      <footer className="p-6">
        <div className="mb-6 rounded-2xl bg-[#1c2620] p-4">
          <h3 className="text-lg font-bold text-white mb-2">{t.disclaimer}</h3>
          <p className="text-sm text-[#9eb7a8] leading-relaxed">
            {t.disclaimerText}
          </p>
        </div>
        <button
          onClick={handleAgree}
          className="w-full rounded-full bg-[#38e07b] py-4 text-center text-lg font-bold text-[#111714] hover:bg-opacity-90 transition-colors"
          data-testid="button-agree"
        >
          {t.iAgree}
        </button>
      </footer>

      {/* Settings Dialog for Language Change */}
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
                <span>{t.pinToHomeScreen}</span>
              </button>
              <p className="text-xs text-[#9eb7a8] text-center mt-2">
                {t.quickAccessDesc}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Phase 1: Optional PWA Install Prompt (Onboarding) */}
      <Dialog open={showInstallPrompt} onOpenChange={setShowInstallPrompt}>
        <DialogContent className="bg-[#1c2620] border-[#38e07b]/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#38e07b] text-center">
              {t.installAppTitle}
            </DialogTitle>
            <DialogDescription className="text-[#9eb7a8] text-center mt-2">
              {t.installAppSubtitle}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-[#29382f] rounded-xl p-4 mb-4">
              <div className="whitespace-pre-line text-sm text-white leading-relaxed">
                {t.installAppBenefits}
              </div>
            </div>
            
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 rounded-xl bg-[#38e07b] text-[#111714] font-bold text-lg hover:bg-opacity-90 transition-colors mb-3"
              data-testid="button-install-onboarding"
            >
              <span className="material-symbols-outlined">download</span>
              <span>{t.installNow}</span>
            </button>
            
            <button
              onClick={handleSkipInstall}
              className="w-full py-3 text-[#9eb7a8] text-sm hover:text-white transition-colors"
              data-testid="button-skip-install"
            >
              {t.skipForNow}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
