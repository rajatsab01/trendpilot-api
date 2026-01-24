// server/profanityFilter.ts
// ----------------------------------------------------------
// Basic profanity filter + validators required by routes.ts
// ----------------------------------------------------------

const BAD_WORDS = ["idiot", "stupid", "badword", "nonsense", "dumb"];

export function filterProfanity(text: string): string {
  if (!text) return "";
  let cleanText = text;

  for (const word of BAD_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    cleanText = cleanText.replace(regex, "***");
  }

  return cleanText;
}

/**
 * Used by routes.ts
 * Returns true if content is acceptable.
 */
export function validateContent(text: string): boolean {
  if (!text) return true;
  const cleaned = filterProfanity(text);
  // If profanity was replaced, we treat it as invalid
  return cleaned === text;
}

/**
 * Used by routes.ts
 * Returns true if username is acceptable.
 */
export function validateUsername(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  const cleaned = filterProfanity(trimmed);
  return cleaned === trimmed;
}
