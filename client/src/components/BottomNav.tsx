import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useQuery } from "@tanstack/react-query";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();
  const userId = localStorage.getItem("userId");

  // Fetch unread message count
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/messages/unread-count", userId],
    enabled: !!userId,
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const navItems = [
    { path: "/dashboard", icon: "home", label: t.home, testId: "nav-home" },
    { path: "/saved", icon: "bookmark", label: "Saved", testId: "nav-saved" },
    { path: "/community", icon: "group", label: "Community", testId: "nav-community", badge: unreadCount },
    { path: "/privacy", icon: "policy", label: t.policy || "Policy", testId: "nav-policy" },
  ];

  return (
    <div className="sticky bottom-0">
      <nav className="flex gap-2 border-t border-[#29382f] bg-[#1c2620] px-4 pb-3 pt-2">
        {navItems.map((item) => {
          const isActive = location === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-1 flex-col items-center justify-end gap-1"
              data-testid={item.testId}
            >
              <div className="flex h-8 items-center justify-center relative">
                <span
                  className={`material-symbols-outlined ${
                    isActive ? "text-[#38e07b]" : "text-[#9eb7a8]"
                  }`}
                >
                  {item.icon}
                </span>
                {item.badge && item.badge > 0 && (
                  <div className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" data-testid="badge-unread-count">
                    {item.badge > 9 ? "9+" : item.badge}
                  </div>
                )}
              </div>
              <p
                className={`text-xs font-medium leading-normal tracking-[0.015em] ${
                  isActive ? "text-[#38e07b]" : "text-[#9eb7a8]"
                }`}
              >
                {item.label}
              </p>
            </Link>
          );
        })}
      </nav>
      <div className="h-5 bg-[#1c2620]"></div>
    </div>
  );
}
