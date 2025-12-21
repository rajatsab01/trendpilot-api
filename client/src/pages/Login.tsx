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
      user_json_url?: string;
      phone_number?: string;
      phone?: string;
    }) => void;
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
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

  /* -------------------------------
     📱 VERIFY PHONE (SERVER HANDLES LOGIC)
  -------------------------------- */
  const verifyPhoneMutation = useMutation({
    mutationFn: async (payload: { userJsonUrl?: string; phoneNumber?: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-phone", payload);
      return res.json();
    },
    onSuccess: (data) => {
      if (!data?.phoneNumber) {
        toast({
          title: "Error",
          description: "Phone verification failed",
          variant: "destructive",
        });
        return;
      }

      setIsVerified(true);
      setVerifiedPhone(data.phoneNumber);

      toast({
        title: "Success",
        description: "Phone verified successfully",
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

  /* -------------------------------
     🔑 LOGIN
  -------------------------------- */
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
  });

  /* -------------------------------
     📦 LOAD Phone.Email SCRIPT
  -------------------------------- */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.phone.email/sign_in_button_v1.js";
    script.async = true;
    document.body.appendChild(script);

    window.phoneEmailListener = (userObj) => {
      console.log("📩 Phone.Email callback:", userObj);

      // Preferred path: user_json_url
      if (userObj?.user_json_url) {
        verifyPhoneMutation.mutate({ userJsonUrl: userObj.user_json_url });
        return;
      }

      // Fallback: direct phone number
      const phone = userObj?.phone_number || userObj?.phone;
      if (phone) {
        verifyPhoneMutation.mutate({ phoneNumber: phone });
        return;
      }

      toast({
        title: "Error",
        description: "Phone.Email did not return phone data",
        variant: "destructive",
      });
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
          <h1 className="text-[#38e07b] text-2xl font-bold text-center mb-2">
            TrendPilot
          </h1>
          <p className="text-[#9eb7a8] text-sm text-center mb-6">
            AI-Powered Trading Analyzer
          </p>

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
              Login
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
