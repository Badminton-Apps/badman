import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { Logger } from "./logger";
import { TwizzitClientRetryPolicy } from "./client";
import {
  TwizzitAuthError,
  TwizzitClientError,
  TwizzitNetworkError,
  TwizzitRateLimitError,
  TwizzitServerError,
  TwizzitErrorContext,
} from "./errors";

/**
 * Thin shape the lib exposes for its HTTP layer. We alias to `AxiosInstance` because
 * the existing implementation uses axios's interceptor and `paramsSerializer` features,
 * and tests bind `axios-mock-adapter` directly to the instance. The alias keeps the
 * implementation detail off the lib's name surface (no "Axios" in our function or
 * config-type names) while preserving the structural shape callers and tests rely on.
 *
 * If a future swap to a different HTTP library is desired, this alias is the single
 * type to change; consumers and endpoints reference `HttpClient`, not `AxiosInstance`.
 */
export type HttpClient = AxiosInstance;

export interface HttpClientOptions {
  baseUrl: string;
  getToken: () => string | undefined;
  getOrganizationId: () => number | undefined;
  retryPolicy: Required<TwizzitClientRetryPolicy>;
  logger: Logger;
  onUnauthorized: () => Promise<void>;
}

declare module "axios" {
  interface InternalAxiosRequestConfig {
    __twizzitAuthRetried?: boolean;
    __twizzit429Attempts?: number;
  }
}

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

function parseRetryAfterMs(header: string | undefined): number | null {
  if (!header) return null;
  const seconds = Number(header.trim());
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }
  const ts = Date.parse(header);
  if (!Number.isNaN(ts)) {
    return Math.max(0, ts - Date.now());
  }
  return null;
}

export function truncate(value: unknown, maxLen = 200): string {
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function sleep(ms: number): Promise<void> {
  return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Construct a configured HTTP client for the Twizzit API:
 * - baseURL + paramsSerializer producing kebab-bracket arrays (organization-ids[]=N)
 * - Request interceptor injecting Authorization + organization-ids[]
 * - Response interceptor handling 401-then-reauth-retry-once, 429 + Retry-After,
 *   and classifying remaining failures into TwizzitError variants.
 */
export function createHttpClient(opts: HttpClientOptions): HttpClient {
  const { baseUrl, getToken, getOrganizationId, retryPolicy, logger, onUnauthorized } = opts;

  const instance = axios.create({
    baseURL: baseUrl,
    paramsSerializer: {
      serialize(params: Record<string, unknown>): string {
        const parts: string[] = [];
        for (const [key, value] of Object.entries(params)) {
          if (value === undefined || value === null) continue;
          if (Array.isArray(value)) {
            for (const item of value) {
              parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`);
            }
          } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
          }
        }
        return parts.join("&");
      },
    },
    timeout: 30_000,
  });

  // Request interceptor: inject Authorization + organization-ids[]
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    if (url !== "/authenticate") {
      const token = getToken();
      if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
      }
      const orgId = getOrganizationId();
      if (orgId !== undefined) {
        config.params = { ...(config.params ?? {}), "organization-ids": [orgId] };
      }
    }
    logger.debug("http request", { method: config.method?.toUpperCase(), url });
    return config;
  });

  // Response interceptor: classify error responses into TwizzitError variants.
  instance.interceptors.response.use(
    (response) => {
      logger.debug("http response", { status: response.status });
      return response;
    },
    async (error: unknown): Promise<never | unknown> => {
      if (
        error instanceof TwizzitAuthError ||
        error instanceof TwizzitRateLimitError ||
        error instanceof TwizzitServerError ||
        error instanceof TwizzitClientError ||
        error instanceof TwizzitNetworkError
      ) {
        throw error;
      }

      if (!axios.isAxiosError(error)) {
        throw error;
      }

      const config = error.config;
      const status = error.response?.status;
      const endpointUrl = config?.url ?? "unknown";

      // Transport-level failure (no response).
      if (!error.response || status === undefined) {
        const code = (error.code as string | undefined) ?? "UNKNOWN";
        throw new TwizzitNetworkError(
          error.message || "Network error",
          makeContext(endpointUrl, 1),
          code
        );
      }

      // 429 — Retry-After honoured, bounded by maxRateLimitRetries.
      // Must be checked BEFORE the /authenticate guard so a rate-limited auth call
      // throws TwizzitRateLimitError, not TwizzitAuthError.
      if (status === 429 && config) {
        const attempts = (config.__twizzit429Attempts ?? 0) + 1;
        config.__twizzit429Attempts = attempts;
        const retryAfterHeader = error.response.headers?.["retry-after"] as string | undefined;
        const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
        if (attempts > retryPolicy.maxRateLimitRetries) {
          const ms = retryAfterMs ?? retryPolicy.initialBackoffMs;
          throw new TwizzitRateLimitError(
            `Rate limited on ${endpointUrl} after ${attempts} attempt(s)`,
            makeContext(endpointUrl, attempts),
            ms
          );
        }
        const waitMs =
          retryAfterMs ??
          Math.min(
            retryPolicy.initialBackoffMs * Math.pow(2, attempts - 1),
            retryPolicy.maxBackoffMs
          );
        logger.warn("429; retrying", { url: endpointUrl, attempts, waitMs });
        await sleep(waitMs);
        return instance.request(config);
      }

      // Any auth-endpoint failure (non-429 4xx) is an auth error — never re-auth a /authenticate call.
      if (endpointUrl === "/authenticate" && status >= 400 && status < 500) {
        throw new TwizzitAuthError(
          `Authentication failed (HTTP ${status})`,
          makeContext(endpointUrl, 1),
          status
        );
      }

      // 401 on any other endpoint — re-auth once and retry the original request.
      if (status === 401 && config) {
        if (!config.__twizzitAuthRetried) {
          logger.warn("401 received, re-authenticating once", { url: endpointUrl });
          config.__twizzitAuthRetried = true;
          try {
            await onUnauthorized();
          } catch {
            throw new TwizzitAuthError(
              "Re-authentication failed after 401",
              makeContext(endpointUrl, 2),
              401
            );
          }
          return instance.request(config);
        }
        throw new TwizzitAuthError(
          `Double 401 on ${endpointUrl}, giving up`,
          makeContext(endpointUrl, 2),
          401
        );
      }

      if (status >= 500) {
        throw new TwizzitServerError(
          `Server error on ${endpointUrl} (${status})`,
          makeContext(endpointUrl, 1),
          status,
          truncate(error.response.data)
        );
      }

      if (status >= 400) {
        throw new TwizzitClientError(
          `Client error on ${endpointUrl} (${status})`,
          makeContext(endpointUrl, 1),
          status,
          truncate(error.response.data)
        );
      }

      throw error;
    }
  );

  return instance;
}
