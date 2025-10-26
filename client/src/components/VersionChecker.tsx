import { useEffect, useState } from "react";
import { APP_VERSION } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VersionChecker() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [serverVersion, setServerVersion] = useState("");

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const response = await fetch("/api/version");
      if (!response.ok) {
        console.error("Failed to fetch version");
        return;
      }

      const data = await response.json();
      setServerVersion(data.version);

      // Compare versions - if client version is older than server version, show update modal
      if (APP_VERSION !== data.version) {
        // Check if user already dismissed this version update
        const lastDismissedVersion = localStorage.getItem("dismissedUpdateVersion");
        
        // Only show modal if user hasn't dismissed this specific version
        if (lastDismissedVersion !== data.version) {
          setShowUpdateModal(true);
        }
      }
    } catch (error) {
      console.error("Version check error:", error);
      // Silently fail - don't disrupt user experience
    }
  };

  const handleRefresh = () => {
    // Force refresh to get latest version
    window.location.reload();
  };

  const handleDismiss = () => {
    // Store dismissed version so we don't show again until next version
    localStorage.setItem("dismissedUpdateVersion", serverVersion);
    setShowUpdateModal(false);
  };

  return (
    <Dialog open={showUpdateModal}>
      <DialogContent 
        className="bg-[#1a1f1c] border-[#2a3530] text-white max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#38e07b] text-2xl">update</span>
            <DialogTitle className="text-xl font-bold text-white">
              Update Available
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#9eb7a8] text-center">
            A new version of Trend Pilot is available!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Version Info */}
          <div className="bg-[#29382f] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#9eb7a8] text-sm">Current Version:</span>
              <span className="text-white font-mono font-semibold text-sm">{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#9eb7a8] text-sm">Latest Version:</span>
              <span className="text-[#38e07b] font-mono font-semibold text-sm">{serverVersion}</span>
            </div>
          </div>

          {/* Token Safety Reassurance */}
          <div className="bg-[#29382f] rounded-lg p-4 space-y-2 border border-[#38e07b]/20">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#38e07b] text-lg mt-0.5">verified</span>
              <div>
                <p className="text-white font-semibold text-sm mb-1">Your Tokens Are Safe!</p>
                <p className="text-[#9eb7a8] text-xs leading-relaxed">
                  All your tokens and analysis history are securely linked to your mobile number. 
                  Refreshing or redownloading the app won't affect your balance or data.
                </p>
              </div>
            </div>
          </div>

          {/* Update Instructions */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#38e07b] text-sm mt-0.5">smartphone</span>
              <p className="text-[#9eb7a8] text-xs">
                <span className="text-white font-semibold">For Mobile App Users:</span> Please redownload 
                the latest version from trendpilot.replit.app
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[#38e07b] text-sm mt-0.5">web</span>
              <p className="text-[#9eb7a8] text-xs">
                <span className="text-white font-semibold">For Web Users:</span> Simply refresh this page 
                to get the latest features and fixes
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleRefresh}
              className="w-full bg-[#38e07b] hover:bg-[#2fc76a] text-[#111714] font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              data-testid="button-refresh-now"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Refresh Now
            </button>
            <button
              onClick={handleDismiss}
              className="w-full bg-transparent hover:bg-[#29382f] text-[#9eb7a8] font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              data-testid="button-remind-later"
            >
              Remind Me Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
