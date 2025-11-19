// server/translations.ts

export const SUPPORTED_LANGS = [
  "en", // English
  "zh", // Chinese (Simplified)
  "hi", // Hindi
  "es", // Spanish
  "pt", // Portuguese
  "ru", // Russian
  "ja", // Japanese
  "ko", // Korean
  "de", // German
  "fr", // French
  "it", // Italian
  "ar", // Arabic
] as const;

export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export const LANG_METADATA: Record<
  SupportedLang,
  { promptName: string; uiLabel: string }
> = {
  en: { promptName: "English",            uiLabel: "English" },
  zh: { promptName: "Simplified Chinese", uiLabel: "简体中文" },
  hi: { promptName: "Hindi",              uiLabel: "हिन्दी" },
  es: { promptName: "Spanish",            uiLabel: "Español" },
  pt: { promptName: "Portuguese",         uiLabel: "Português" },
  ru: { promptName: "Russian",            uiLabel: "Русский" },
  ja: { promptName: "Japanese",           uiLabel: "日本語" },
  ko: { promptName: "Korean",             uiLabel: "한국어" },
  de: { promptName: "German",             uiLabel: "Deutsch" },
  fr: { promptName: "French",             uiLabel: "Français" },
  it: { promptName: "Italian",            uiLabel: "Italiano" },
  ar: { promptName: "Arabic",             uiLabel: "العربية" },
};

// Turn "hi-IN" or "zh-CN" into "hi" / "zh"
export function normalizeLangCode(raw?: string | null): SupportedLang {
  if (!raw) return "en";
  const base = raw.split("-")[0].toLowerCase();
  if ((SUPPORTED_LANGS as readonly string[]).includes(base)) {
    return base as SupportedLang;
  }
  return "en";
}

/**
 * For building the Perplexity system prompt.
 */
export function getPromptLang(raw?: string | null): {
  code: SupportedLang;
  name: string;
} {
  const code = normalizeLangCode(raw);
  return { code, name: LANG_METADATA[code].promptName };
}
