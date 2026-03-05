import { useLocation, Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import type { Language } from "@/lib/translations";
const trendPilotLogo = "/trendpilot-logo.png";

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("languageCompleted", "true");
    setLocation("/login");
  };

  const languages = [
    { code: "en" as Language, name: "English", flag: "🇬🇧" },
    { code: "es" as Language, name: "Español", flag: "🇪🇸" },
    { code: "zh" as Language, name: "中文", flag: "🇨🇳" },
    { code: "hi" as Language, name: "हिन्दी", flag: "🇮🇳" },
    { code: "ar" as Language, name: "العربية", flag: "🇸🇦" },
    { code: "fr" as Language, name: "Français", flag: "🇫🇷" },
    { code: "de" as Language, name: "Deutsch", flag: "🇩🇪" },
    { code: "pt" as Language, name: "Português", flag: "🇧🇷" },
    { code: "ru" as Language, name: "Русский", flag: "🇷🇺" },
    { code: "ja" as Language, name: "日本語", flag: "🇯🇵" },
    { code: "ko" as Language, name: "한국어", flag: "🇰🇷" },
    { code: "it" as Language, name: "Italiano", flag: "🇮🇹" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#111714] text-white">
      <main className="flex flex-col items-center justify-center flex-grow text-center px-4 py-8">
        <div className="w-32 h-32 mb-4 flex items-center justify-center">
          <img 
            src={logoImage} 
            alt="Trend Pilot Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        
        <h1 className="text-3xl font-bold mb-1 tracking-tight text-[#38e07b]">
          Trend Pilot
        </h1>
        <p className="text-xs text-[#9eb7a8] mb-6">AI Trading Assistant</p>

        <h2 className="text-xl font-bold mb-2 tracking-tight">Welcome</h2>
        <p className="text-sm text-[#9eb7a8] mb-8 max-w-sm">
          Please select your preferred language.
        </p>

        <div className="w-full max-w-2xl grid grid-cols-2 gap-3 px-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`flex items-center justify-between py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
                lang.code === "en"
                  ? "bg-[#38e07b] text-[#111714]"
                  : "bg-[#1c2620] text-white hover-elevate active-elevate-2"
              }`}
              data-testid={`button-language-${lang.code}`}
            >
              <span className="text-2xl mr-2">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.name}</span>
            </button>
          ))}
        </div>
      </main>

      <footer className="p-4 text-center pb-8">
        <p className="text-xs text-[#6a7f72] max-w-xs mx-auto">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline text-[#38e07b] hover:text-[#2fc76a]">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline text-[#38e07b] hover:text-[#2fc76a]">
            Privacy Policy
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
