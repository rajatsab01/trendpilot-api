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

      // Compare versions - if client version is older than server version, show mandatory update modal
      if (APP_VERSION !== data.version) {
        // Mandatory update - always show modal for version mismatch
        setShowUpdateModal(true);
      }
    } catch (error) {
      console.error("Version check error:", error);
      // Silently fail - don't disrupt user experience
    }
  };

  const handleRefresh = async () => {
    try {
      // Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      // Force hard reload
      window.location.href = window.location.href;
    } catch (error) {
      console.error("Error during refresh:", error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  return (
    <Dialog open={showUpdateModal}>
      <DialogContent 
        className="bg-[#1a1f1c] border-[#2a3530] text-white max-w-md max-h-[90vh] flex flex-col"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[#38e07b] text-2xl md:text-3xl">system_update</span>
            <DialogTitle className="text-lg md:text-xl font-bold text-white">
              Update Required
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#9eb7a8] text-center leading-relaxed text-xs md:text-sm">
            Installing the update ensures uninterrupted service, as older versions may stop working.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 md:space-y-4 py-3 md:py-4 overflow-y-auto flex-1">
          {/* Why This Update Matters */}
          <div className="bg-gradient-to-br from-[#38e07b]/10 to-[#29382f] rounded-lg md:rounded-xl p-3 md:p-4 border border-[#38e07b]/30">
            <div className="flex items-start gap-2 md:gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-xl md:text-2xl mt-0.5">stars</span>
              <div>
                <p className="text-white font-semibold text-xs md:text-sm mb-1.5 md:mb-2">What's New?</p>
                <ul className="text-[#9eb7a8] text-[10px] md:text-xs leading-relaxed space-y-0.5 md:space-y-1">
                  <li className="flex items-start gap-1.5 md:gap-2">
                    <span className="text-[#38e07b] mt-0.5">•</span>
                    <span>Enhanced chart reliability with Yahoo Finance integration</span>
                  </li>
                  <li className="flex items-start gap-1.5 md:gap-2">
                    <span className="text-[#38e07b] mt-0.5">•</span>
                    <span>Improved stability and performance</span>
                  </li>
                  <li className="flex items-start gap-1.5 md:gap-2">
                    <span className="text-[#38e07b] mt-0.5">•</span>
                    <span>Bug fixes for better user experience</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Token Safety - Most Important */}
          <div className="bg-[#29382f] rounded-lg md:rounded-xl p-3 md:p-4 space-y-1.5 md:space-y-2 border-2 border-[#38e07b]">
            <div className="flex items-start gap-2 md:gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-xl md:text-2xl mt-0.5">verified_user</span>
              <div>
                <p className="text-[#38e07b] font-bold text-sm md:text-base mb-1.5 md:mb-2">Your Data is 100% Protected</p>
                <div className="space-y-1.5 md:space-y-2">
                  <div className="flex items-start gap-1.5 md:gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-xs md:text-sm mt-0.5">check_circle</span>
                    <p className="text-white text-[10px] md:text-xs leading-relaxed">
                      All your <span className="font-semibold">tokens</span> are securely linked to your mobile number
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5 md:gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-xs md:text-sm mt-0.5">check_circle</span>
                    <p className="text-white text-[10px] md:text-xs leading-relaxed">
                      Your <span className="font-semibold">analysis history</span> remains intact
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5 md:gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-xs md:text-sm mt-0.5">check_circle</span>
                    <p className="text-white text-[10px] md:text-xs leading-relaxed">
                      Your <span className="font-semibold">saved analyses</span> are completely safe
                    </p>
                  </div>
                </div>
                <p className="text-[#9eb7a8] text-[9px] md:text-xs mt-2 md:mt-3 italic">
                  Updating won't affect any of your data. It's completely safe!
                </p>
              </div>
            </div>
          </div>

          {/* Version Info */}
          <div className="bg-[#1a1f1c] rounded-lg p-2.5 md:p-3 border border-[#2a3530]">
            <div className="flex items-center justify-between text-[10px] md:text-xs">
              <span className="text-[#6a7f72]">Your Version:</span>
              <span className="text-white font-mono">{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] md:text-xs mt-1">
              <span className="text-[#6a7f72]">Latest Version:</span>
              <span className="text-[#38e07b] font-mono font-semibold">{serverVersion}</span>
            </div>
          </div>

          {/* Update Instructions */}
          <div className="bg-[#29382f] rounded-lg md:rounded-xl p-3 md:p-4">
            <p className="text-white font-semibold text-xs md:text-sm mb-2 md:mb-3">How to Update:</p>
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-start gap-2 md:gap-3">
                <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#38e07b] text-[#111714] flex items-center justify-center text-[10px] md:text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="text-white text-[10px] md:text-xs font-medium mb-0.5 md:mb-1">Mobile App Users</p>
                  <p className="text-[#9eb7a8] text-[9px] md:text-xs leading-relaxed">
                    Visit <span className="text-[#38e07b] font-semibold">trendpilot.replit.app</span> and redownload the latest version
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:gap-3">
                <div className="flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-[#38e07b] text-[#111714] flex items-center justify-center text-[10px] md:text-xs font-bold">
                  2
                </div>
                <div>
                  <p className="text-white text-[10px] md:text-xs font-medium mb-0.5 md:mb-1">Web Users</p>
                  <p className="text-[#9eb7a8] text-[9px] md:text-xs leading-relaxed">
                    Simply click the button below to refresh and get the latest version
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Single Update Button - No Cancel */}
          <div className="pt-1 md:pt-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="w-full bg-[#38e07b] hover:bg-[#2fc76a] text-[#111714] font-bold py-3 md:py-4 px-4 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#38e07b]/20 text-sm md:text-base"
              data-testid="button-download-version"
            >
              <span className="material-symbols-outlined text-base md:text-lg">install_desktop</span>
              Install New Version
            </button>
            <p className="text-center text-[#6a7f72] text-[9px] md:text-xs mt-2 md:mt-3">
              Installing the new version prevents service interruptions
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
