import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { usePWAInstall } from "../hooks/usePWAInstall";
import PWAInstallModal from "../components/PWAInstallModal";

declare global {
  interface Window {
    phoneEmailListener?: (userObj: {
      phone_number?: string;
    }) => void;
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

  /* --------------------------------------------------
     📱 VERIFY PHONE (Render-safe)
  -------------------------------------------------- */
  const verifyPhoneMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-phone", {
        phoneNumber,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setIsVerified(true);
      setVerifiedPhone(data.phoneNumber);

      toast({
        title: "Success",
        description: "Phone number verified successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to verify phone number",
        variant: "destructive",
      });
    },
  });

  /* --------------------------------------------------
     🔑 LOGIN
  -------------------------------------------------- */
  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", {
        name,
        mobile: verifiedPhone,
        language,
      });
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("loginCompleted", "true");

      incrementLoginCount();
      triggerInstallPrompt("login");

      setLocation("/welcome");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Login failed",
        variant: "destructive",
      });
    },
  });

  /* --------------------------------------------------
     📦 LOAD Phone.Email SCRIPT
  -------------------------------------------------- */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.phone.email/sign_in_button_v1.js";
    script.async = true;
    document.body.appendChild(script);

    window.phoneEmailListener = (userObj) => {
      console.log("Phone.Email callback:", userObj);

      if (!userObj?.phone_number) {
        toast({
          title: "Error",
          description: "Phone number not received",
          variant: "destructive",
        });
        return;
      }

      verifyPhoneMutation.mutate(userObj.phone_number);
    };

    return () => {
      document.body.removeChild(script);
      delete window.phoneEmailListener;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && isVerified && verifiedPhone) {
      loginMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <header className="p-4 text-center text-white font-bold">
        Login
      </header>

      <main className="flex-grow flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <img
              src="/assets/trendpilot-logo.png"
              alt="TrendPilot"
              className="h-14 w-14 mb-2"
            />
            <h1 className="text-[#38e07b] text-2xl font-bold">TrendPilot</h1>
            <p className="text-[#9eb7a8] text-sm">
              AI-Powered Trading Analyzer
            </p>
          </div>

          <h2 className="text-white text-xl text-center mb-6">
            Welcome back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              className="w-full h-12 rounded px-4 bg-[#29382f] text-white"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {!isVerified ? (
              <div>
                <p className="text-sm text-[#6a7f72] mb-2">
                  Verify your phone number
                </p>
                <div
                  className="pe_signin_button"
                  data-client-id="16614316303161384204"
                />
              </div>
            ) : (
              <div className="p-3 border border-[#38e07b] rounded text-sm text-white">
                Phone verified: {verifiedPhone}
              </div>
            )}

            <button
              type="submit"
              disabled={!isVerified || loginMutation.isPending}
              className="w-full h-12 rounded-full bg-[#38e07b] text-black font-bold disabled:opacity-50"
            >
              {loginMutation.isPending ? "Logging in…" : "Login"}
            </button>
          </form>
        </div>
      </main>

      <PWAInstallModal
        isOpen={showInstallModal}
        onInstall={handleInstall}
        onDismiss={handleDismiss}
        trigger="login"
      />
    </div>
  );
}
