import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = (lang: "en" | "hi") => {
    setLanguage(lang);
    setLocation("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#111714] text-white">
      <header className="flex justify-end p-4">
        <button
          className="p-2 rounded-full hover-elevate active-elevate-2"
          data-testid="button-help"
        >
          <span className="material-symbols-outlined">help</span>
        </button>
      </header>

      <main className="flex flex-col items-center justify-center flex-grow text-center px-4">
        <div className="w-24 h-24 mb-6 bg-[#29382f] rounded-3xl flex items-center justify-center">
          <span className="material-symbols-outlined text-[#38e07b]" style={{ fontSize: "48px" }}>
            trending_up
          </span>
        </div>
        
        <h1 className="text-4xl font-bold mb-2 tracking-tight text-[#38e07b]">
          Trend Pilot
        </h1>
        <p className="text-sm text-[#9eb7a8] mb-8">AI Trading Assistant</p>

        <h2 className="text-2xl font-bold mb-4 tracking-tight">Welcome</h2>
        <p className="text-lg text-[#9eb7a8] mb-12 max-w-sm">
          Please select your preferred language.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => handleLanguageSelect("en")}
            className="block w-full text-center py-4 px-6 bg-[#38e07b] text-[#111714] rounded-full font-bold text-lg hover:bg-opacity-90 transition-colors"
            data-testid="button-language-english"
          >
            English
          </button>
          <button
            onClick={() => handleLanguageSelect("hi")}
            className="block w-full text-center py-4 px-6 bg-[#29382f] text-white rounded-full font-bold text-lg hover:bg-opacity-80 transition-colors"
            data-testid="button-language-hindi"
          >
            हिन्दी
          </button>
        </div>
      </main>

      <footer className="p-4 text-center">
        <p className="text-xs text-[#6a7f72] max-w-xs mx-auto">
          By continuing, you agree to our{" "}
          <a href="#" className="underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </footer>
    </div>
  );
}
