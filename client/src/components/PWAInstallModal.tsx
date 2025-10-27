import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PWAInstallModalProps {
  isOpen: boolean;
  onInstall: (trigger: "login" | "enlightenMe") => void;
  onDismiss: (trigger: "login" | "enlightenMe") => void;
  trigger?: "login" | "enlightenMe";
}

export default function PWAInstallModal({
  isOpen,
  onInstall,
  onDismiss,
  trigger = "login",
}: PWAInstallModalProps) {
  const title =
    trigger === "login"
      ? "Welcome Back! Install Trend Pilot"
      : "Loving Trend Pilot? Install the App!";

  const description =
    trigger === "login"
      ? "Install Trend Pilot for instant access, offline support, and a native app experience. Takes just 2 seconds!"
      : "You've been using Trend Pilot actively! Install it for faster access and work offline anytime.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss(trigger)}>
      <DialogContent className="bg-[#1c2620] border-[#38e07b]/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#38e07b] text-center flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl">install_mobile</span>
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#9eb7a8] text-center text-base mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          <div className="bg-[#111714] rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-xl">
                bolt
              </span>
              <div>
                <p className="text-white font-medium text-sm">Lightning Fast</p>
                <p className="text-[#9eb7a8] text-xs">
                  Launch instantly from your home screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-xl">
                cloud_off
              </span>
              <div>
                <p className="text-white font-medium text-sm">Works Offline</p>
                <p className="text-[#9eb7a8] text-xs">
                  Access saved analyses without internet
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[#38e07b] text-xl">
                notifications_active
              </span>
              <div>
                <p className="text-white font-medium text-sm">Stay Updated</p>
                <p className="text-[#9eb7a8] text-xs">
                  Get instant notifications (coming soon)
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onDismiss(trigger)}
              className="flex-1 bg-[#29382f] text-white py-3 rounded-xl font-semibold hover-elevate active-elevate-2"
              data-testid="button-dismiss-pwa"
            >
              Maybe Later
            </button>
            <button
              onClick={() => onInstall(trigger)}
              className="flex-1 bg-[#38e07b] text-[#111714] py-3 rounded-xl font-semibold hover:bg-[#2fc76a] transition-colors"
              data-testid="button-install-pwa"
            >
              Install Now
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
