import { Logger } from "./logger";
import { redactExcerpt } from "./redact";
import { TwizzitNetworkError, TwizzitErrorContext } from "./errors";

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
}

function makeContext(url: string): TwizzitErrorContext {
  return {
    endpoint: url,
    occurredAt: new Date().toISOString(),
    attempts: 1,
  };
}

export async function httpRequest(
  opts: HttpRequestOptions,
  redactSecrets: ReadonlyArray<string>,
  logger: Logger
): Promise<HttpResponse> {
  const { url, method, headers = {}, body, signal, fetchFn = globalThis.fetch } = opts;

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
    const code =
      err instanceof Error && "code" in err
        ? String((err as NodeJS.ErrnoException).code ?? "UNKNOWN")
        : "UNKNOWN";
    const message =
      err instanceof Error ? redactExcerpt(err.message, redactSecrets) : "Network error";
    const ctx = makeContext(url);
    logger.warn("http network error", { code, message });
    throw new TwizzitNetworkError(message, ctx, code, redactSecrets);
  }

  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    rawBody = "";
  }

  logger.debug("http response", {
    status: response.status,
    bodyExcerpt: redactExcerpt(rawBody, redactSecrets),
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
