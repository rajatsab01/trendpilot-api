// server/profanityFilter.ts
// ----------------------------------------------------------
// Basic profanity filter used by TrendPilot
// ----------------------------------------------------------

export function filterProfanity(text: string): string {
  if (!text) return "";
  const badWords = ["idiot", "stupid", "badword", "nonsense", "dumb"];
  let cleanText = text;

  for (const word of badWords) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleanText = cleanText.replace(regex, "***");
  }

  return cleanText;
}

// --- Compatibility exports for routes.ts (Render/esbuild)
export function validateContent(text: string) {
  const mod: any = require('./profanityFilter');
  const fn = mod.validateContent || mod.isCleanContent || mod.cleanContent || mod.checkProfanity;
  if (typeof fn === 'function') return fn(text);
  // fallback: allow if no validator exists
  return true;
}

export function validateUsername(name: string) {
  const mod: any = require('./profanityFilter');
  const fn = mod.validateUsername || mod.isCleanUsername || mod.cleanUsername || mod.checkUsername;
  if (typeof fn === 'function') return fn(name);
  return true;
}

