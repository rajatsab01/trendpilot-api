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
  const [open, setOpen] = useState(false);
  const [serverVersion, setServerVersion] = useState("");

  useEffect(() => {
    checkVersion();
  }, []);

  async function checkVersion() {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      setServerVersion(data.version);

      if (APP_VERSION !== data.version) {
        setOpen(true);
      }
    } catch {
      // fail silently
    }
  }

  async function forceUpdate() {
    try {
      // 1. Unregister service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }

      // 2. Clear all caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }

      // 3. Hard reload with cache busting
      window.location.replace(`/?v=${Date.now()}`);
    } catch {
      window.location.reload();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="bg-[#1a1f1c] border-[#2a3530] text-white max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-center">
            Update Required
          </DialogTitle>
          <DialogDescription className="text-center text-[#9eb7a8]">
            Please update to continue using TrendPilot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-[#9eb7a8]">
            <div className="flex justify-between">
              <span>Your version</span>
              <span>{APP_VERSION}</span>
            </div>
            <div className="flex justify-between">
              <span>Latest version</span>
              <span className="text-[#38e07b]">{serverVersion}</span>
            </div>
          </div>

          <button
            onClick={forceUpdate}
            className="w-full bg-[#38e07b] hover:bg-[#2fc76a] text-black font-bold py-3 rounded-lg"
          >
            Install New Version
          </button>

          {/* OPTIONAL close */}
          <button
            onClick={() => setOpen(false)}
            className="w-full text-xs text-[#6a7f72]"
          >
            Close (not recommended)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
