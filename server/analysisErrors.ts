/**
 * Thrown when live AI analysis cannot be produced. Never charge tokens for this path.
 */
export const ANALYSIS_UNAVAILABLE_DEFAULT =
  "Our analysis service is temporarily unavailable. Please try again in a few minutes. You have not been charged any tokens.";

/** Server-side only — for Render logs; never send raw codes to clients. */
export type AnalysisUnavailableReason =
  | "MISSING_PERPLEXITY_API_KEY"
  | `PERPLEXITY_HTTP_${number}`
  | "PERPLEXITY_NETWORK"
  | "PERPLEXITY_PARSE_OR_SCHEMA";

export class AnalysisUnavailableError extends Error {
  readonly retryable = true;
  /** Logged on the server (e.g. Render) to distinguish quota vs missing key vs parse. */
  readonly reasonCode?: AnalysisUnavailableReason;

  constructor(
    message: string = ANALYSIS_UNAVAILABLE_DEFAULT,
    reasonCode?: AnalysisUnavailableReason,
  ) {
    super(message);
    this.name = "AnalysisUnavailableError";
    this.reasonCode = reasonCode;
  }
}

export function isAnalysisUnavailableError(err: unknown): err is AnalysisUnavailableError {
  return err instanceof AnalysisUnavailableError;
}
