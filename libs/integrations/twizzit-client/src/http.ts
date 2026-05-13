import { Logger } from "./logger";
import { redactExcerpt } from "./redact";
import {
  TwizzitNetworkError,
  TwizzitRateLimitError,
  TwizzitErrorContext,
  isTwizzitError,
} from "./errors";

export interface HttpResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  json<T = unknown>(): T;
}

export interface HttpRequestOptions {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  fetchFn?: typeof fetch;
  /**
   * Called with the raw response body after it is read.
   * Returns additional secrets to redact when logging the body excerpt.
   * Use when the response itself contains a new credential (e.g. a bearer token)
   * that was unknown at request time.
   */
  postParseSecrets?: (body: string) => ReadonlyArray<string>;
}

export interface HttpRetryPolicy {
  maxRateLimitRetries: number;
  maxRetryBudgetMs: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
}

function makeContext(url: string, attempts: number): TwizzitErrorContext {
  return {
    endpoint: url,
    occurredAt: new Date().toISOString(),
    attempts,
  };
}

/**
 * Parse the Retry-After header value, returning milliseconds to wait.
 * Accepts either a numeric seconds value or an HTTP-date string.
 * Returns null if the header is absent or unparseable.
 */
function parseRetryAfterMs(header: string | undefined): number | null {
  if (!header) return null;
  const seconds = Number(header.trim());
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  // Try HTTP-date
  const ts = Date.parse(header);
  if (!Number.isNaN(ts)) {
    const delta = ts - Date.now();
    return Math.max(0, delta);
  }
  return null;
}

/**
 * Raw HTTP request without retry logic. Used internally by httpRequest.
 */
async function rawHttpRequest(
  opts: HttpRequestOptions,
  redactSecrets: ReadonlyArray<string>,
  logger: Logger
): Promise<HttpResponse> {
  const {
    url,
    method,
    headers = {},
    body,
    signal,
    fetchFn = globalThis.fetch,
    postParseSecrets,
  } = opts;

  logger.debug("http request", { method, url: redactExcerpt(url, redactSecrets) });

  let response: Response;
  try {
    response = await fetchFn(url, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body,
      signal,
    });
  } catch (err: unknown) {
    // Re-throw Twizzit errors (e.g. TwizzitRateLimitError from an injected fetch wrapper)
    // without wrapping them in a TwizzitNetworkError.
    if (isTwizzitError(err)) throw err;
    const code =
      err instanceof Error && "code" in err
        ? String((err as NodeJS.ErrnoException).code ?? "UNKNOWN")
        : "UNKNOWN";
    const message =
      err instanceof Error ? redactExcerpt(err.message, redactSecrets) : "Network error";
    const ctx = makeContext(url, 1);
    logger.warn("http network error", { code, message });
    throw new TwizzitNetworkError(message, ctx, code, redactSecrets);
  }

  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    rawBody = "";
  }

  const allSecrets = postParseSecrets
    ? [...redactSecrets, ...postParseSecrets(rawBody)]
    : redactSecrets;
  logger.debug("http response", {
    status: response.status,
    bodyExcerpt: redactExcerpt(rawBody, allSecrets),
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key.toLowerCase()] = value;
  });

  const captured = rawBody;
  return {
    status: response.status,
    body: rawBody,
    headers: responseHeaders,
    json<T = unknown>(): T {
      return JSON.parse(captured) as T;
    },
  };
}

/**
 * HTTP request with optional 429 retry-with-backoff.
 * When retryPolicy is provided, honours Retry-After header (numeric seconds OR HTTP-date),
 * applies exponential back-off otherwise, bounded by maxRateLimitRetries and maxRetryBudgetMs.
 * On exhaustion throws TwizzitRateLimitError carrying retryAfterMs and attempts.
 */
export async function httpRequest(
  opts: HttpRequestOptions,
  redactSecrets: ReadonlyArray<string>,
  logger: Logger,
  retryPolicy?: HttpRetryPolicy
): Promise<HttpResponse> {
  const policy = retryPolicy ?? {
    maxRateLimitRetries: 0,
    maxRetryBudgetMs: 0,
    initialBackoffMs: 1000,
    maxBackoffMs: 30_000,
  };

  let attempts = 0;
  let backoffMs = policy.initialBackoffMs;
  const budgetStart = Date.now();

  while (true) {
    attempts++;
    const response = await rawHttpRequest(opts, redactSecrets, logger);

    if (response.status !== 429) {
      return response;
    }

    // 429 — check if we can retry
    const maxRetries = retryPolicy ? policy.maxRateLimitRetries : 0;
    if (attempts > maxRetries) {
      const retryAfterMs = parseRetryAfterMs(response.headers["retry-after"]) ?? backoffMs;
      logger.warn("rate-limit budget exhausted", {
        attempts,
        retryAfterMs,
        url: redactExcerpt(opts.url, redactSecrets),
      });
      throw new TwizzitRateLimitError(
        `Rate limited on ${opts.url} after ${attempts} attempt(s)`,
        makeContext(opts.url, attempts),
        retryAfterMs,
        redactSecrets
      );
    }

    const retryAfterMs =
      parseRetryAfterMs(response.headers["retry-after"]) ??
      Math.min(backoffMs, policy.maxBackoffMs);

    const elapsed = Date.now() - budgetStart;
    if (retryPolicy && elapsed + retryAfterMs > policy.maxRetryBudgetMs) {
      logger.warn("rate-limit budget (time) exhausted", {
        attempts,
        retryAfterMs,
        elapsed,
        maxRetryBudgetMs: policy.maxRetryBudgetMs,
      });
      throw new TwizzitRateLimitError(
        `Rate limit retry budget (${policy.maxRetryBudgetMs}ms) exhausted on ${opts.url}`,
        makeContext(opts.url, attempts),
        retryAfterMs,
        redactSecrets
      );
    }

    logger.warn("rate-limited; will retry", {
      attempt: attempts,
      maxRetries,
      retryAfterMs,
      url: redactExcerpt(opts.url, redactSecrets),
    });

    // Wait before retrying
    await new Promise<void>((resolve) => setTimeout(resolve, retryAfterMs));

    // Exponential back-off for next attempt if no Retry-After header
    backoffMs = Math.min(backoffMs * 2, policy.maxBackoffMs);
  }
}
