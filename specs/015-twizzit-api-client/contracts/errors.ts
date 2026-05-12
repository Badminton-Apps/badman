/**
 * Twizzit API Client — error contract (Phase 1 deliverable).
 *
 * Discriminated-union over all failure modes. Every variant is a real Error subclass so
 * stack traces remain useful; the `kind` field makes pattern-matching trivial.
 *
 * Redaction invariant: NO field on ANY variant may contain the bearer token, password,
 * or full Authorization header value. Enforced by test/redact.spec.ts (FR-016, SC-004).
 *
 * Spec: specs/015-twizzit-api-client/spec.md  (FR-015, FR-016)
 */

/** Common context attached to every Twizzit error. */
export interface TwizzitErrorContext {
  /** Human-readable endpoint label, e.g. "GET /contacts" or "POST /authenticate". */
  endpoint: string;
  /** ISO timestamp the failure was constructed. */
  occurredAt: string;
  /** Attempt count when this error became terminal (1 if the first attempt failed and no retry was attempted). */
  attempts: number;
}

/** Thrown when authentication or re-authentication fails. */
export declare class TwizzitAuthError extends Error {
  readonly kind: "auth";
  readonly context: TwizzitErrorContext;
  /** HTTP status of the failing response (401 in the canonical case, 403 if creds are revoked). */
  readonly status: number;
}

/** Thrown when a response payload fails zod validation. */
export declare class TwizzitValidationError extends Error {
  readonly kind: "validation";
  readonly context: TwizzitErrorContext;
  /** Dot-path into the response where validation first failed, e.g. "[0].extra-field-values[2].value.value". */
  readonly path: string;
  /** Short human-readable expectation, e.g. "expected string, got null". */
  readonly expectation: string;
  /** Truncated, redacted excerpt of the actual value (max ~200 chars). */
  readonly actualSummary: string;
}

/** Thrown on transport-level failures (ECONNRESET, DNS, timeout). */
export declare class TwizzitNetworkError extends Error {
  readonly kind: "network";
  readonly context: TwizzitErrorContext;
  /** Underlying error code when available, otherwise "UNKNOWN". */
  readonly code: string;
}

/** Thrown after the 429 retry budget is exhausted. */
export declare class TwizzitRateLimitError extends Error {
  readonly kind: "rate-limit";
  readonly context: TwizzitErrorContext;
  /** Milliseconds the final Retry-After (or computed back-off) requested. */
  readonly retryAfterMs: number;
}

/** Thrown on HTTP 5xx responses. */
export declare class TwizzitServerError extends Error {
  readonly kind: "server";
  readonly context: TwizzitErrorContext;
  readonly status: number;
  /** Redacted excerpt of the response body, max ~200 chars. */
  readonly bodyExcerpt: string;
}

/**
 * Thrown on 4xx responses that are NOT 401 (handled by retry-with-reauth) and NOT 429
 * (handled by TwizzitRateLimitError). Includes 400, 403 (when not credential-revocation),
 * 404, 422, and synthetic subkinds emitted by the lib itself (e.g. maxPages exceeded).
 */
export declare class TwizzitClientError extends Error {
  readonly kind: "client";
  readonly context: TwizzitErrorContext;
  readonly status: number;
  readonly bodyExcerpt: string;
  /** Optional internal subkind for lib-emitted client errors. */
  readonly subkind?: "max-pages-exceeded" | "bad-pagination-arg" | "missing-organization-id";
}

/** Convenience discriminated union for `catch (e) { if (e instanceof TwizzitError) …` style is NOT used. */
export type TwizzitError =
  | TwizzitAuthError
  | TwizzitValidationError
  | TwizzitNetworkError
  | TwizzitRateLimitError
  | TwizzitServerError
  | TwizzitClientError;

/** Type-guard the lib provides as a public export. */
export declare function isTwizzitError(e: unknown): e is TwizzitError;
