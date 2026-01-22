import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Language, getTranslations } from "@/lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: ReturnType<typeof getTranslations>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language") as Language;
    const validLanguages: Language[] = [
      "en", "hi", "es", "zh", "ar", "fr", "de", "pt", "ru", "ja", "ko", "it",
    ];
    return validLanguages.includes(saved) ? saved : "en";
  });

  // ✅ Ensure context stays in sync with stored language on app load
  useEffect(() => {
    const stored = localStorage.getItem("language") as Language | null;
    if (stored && stored !== language) {
      setLanguageState(stored);
      console.log("🌐 Language re-synced from storage:", stored);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
    console.log("🌐 Language set to:", lang);
  };

  const t = getTranslations(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
