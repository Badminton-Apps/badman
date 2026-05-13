/**
 * Twizzit API Client — error contract (Phase 1 deliverable).
 *
 * Discriminated-union over all failure modes. Every variant is a real Error subclass so
 * stack traces remain useful; the `kind` field makes pattern-matching trivial.
 *
 * Construction guarantee: error messages constructed by the lib must NOT string-interpolate
 * the password or bearer token. bodyExcerpt is truncated to ~200 chars but NOT deep-scrubbed
 * for secrets. The deep redact() pipeline previously mandated here was removed 2026-05-13 —
 * see research.md R12 for the rationale (Twizzit does not echo credentials in responses, and
 * the consumer worker handles platform-level structured-logging redaction).
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
  /** Truncated excerpt of the actual value (max ~200 chars). Not secret-scrubbed; see file header. */
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
  /** Truncated excerpt of the response body (max ~200 chars). Not secret-scrubbed; see file header. */
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
  /** Truncated excerpt (max ~200 chars). Not secret-scrubbed; see file header. */
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
