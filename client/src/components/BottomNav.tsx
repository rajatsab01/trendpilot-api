import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";

export default function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: "/dashboard", icon: "home", label: t.home, testId: "nav-home" },
    { path: "/analyzer", icon: "analytics", label: t.analyzer, testId: "nav-analyzer" },
    { path: "/settings", icon: "settings", label: t.settings, testId: "nav-settings" },
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
              <div className="flex h-8 items-center justify-center">
                <span
                  className={`material-symbols-outlined ${
                    isActive ? "text-[#38e07b]" : "text-[#9eb7a8]"
                  }`}
                >
                  {item.icon}
                </span>
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
