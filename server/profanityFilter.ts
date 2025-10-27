/**
 * Profanity Filter for Trend Pilot Community Content
 * Protects messages, analyses, usernames, and reports from inappropriate content
 */

// Comprehensive bad words list (English - expandable for 12 languages)
const BAD_WORDS = [
  // Profanity
  "fuck", "shit", "bitch", "asshole", "bastard", "damn", "hell",
  "crap", "piss", "dick", "cock", "pussy", "cunt", "whore",
  "slut", "fag", "nigger", "nigga", "retard", "retarded",
  
  // Variants and obfuscations
  "f*ck", "sh*t", "b*tch", "a$$", "a**", "f***", "s***",
  "fck", "fuk", "shyt", "azz", "biotch", "beatch",
  
  // Spam/scam indicators
  "viagra", "cialis", "bitcoin", "crypto", "forex", "doubledown",
  "guaranteed", "risk-free", "100% profit", "get rich",
  
  // Trading scams
  "pump and dump", "insider tip", "guaranteed returns",
  "risk free profit", "secret strategy", "holy grail",
];

// Pattern-based detection for obfuscated words
const OBFUSCATION_PATTERNS = [
  { pattern: /f+[u*@#$%]+c+k+/gi, word: "profanity" },
  { pattern: /s+[h*@#$%]+[i*@#$%]+t+/gi, word: "profanity" },
  { pattern: /b+[i*@#$%]+t+c+h+/gi, word: "profanity" },
  { pattern: /a+[s*@#$%]+s+/gi, word: "profanity" },
  { pattern: /d+[i*@#$%]+c+k+/gi, word: "profanity" },
  { pattern: /c+[u*@#$%]+n+t+/gi, word: "profanity" },
];

// Repeated character spam detection (e.g., "aaaaaaa", "!!!!!!!")
const SPAM_PATTERNS = [
  { pattern: /(.)\1{10,}/g, description: "excessive character repetition" },
  { pattern: /[A-Z]{20,}/g, description: "excessive caps" },
];

export interface ProfanityCheckResult {
  isClean: boolean;
  detectedWords: string[];
  detectedPatterns: string[];
  sanitizedText?: string;
}

/**
 * Check text for profanity and inappropriate content
 */
export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text || typeof text !== "string") {
    return { isClean: true, detectedWords: [], detectedPatterns: [] };
  }

  const lowerText = text.toLowerCase();
  const detectedWords: string[] = [];
  const detectedPatterns: string[] = [];

  // Check against bad words list
  for (const badWord of BAD_WORDS) {
    // Word boundary check to avoid false positives (e.g., "assassin" shouldn't match "ass")
    const wordRegex = new RegExp(`\\b${badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (wordRegex.test(text)) {
      detectedWords.push(badWord);
    }
  }

  // Check obfuscation patterns
  for (const { pattern, word } of OBFUSCATION_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(`obfuscated ${word}`);
    }
  }

  // Check spam patterns
  for (const { pattern, description } of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      detectedPatterns.push(description);
    }
  }

  const isClean = detectedWords.length === 0 && detectedPatterns.length === 0;

  return {
    isClean,
    detectedWords,
    detectedPatterns,
  };
}

/**
 * Sanitize text by replacing profanity with asterisks (for display purposes)
 * NOTE: We reject profane content rather than sanitizing, but this is available if needed
 */
export function sanitizeText(text: string): string {
  if (!text) return text;

  let sanitized = text;

  // Replace bad words with asterisks
  for (const badWord of BAD_WORDS) {
    const wordRegex = new RegExp(`\\b${badWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    sanitized = sanitized.replace(wordRegex, (match) => '*'.repeat(match.length));
  }

  // Replace obfuscated patterns
  for (const { pattern } of OBFUSCATION_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => '*'.repeat(match.length));
  }

  return sanitized;
}

/**
 * Validate content and throw error if profanity detected
 * This is the main function to use in API routes
 */
export function validateContent(
  text: string,
  fieldName: string = "content"
): void {
  const result = checkProfanity(text);

  if (!result.isClean) {
    const issues = [
      ...result.detectedWords.map(w => `"${w}"`),
      ...result.detectedPatterns,
    ];

    throw new Error(
      `${fieldName} contains inappropriate content: ${issues.join(", ")}. ` +
      `Please keep the community respectful and professional.`
    );
  }
}

/**
 * Validate username/alias for appropriate content
 * Stricter rules: no profanity, no spam patterns
 */
export function validateUsername(username: string): void {
  if (!username || username.trim().length === 0) {
    throw new Error("Username cannot be empty");
  }

  if (username.length > 10) {
    throw new Error("Username must be 10 characters or less");
  }

  // Check for profanity
  validateContent(username, "Username");

  // Additional username rules
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new Error("Username can only contain letters, numbers, and underscores");
  }

  if (/^\d+$/.test(username)) {
    throw new Error("Username cannot be only numbers");
  }
}

/**
 * Validate analysis content before publishing
 */
export function validateAnalysisContent(
  symbol: string,
  recommendation?: string
): void {
  // Symbol validation
  if (symbol && symbol.length > 0) {
    validateContent(symbol, "Trading symbol");
  }

  // Recommendation validation (if provided)
  if (recommendation && recommendation.length > 0) {
    validateContent(recommendation, "Analysis recommendation");
  }
}
