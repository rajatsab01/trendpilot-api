import { useState, useCallback } from "react";
import { APP_VERSION } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Version Guard Hook - Blocks critical actions if version is outdated
 * FAIL-CLOSED: Any version check failure blocks the action
 * Returns a guard function that checks version before allowing actions
 */
export function useVersionGuard() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [serverVersion, setServerVersion] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Guard function - Call this BEFORE any critical action
   * Returns: true if version is OK, false if outdated/error (and shows modal)
   * SECURITY: Fail-closed - ANY error blocks the action
   */
  const guardAction = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/version");
      
      // FAIL-CLOSED: Any non-OK response blocks action
      if (!response.ok) {
        console.error("Version check failed - HTTP error");
        setErrorMessage("Unable to verify app version. Please check your connection.");
        setShowUpdateModal(true);
        return false; // BLOCK action
      }

      const data = await response.json();
      setServerVersion(data.version);
      setErrorMessage(""); // Clear any previous errors

      // Check if versions match
      if (APP_VERSION !== data.version) {
        // Version mismatch - show mandatory update modal and block action
        setShowUpdateModal(true);
        return false; // BLOCK action
      }

      // Version OK - allow action
      return true;
    } catch (error) {
      // FAIL-CLOSED: Network errors or exceptions block action
      console.error("Version guard error:", error);
      setErrorMessage("Connection error. Please check your internet and retry.");
      setShowUpdateModal(true);
      return false; // BLOCK action
    }
  }, []);

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

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage("");
    
    try {
      const response = await fetch("/api/version");
      
      if (!response.ok) {
        setErrorMessage("Still unable to verify version. Please check your connection.");
        setIsRetrying(false);
        return;
      }

      const data = await response.json();
      setServerVersion(data.version);

      if (APP_VERSION === data.version) {
        // Version matches now - close modal
        setShowUpdateModal(false);
        setErrorMessage("");
      } else {
        // Still version mismatch - keep modal open
        setErrorMessage("");
      }
    } catch (error) {
      setErrorMessage("Connection failed. Please check your internet.");
    }
    
    setIsRetrying(false);
  };

  const UpdateModal = () => (
    <Dialog open={showUpdateModal}>
      <DialogContent 
        className="bg-[#1a1f1c] border-[#2a3530] text-white max-w-md max-h-[90vh] flex flex-col"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#38e07b] text-3xl">
              {errorMessage ? "wifi_off" : "block"}
            </span>
            <DialogTitle className="text-xl font-bold text-white">
              {errorMessage ? "Connection Issue" : "Update Required to Continue"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#9eb7a8] text-center leading-relaxed">
            {errorMessage || "You're using an older version. Installing the update ensures uninterrupted service, as older versions may stop working."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 md:space-y-4 py-3 md:py-4 overflow-y-auto flex-1">
          {/* Error Alert - Show when connection fails */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-xl mt-0.5">error</span>
                <div className="flex-1">
                  <p className="text-red-400 font-semibold text-sm mb-1">Network Error</p>
                  <p className="text-[#9eb7a8] text-xs leading-relaxed">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Why This Update Matters - Only show when NOT an error */}
          {!errorMessage && (
            <div className="bg-gradient-to-br from-[#38e07b]/10 to-[#29382f] rounded-xl p-4 border border-[#38e07b]/30">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#38e07b] text-2xl mt-0.5">new_releases</span>
                <div>
                  <p className="text-white font-semibold text-sm mb-2">What You're Missing:</p>
                  <ul className="text-[#9eb7a8] text-xs leading-relaxed space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-[#38e07b] mt-0.5">•</span>
                      <span>Latest features and improvements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#38e07b] mt-0.5">•</span>
                      <span>Enhanced chart reliability</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#38e07b] mt-0.5">•</span>
                      <span>Critical bug fixes and stability</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Token Safety - Most Important */}
          <div className="bg-[#29382f] rounded-xl p-4 space-y-2 border-2 border-[#38e07b]">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-2xl mt-0.5">verified_user</span>
              <div>
                <p className="text-[#38e07b] font-bold text-base mb-2">Your Data is 100% Safe</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-sm mt-0.5">check_circle</span>
                    <p className="text-white text-xs leading-relaxed">
                      All <span className="font-semibold">tokens</span> are linked to your mobile number
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#38e07b] text-sm mt-0.5">check_circle</span>
                    <p className="text-white text-xs leading-relaxed">
                      Your <span className="font-semibold">saved analyses</span> are completely safe
                    </p>
                  </div>
                </div>
                <p className="text-[#9eb7a8] text-xs mt-3 italic">
                  {errorMessage ? "Retrying won't affect your data!" : "Updating is safe and won't affect your data!"}
                </p>
              </div>
            </div>
          </div>

          {/* Version Info - Only show when NOT an error */}
          {!errorMessage && serverVersion && (
            <div className="bg-[#1a1f1c] rounded-lg p-3 border border-[#2a3530]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#6a7f72]">Your Version:</span>
                <span className="text-red-400 font-mono">{APP_VERSION}</span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-[#6a7f72]">Latest Version:</span>
                <span className="text-[#38e07b] font-mono font-semibold">{serverVersion}</span>
              </div>
            </div>
          )}

          {/* Update Instructions - Only show when NOT an error */}
          {!errorMessage && (
            <div className="bg-[#29382f] rounded-xl p-4">
              <p className="text-white font-semibold text-sm mb-3">How to Update:</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#38e07b] text-[#111714] flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium mb-1">Mobile App Users</p>
                    <p className="text-[#9eb7a8] text-xs leading-relaxed">
                      Visit <span className="text-[#38e07b] font-semibold">trendpilot.replit.app</span> and redownload
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#38e07b] text-[#111714] flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium mb-1">Web Users</p>
                    <p className="text-[#9eb7a8] text-xs leading-relaxed">
                      Click the button below to refresh
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-1 md:pt-2 space-y-2 flex-shrink-0">
            {errorMessage ? (
              // Show Retry button when there's an error
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full bg-[#38e07b] hover:bg-[#2fc76a] text-[#111714] font-bold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#38e07b]/20 disabled:opacity-50"
                data-testid="button-retry-version-check"
              >
                <span className="material-symbols-outlined text-lg">
                  {isRetrying ? "hourglass_empty" : "refresh"}
                </span>
                {isRetrying ? "Checking..." : "Retry Connection"}
              </button>
            ) : (
              // Show Update button when version mismatch
              <button
                onClick={handleRefresh}
                className="w-full bg-[#38e07b] hover:bg-[#2fc76a] text-[#111714] font-bold py-4 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#38e07b]/20"
                data-testid="button-update-now-guard"
              >
                <span className="material-symbols-outlined text-lg">install_desktop</span>
                Install New Version
              </button>
            )}
            <p className="text-center text-[#6a7f72] text-xs">
              {errorMessage ? "Please ensure you have internet access" : "Installing prevents service interruptions"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return {
    guardAction,
    UpdateModal,
  };
}
