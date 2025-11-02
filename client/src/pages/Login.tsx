import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import PWAInstallModal from "@/components/PWAInstallModal";
import trendPilotLogo from "@assets/trendpilot-logo.png";

declare global {
  interface Window {
    phoneEmailListener: (userObj: { user_json_url: string }) => void;
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  
  const {
    showInstallModal,
    incrementLoginCount,
    triggerInstallPrompt,
    handleInstall,
    handleDismiss,
  } = usePWAInstall();

  const verifyPhoneMutation = useMutation({
    mutationFn: async (userJsonUrl: string) => {
      const result = await apiRequest("POST", "/api/auth/verify-phone", {
        userJsonUrl,
      });
      return await result.json();
    },
    onSuccess: (data) => {
      setIsVerified(true);
      setVerifiedPhone(data.phoneNumber);
      toast({
        title: t.success || "Success",
        description: t.phoneVerified || "Phone number verified successfully!",
      });
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToVerifyPhone,
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest("POST", "/api/auth/login", {
        name,
        mobile: verifiedPhone,
        language,
      });
      return await result.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("loginCompleted", "true");
      
      // Increment login count and check if we should show PWA prompt
      incrementLoginCount();
      triggerInstallPrompt("login");
      
      setLocation("/welcome");
    },
    onError: () => {
      toast({
        title: t.error,
        description: t.failedToLogin,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Load Phone.Email script
    const script = document.createElement("script");
    script.src = "https://www.phone.email/sign_in_button_v1.js";
    script.async = true;
    document.body.appendChild(script);

    // Define callback function
    window.phoneEmailListener = (userObj: { user_json_url: string }) => {
  // show the received object in the browser console so you can inspect it
  // (open DevTools → Console to see this)
     console.log("phoneEmailListener fired:", userObj);
    // still call the verify API as before
     verifyPhoneMutation.mutate(userObj.user_json_url);
   };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (window.phoneEmailListener) {
        window.phoneEmailListener = undefined as any;
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && isVerified && verifiedPhone) {
      loginMutation.mutate();
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#111714]">
      <header className="flex items-center justify-between p-4">
        <button
          onClick={() => setLocation("/")}
          className="text-white"
          data-testid="button-back"
        >
          <span className="material-symbols-outlined text-3xl">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-8">
          {t.login}
        </h2>
      </header>

      <main className="flex-grow flex flex-col justify-center px-6">
        <div className="w-full max-w-md mx-auto">
          {/* Logo + TrendPilot branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <img 
                src={trendPilotLogo}
                alt="TrendPilot Logo"
                className="h-12 w-12 object-contain rounded-lg"
                data-testid="img-logo"
              />
              <h1 className="text-[#38e07b] text-2xl font-bold tracking-tight">TrendPilot</h1>
            </div>
            <p className="text-[#9eb7a8] text-sm">AI-Powered Trading Analyzer</p>
          </div>
          
          <h2 className="text-white text-2xl font-bold tracking-tight text-center mb-8">
            {t.welcomeBack}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <label className="sr-only" htmlFor="name">
                {t.name}
              </label>
              <input
                className="w-full h-14 bg-[#29382f] text-white rounded-xl border border-transparent placeholder:text-[#6a7f72] px-4 text-base focus:outline-none focus:ring-2 focus:ring-[#38e07b] transition-shadow duration-200"
                id="name"
                placeholder={t.name}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
              />
            </div>

            {!isVerified ? (
              <div className="relative">
                <label className="block text-[#6a7f72] text-sm mb-2">
                  {t.verifyPhone || "Verify your phone number"}
                </label>
                <div 
                  className="pe_signin_button" 
                  data-client-id="16614316303161384204"
                  data-testid="phone-verify-button"
                ></div>
                {verifyPhoneMutation.isPending && (
                  <p className="text-[#6a7f72] text-sm mt-2">
                    {t.verifying || "Verifying..."}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative p-4 bg-[#29382f] rounded-xl border border-[#38e07b]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38e07b]">check_circle</span>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {t.phoneVerified || "Phone Verified"}
                    </p>
                    <p className="text-[#6a7f72] text-xs">{verifiedPhone}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending || !isVerified || !name.trim()}
              className="mt-8 flex w-full items-center justify-center rounded-full h-12 px-5 bg-[#38e07b] text-[#111714] text-base font-bold leading-normal tracking-[0.015em] hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111714] focus:ring-[#38e07b] transition-all duration-300 disabled:opacity-50"
              data-testid="button-login"
            >
              <span className="truncate">
                {loginMutation.isPending ? t.loading || "Loading..." : t.login || "Login"}
              </span>
            </button>
          </form>
        </div>
      </main>

      <footer className="flex-shrink-0 py-16"></footer>
      
      <PWAInstallModal
        isOpen={showInstallModal}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
        trigger="login"
      />
    </div>
  );
}
