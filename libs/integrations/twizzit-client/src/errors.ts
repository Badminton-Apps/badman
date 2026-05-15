export interface TwizzitErrorContext {
  endpoint: string;
  occurredAt: string;
  attempts: number;
}

export class TwizzitAuthError extends Error {
  readonly kind = "auth" as const;
  readonly context: TwizzitErrorContext;
  readonly status: number;

  constructor(message: string, context: TwizzitErrorContext, status: number) {
    super(message);
    this.name = "TwizzitAuthError";
    this.context = context;
    this.status = status;
  }
}

export class TwizzitValidationError extends Error {
  readonly kind = "validation" as const;
  readonly context: TwizzitErrorContext;
  readonly path: string;
  readonly expectation: string;
  readonly actualSummary: string;

  constructor(
    message: string,
    context: TwizzitErrorContext,
    path: string,
    expectation: string,
    actualSummary: string
  ) {
    super(message);
    this.name = "TwizzitValidationError";
    this.context = context;
    this.path = path;
    this.expectation = expectation;
    this.actualSummary = actualSummary;
  }
}

export class TwizzitNetworkError extends Error {
  readonly kind = "network" as const;
  readonly context: TwizzitErrorContext;
  readonly code: string;

  constructor(message: string, context: TwizzitErrorContext, code: string) {
    super(message);
    this.name = "TwizzitNetworkError";
    this.context = context;
    this.code = code;
  }
}

export class TwizzitRateLimitError extends Error {
  readonly kind = "rate-limit" as const;
  readonly context: TwizzitErrorContext;
  readonly retryAfterMs: number;

  constructor(message: string, context: TwizzitErrorContext, retryAfterMs: number) {
    super(message);
    this.name = "TwizzitRateLimitError";
    this.context = context;
    this.retryAfterMs = retryAfterMs;
  }
}

export class TwizzitServerError extends Error {
  readonly kind = "server" as const;
  readonly context: TwizzitErrorContext;
  readonly status: number;
  readonly bodyExcerpt: string;

  constructor(message: string, context: TwizzitErrorContext, status: number, bodyExcerpt: string) {
    super(message);
    this.name = "TwizzitServerError";
    this.context = context;
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

export class TwizzitClientError extends Error {
  readonly kind = "client" as const;
  readonly context: TwizzitErrorContext;
  readonly status: number;
  readonly bodyExcerpt: string;
  readonly subkind?: "pagination-runaway" | "bad-pagination-arg" | "missing-organization-id";

  constructor(
    message: string,
    context: TwizzitErrorContext,
    status: number,
    bodyExcerpt: string,
    subkind?: "pagination-runaway" | "bad-pagination-arg" | "missing-organization-id"
  ) {
    super(message);
    this.name = "TwizzitClientError";
    this.context = context;
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
    this.subkind = subkind;
  }
}

export type TwizzitError =
  | TwizzitAuthError
  | TwizzitValidationError
  | TwizzitNetworkError
  | TwizzitRateLimitError
  | TwizzitServerError
  | TwizzitClientError;

export function isTwizzitError(e: unknown): e is TwizzitError {
  return (
    e instanceof TwizzitAuthError ||
    e instanceof TwizzitValidationError ||
    e instanceof TwizzitNetworkError ||
    e instanceof TwizzitRateLimitError ||
    e instanceof TwizzitServerError ||
    e instanceof TwizzitClientError
  );
}
