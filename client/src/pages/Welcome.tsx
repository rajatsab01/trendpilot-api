import { useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const handleAgree = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#111714]">
      <header className="flex items-center justify-between p-4">
        <div className="w-8"></div>
        <h1 className="text-xl font-bold text-white">{t.appName}</h1>
        <button className="text-white" data-testid="button-help">
          <span className="material-symbols-outlined">help</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center px-6 text-center">
        <div className="flex justify-center mb-8">
          <div className="rounded-full bg-[#29382f] p-4">
            <span
              className="material-symbols-outlined text-[#38e07b]"
              style={{ fontSize: "48px" }}
            >
              auto_awesome
            </span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
          {t.aiGuidedTrading}
        </h2>
        <p className="text-[#9eb7a8] leading-relaxed max-w-lg mx-auto">
          {t.aiDescription}
        </p>
      </main>

      <footer className="p-6">
        <div className="mb-6 rounded-2xl bg-[#1c2620] p-4">
          <h3 className="text-lg font-bold text-white mb-2">{t.disclaimer}</h3>
          <p className="text-sm text-[#9eb7a8] leading-relaxed">
            {t.disclaimerText}
          </p>
        </div>
        <button
          onClick={handleAgree}
          className="w-full rounded-full bg-[#38e07b] py-4 text-center text-lg font-bold text-[#111714] hover:bg-opacity-90 transition-colors"
          data-testid="button-agree"
        >
          {t.iAgree}
        </button>
      </footer>
    </div>
  );
}
