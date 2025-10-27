import { useState, useEffect } from "react";
import { APP_VERSION } from "@shared/schema";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  // Listen for beforeinstallprompt event
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

  // Check if app is already installed
  const isAppInstalled = () => {
    return localStorage.getItem("pwaInstalled") === "true";
  };

  // Track login count per version
  const incrementLoginCount = () => {
    const key = `loginCount_v${APP_VERSION}`;
    const count = parseInt(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, count.toString());
    return count;
  };

  const getLoginCount = () => {
    const key = `loginCount_v${APP_VERSION}`;
    return parseInt(localStorage.getItem(key) || "0");
  };

  // Track Enlighten Me button presses per version
  const incrementEnlightenMeCount = () => {
    const key = `enlightenMeCount_v${APP_VERSION}`;
    const count = parseInt(localStorage.getItem(key) || "0") + 1;
    localStorage.setItem(key, count.toString());
    return count;
  };

  const getEnlightenMeCount = () => {
    const key = `enlightenMeCount_v${APP_VERSION}`;
    return parseInt(localStorage.getItem(key) || "0");
  };

  // Check if we should show install prompt
  const shouldShowInstallPrompt = (trigger: "login" | "enlightenMe") => {
    if (isAppInstalled() || !isInstallable) {
      return false;
    }

    const promptShownKey = `pwaPromptShown_v${APP_VERSION}_${trigger}`;
    const promptShown = localStorage.getItem(promptShownKey) === "true";
    
    if (promptShown) {
      return false;
    }

    if (trigger === "login") {
      return getLoginCount() === 2;
    } else {
      return getEnlightenMeCount() === 3;
    }
  };

  // Mark prompt as shown for this version and trigger
  const markPromptAsShown = (trigger: "login" | "enlightenMe") => {
    const key = `pwaPromptShown_v${APP_VERSION}_${trigger}`;
    localStorage.setItem(key, "true");
  };

  // Trigger install prompt
  const triggerInstallPrompt = async (trigger: "login" | "enlightenMe") => {
    // Only show if installable and should show
    if (shouldShowInstallPrompt(trigger) && isInstallable) {
      setShowInstallModal(true);
    }
  };

  // Handle install
  const handleInstall = async (trigger: "login" | "enlightenMe") => {
    if (!deferredPrompt) {
      setShowInstallModal(false);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem("pwaInstalled", "true");
    }

    // Mark prompt as shown only after user interacted
    markPromptAsShown(trigger);
    setDeferredPrompt(null);
    setShowInstallModal(false);
  };

  // Handle dismiss
  const handleDismiss = (trigger: "login" | "enlightenMe") => {
    // Mark prompt as shown when user dismisses
    markPromptAsShown(trigger);
    setShowInstallModal(false);
  };

  return {
    showInstallModal,
    isInstallable,
    isAppInstalled: isAppInstalled(),
    incrementLoginCount,
    incrementEnlightenMeCount,
    triggerInstallPrompt,
    handleInstall,
    handleDismiss,
  };
}
