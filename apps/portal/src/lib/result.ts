import type { ErrorCode } from "@flowfokus/api";

/** Codes from Rails, plus the few failures that happen before Rails answers. */
export type FailureCode =
  | ErrorCode
  | "access_unavailable"
  | "api_not_configured"
  | "api_unreachable"
  | "invalid_input"
  | "signed_out"
  | "unexpected_response";

export interface Failure {
  status: number;
  code: FailureCode;
  message: string;
  /** Field name to messages, from `validation_failed`. */
  details?: Record<string, string[]>;
}

/** What every portal server function returns. Errors are values, not throws. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: Failure };
