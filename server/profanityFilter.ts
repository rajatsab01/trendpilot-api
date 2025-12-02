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
