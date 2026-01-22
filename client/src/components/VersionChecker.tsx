import { useEffect, useState } from "react";
import { APP_VERSION } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function VersionChecker() {
  const [open, setOpen] = useState(false);
  const [serverVersion, setServerVersion] = useState("");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler as any);
    checkVersion();

    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
    };
  }, []);

  const checkVersion = async () => {
    try {
      const response = await fetch("/api/version", { cache: "no-store" });
      if (!response.ok) return;

      const data = await response.json();
      setServerVersion(data.version);

      if (APP_VERSION !== data.version) {
        setOpen(true);
      }
    } catch {
      // silent
    }
  };

  const hardRefresh = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }

      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }

      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  const handleInstall = async () => {
    // If PWA install prompt exists → show it
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      // after install attempt, refresh once
      await hardRefresh();
      return;
    }

    // Otherwise → do hard refresh (web users)
    await hardRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="bg-[#1a1f1c] border-[#2a3530] text-white max-w-md max-h-[90vh] flex flex-col"
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span
              className="material-symbols-outlined text-[#38e07b] text-2xl md:text-3xl"
              aria-hidden="true"
            >
              system_update
            </span>
            <DialogTitle className="text-lg md:text-xl font-bold text-white">
              Update Required
            </DialogTitle>
          </div>
          <DialogDescription className="text-[#9eb7a8] text-center leading-relaxed text-xs md:text-sm">
            Installing the update ensures uninterrupted service, as older versions may stop working.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 md:space-y-4 py-3 md:py-4 overflow-y-auto flex-1">
          <div className="bg-[#1a1f1c] rounded-lg p-2.5 md:p-3 border border-[#2a3530]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#6a7f72]">Your Version:</span>
              <span className="text-white font-mono">{APP_VERSION}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[#6a7f72]">Latest Version:</span>
              <span className="text-[#38e07b] font-mono font-semibold">
                {serverVersion || "—"}
              </span>
            </div>
          </div>

          <div className="pt-1 md:pt-2 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="w-full bg-[#38e07b] hover:bg-[#2fc76a] focus:outline-none focus:ring-2 focus:ring-[#38e07b] focus:ring-offset-2 focus:ring-offset-[#1a1f1c] text-[#111714] font-bold py-3 md:py-4 px-4 rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#38e07b]/20 text-sm md:text-base"
              data-testid="button-download-version"
            >
              <span className="material-symbols-outlined text-base md:text-lg" aria-hidden="true">
                install_desktop
              </span>
              Install New Version
            </button>

            {/* Optional close button (if you want mandatory, tell me and I’ll lock it) */}
            <button
              onClick={() => setOpen(false)}
              className="w-full mt-2 text-xs text-[#9eb7a8] hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
