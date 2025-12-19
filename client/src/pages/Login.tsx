import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";

// ✅ Relative imports only
import { useLanguage } from "../context/LanguageContext";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { usePWAInstall } from "../hooks/usePWAInstall";
import PWAInstallModal from "../components/PWAInstallModal";

declare global {
  interface Window {
    phoneEmailListener?: (userObj: { user_json_url: string }) => void;
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

  // 📱 Verify phone
  const verifyPhoneMutation = useMutation({
    mutationFn: async (userJsonUrl: string) => {
      const res = await apiRequest("POST", "/api/auth/verify-phone", {
        userJsonUrl,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (!data?.phoneNumber) {
        throw new Error("Phone number missing");
      }

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
