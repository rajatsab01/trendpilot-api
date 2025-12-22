import { useEffect, useState } from "react";

// ⛔ DO NOT USE @shared/schema here
const APP_VERSION = "1.2.5";

// ✅ USE RELATIVE IMPORTS ONLY
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export default function VersionChecker() {
  const [open, setOpen] = useState(false);
  const [serverVersion, setServerVersion] = useState("");

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const res = await fetch("/api/version");
      if (!res.ok) return;

      const data = await res.json();
      setServerVersion(data.version);

      if (data.version && data.version !== APP_VERSION) {
        setOpen(true);
      }
    } catch (err) {
      console.error("Version check failed", err);
    }
  };

  const handleRefresh = async () => {
    try {
      // Unregister service workers
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }

      // Clear caches
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // Hard reload
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-[#1a1f1c] border-[#2a3530] text-white max-w-md">

        {/* ❌ CLOSE ICON ENABLED */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-[#9eb7a8] hover:text-white"
        >
          ✕
        </button>

        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            Update Required
          </DialogTitle>
          <DialogDescription className="text-center">
            Please update to continue using TrendPilot.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="text-sm flex justify-between">
            <span>Your Version:</span>
            <span>{APP_VERSION}</span>
          </div>

          <div className="text-sm flex justify-between">
            <span>Latest Version:</span>
            <span className="text-[#38e07b]">{serverVersion}</span>
          </div>

          <button
            onClick={handleRefresh}
            className="mt-4 w-full bg-[#38e07b] text-black font-bold py-3 rounded-lg"
          >
            Install New Version
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
