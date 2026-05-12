import { redact, redactExcerpt } from "./redact";

export interface TwizzitErrorContext {
  endpoint: string;
  occurredAt: string;
  attempts: number;
}

export class TwizzitAuthError extends Error {
  readonly kind = "auth" as const;
  readonly context: TwizzitErrorContext;
  readonly status: number;

  constructor(
    message: string,
    context: TwizzitErrorContext,
    status: number,
    secrets: ReadonlyArray<string> = []
  ) {
    super(redact(message, secrets) as string);
    this.name = "TwizzitAuthError";
    this.context = redact(context, secrets) as TwizzitErrorContext;
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
    actualSummary: string,
    secrets: ReadonlyArray<string> = []
  ) {
    super(redact(message, secrets) as string);
    this.name = "TwizzitValidationError";
    this.context = redact(context, secrets) as TwizzitErrorContext;
    this.path = redact(path, secrets) as string;
    this.expectation = redact(expectation, secrets) as string;
    this.actualSummary = redactExcerpt(actualSummary, secrets);
  }
}

export class TwizzitNetworkError extends Error {
  readonly kind = "network" as const;
  readonly context: TwizzitErrorContext;
  readonly code: string;

  constructor(
    message: string,
    context: TwizzitErrorContext,
    code: string,
    secrets: ReadonlyArray<string> = []
  ) {
    super(redact(message, secrets) as string);
    this.name = "TwizzitNetworkError";
    this.context = redact(context, secrets) as TwizzitErrorContext;
    this.code = code;
  }
}

export class TwizzitRateLimitError extends Error {
  readonly kind = "rate-limit" as const;
  readonly context: TwizzitErrorContext;
  readonly retryAfterMs: number;

  constructor(
    message: string,
    context: TwizzitErrorContext,
    retryAfterMs: number,
    secrets: ReadonlyArray<string> = []
  ) {
    super(redact(message, secrets) as string);
    this.name = "TwizzitRateLimitError";
    this.context = redact(context, secrets) as TwizzitErrorContext;
    this.retryAfterMs = retryAfterMs;
  }
}

export class TwizzitServerError extends Error {
  readonly kind = "server" as const;
  readonly context: TwizzitErrorContext;
  readonly status: number;
  readonly bodyExcerpt: string;

  constructor(
    message: string,
    context: TwizzitErrorContext,
    status: number,
    bodyExcerpt: string,
    secrets: ReadonlyArray<string> = []
  ) {
    super(redact(message, secrets) as string);
    this.name = "TwizzitServerError";
    this.context = redact(context, secrets) as TwizzitErrorContext;
    this.status = status;
    this.bodyExcerpt = redactExcerpt(bodyExcerpt, secrets);
  }
}

export class TwizzitClientError extends Error {
  readonly kind = "client" as const;
  readonly context: TwizzitErrorContext;
  readonly status: number;
  readonly bodyExcerpt: string;
  readonly subkind?: "max-pages-exceeded" | "bad-pagination-arg" | "missing-organization-id";

  constructor(
    message: string,
    context: TwizzitErrorContext,
    status: number,
    bodyExcerpt: string,
    subkind?: "max-pages-exceeded" | "bad-pagination-arg" | "missing-organization-id",
    secrets: ReadonlyArray<string> = []
  ) {
    super(redact(message, secrets) as string);
    this.name = "TwizzitClientError";
    this.context = redact(context, secrets) as TwizzitErrorContext;
    this.status = status;
    this.bodyExcerpt = redactExcerpt(bodyExcerpt, secrets);
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
