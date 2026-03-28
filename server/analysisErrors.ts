/**
 * Thrown when live AI analysis cannot be produced. Never charge tokens for this path.
 */
export const ANALYSIS_UNAVAILABLE_DEFAULT =
  "Our analysis service is temporarily unavailable. Please try again in a few minutes. You have not been charged any tokens.";

export class AnalysisUnavailableError extends Error {
  readonly retryable = true;

  constructor(message: string = ANALYSIS_UNAVAILABLE_DEFAULT) {
    super(message);
    this.name = "AnalysisUnavailableError";
  }
}

export function isAnalysisUnavailableError(err: unknown): err is AnalysisUnavailableError {
  return err instanceof AnalysisUnavailableError;
}
