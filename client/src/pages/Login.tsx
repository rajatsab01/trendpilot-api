import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { usePWAInstall } from "../hooks/usePWAInstall";
import PWAInstallModal from "../components/PWAInstallModal";

declare global {
  interface Window {
    phoneEmailListener?: (userObj: any) => void;
  }
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  const {
    showInstallModal,
    incrementLoginCount,
    triggerInstallPrompt,
    handleInstall,
    handleDismiss,
  } = usePWAInstall();

  /* -------------------------------
     VERIFY PHONE
  -------------------------------- */
  const verifyPhoneMutation = useMutation({
    mutationFn: async (payload: {
      phoneNumber?: string;
      userJsonUrl?: string;
    }) => {
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
      setVerifiedPhone(data.phoneNumber);
      setIsVerified(true);
      toast({ title: "Success", description: "Phone verified" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Phone verification failed",
        variant: "destructive",
      });
    },
  });

  /* -------------------------------
     LOGIN
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
     Phone.Email Loader
  -------------------------------- */
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.phone.email/sign_in_button_v1.js";
    script.async = true;
    document.body.appendChild(script);

    window.phoneEmailListener = (userObj: any) => {
      console.log("📦 Phone.Email payload:", userObj);

      if (userObj?.user_json_url) {
        verifyPhoneMutation.mutate({
          userJsonUrl: userObj.user_json_url,
        });
        return;
      }

      const phone = userObj?.phone_number || userObj?.phone;
      if (phone) {
        verifyPhoneMutation.mutate({ phoneNumber: phone });
        return;
      }

      toast({
        title: "Error",
        description: "Phone not received from Phone.Email",
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
    if (name && isVerified) loginMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-[#111714] flex flex-col">
      <header className="p-4 text-white text-center font-bold">Login</header>

      <main className="flex-grow flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <h1 className="text-[#38e07b] text-2xl text-center font-bold mb-2">
            TrendPilot
          </h1>
          <p className="text-[#9eb7a8] text-center mb-6">
            AI-Powered Trading Analyzer
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full h-12 px-4 rounded bg-[#29382f] text-white"
            />

            {!isVerified ? (
              <div>
                <p className="text-[#6a7f72] text-sm mb-2">
                  Verify your phone number
                </p>
                <div
                  className="pe_signin_button"
                  data-client-id="16614316303161384204"
                />
              </div>
            ) : (
              <div className="p-3 border border-[#38e07b] text-white rounded">
                Verified: {verifiedPhone}
              </div>
            )}

            <button
              type="submit"
              disabled={!isVerified}
              className="w-full h-12 bg-[#38e07b] rounded-full font-bold text-black"
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
