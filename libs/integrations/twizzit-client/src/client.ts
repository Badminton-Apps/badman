import { Logger, noopLogger } from "./logger";
import {
  TwizzitAuthError,
  TwizzitClientError,
  TwizzitErrorContext,
  TwizzitRateLimitError,
} from "./errors";
import { authenticate } from "./endpoints/authenticate";
import { getOrganizations } from "./endpoints/organizations";
import { getContacts } from "./endpoints/contacts";
import { getMemberships } from "./endpoints/memberships";
import { getMembershipTypes } from "./endpoints/membership-types";
import { getExtraFields } from "./endpoints/extra-fields";
import { Organization } from "./schemas/organization";
import { Contact } from "./schemas/contact";
import { Membership } from "./schemas/membership";
import { MembershipType } from "./schemas/membership-type";
import { ExtraField } from "./schemas/extra-field";
import { FederationContactSource, ContactsQuery, MembershipsQuery } from "./seam";
import { HttpRetryPolicy } from "./http";

export interface TwizzitClientCredentials {
  username: string;
  password: string;
}

export interface TwizzitClientRetryPolicy {
  maxRateLimitRetries?: number;
  maxRetryBudgetMs?: number;
  maxBackoffMs?: number;
  initialBackoffMs?: number;
}

export interface TwizzitClientConfig {
  credentials: TwizzitClientCredentials;
  baseUrl?: string;
  organizationId?: number;
  retry?: TwizzitClientRetryPolicy;
  logger?: Logger;
  fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://app.twizzit.com/v2/api";

interface SessionState {
  token: string | null;
  createdOn: number | null;
  validTill: number | null;
  organizationId: number | null;
}

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return {
    endpoint,
    occurredAt: new Date().toISOString(),
    attempts,
  };
}

/**
 * Parse the Retry-After header value (numeric seconds or HTTP-date) into milliseconds.
 * Returns null if absent or unparseable.
 */
function parseRetryAfterMs(header: string | undefined): number | null {
  if (!header) return null;
  const seconds = Number(header.trim());
  if (!Number.isNaN(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const ts = Date.parse(header);
  if (!Number.isNaN(ts)) return Math.max(0, ts - Date.now());
  return null;
}

/**
 * Wraps a fetch function with 429 retry-with-backoff logic.
 * Endpoints call this wrapped fetch transparently — they never see 429 unless the
 * budget is exhausted, at which point TwizzitRateLimitError is thrown.
 */
function makeRateLimitFetch(
  innerFetch: typeof fetch,
  policy: HttpRetryPolicy,
  logger: Logger,
  secrets: ReadonlyArray<string> = []
): typeof fetch {
  return async (input, init) => {
    let attempts = 0;
    let backoffMs = policy.initialBackoffMs;
    const budgetStart = Date.now();
    const url = input.toString();

    while (true) {
      attempts++;
      const response = await innerFetch(input, init);

      if (response.status !== 429) return response;

      // Need to read body before deciding to retry (so the response stream is consumed)
      // Clone first so caller can still read it on exhaustion
      const cloned = response.clone();
      let retryAfterHeader: string | undefined;
      cloned.headers.forEach((v, k) => {
        if (k.toLowerCase() === "retry-after") retryAfterHeader = v;
      });

      if (attempts > policy.maxRateLimitRetries) {
        const retryAfterMs = parseRetryAfterMs(retryAfterHeader) ?? backoffMs;
        logger.warn("rate-limit budget (attempts) exhausted", { attempts, retryAfterMs, url });
        throw new TwizzitRateLimitError(
          `Rate limited on ${url} after ${attempts} attempt(s)`,
          makeContext(url, attempts),
          retryAfterMs,
          secrets
        );
      }

      const waitMs =
        parseRetryAfterMs(retryAfterHeader) ?? Math.min(backoffMs, policy.maxBackoffMs);

      const elapsed = Date.now() - budgetStart;
      if (elapsed + waitMs > policy.maxRetryBudgetMs) {
        logger.warn("rate-limit budget (time) exhausted", {
          attempts,
          waitMs,
          elapsed,
          maxRetryBudgetMs: policy.maxRetryBudgetMs,
        });
        throw new TwizzitRateLimitError(
          `Rate limit time budget (${policy.maxRetryBudgetMs}ms) exhausted on ${url}`,
          makeContext(url, attempts),
          waitMs,
          secrets
        );
      }

      logger.warn("rate-limited; will retry", {
        attempt: attempts,
        maxRetries: policy.maxRateLimitRetries,
        waitMs,
        url,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      backoffMs = Math.min(backoffMs * 2, policy.maxBackoffMs);
    }
  };
}

export class TwizzitClient implements FederationContactSource {
  private readonly baseUrl: string;
  private readonly logger: Logger;
  /** Raw fetch (may be undefined → use globalThis.fetch). Stored for tests. */
  private readonly rawFetchFn: typeof fetch | undefined;
  /** Rate-limit-aware fetch wrapper built from retryPolicy. Passed to endpoints. */
  private readonly fetchFn: typeof fetch;
  private readonly retryPolicy: Required<TwizzitClientRetryPolicy>;
  private readonly credentials: TwizzitClientCredentials;

  private session: SessionState = {
    token: null,
    createdOn: null,
    validTill: null,
    organizationId: null,
  };

  constructor(config: TwizzitClientConfig) {
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.logger = config.logger ?? noopLogger;
    this.rawFetchFn = config.fetch;
    this.credentials = config.credentials;
    this.retryPolicy = {
      maxRateLimitRetries: config.retry?.maxRateLimitRetries ?? 3,
      maxRetryBudgetMs: config.retry?.maxRetryBudgetMs ?? 120_000,
      maxBackoffMs: config.retry?.maxBackoffMs ?? 30_000,
      initialBackoffMs: config.retry?.initialBackoffMs ?? 1_000,
    };

    const httpRetryPolicy: HttpRetryPolicy = {
      maxRateLimitRetries: this.retryPolicy.maxRateLimitRetries,
      maxRetryBudgetMs: this.retryPolicy.maxRetryBudgetMs,
      maxBackoffMs: this.retryPolicy.maxBackoffMs,
      initialBackoffMs: this.retryPolicy.initialBackoffMs,
    };

    // Wrap the inner fetch (or globalThis.fetch) with rate-limit retry logic.
    // Endpoints see a plain fetch and never handle 429 themselves.
    const innerFetch = config.fetch ?? globalThis.fetch;
    this.fetchFn = makeRateLimitFetch(innerFetch, httpRetryPolicy, this.logger, [
      config.credentials.password,
    ]);

    if (config.organizationId !== undefined) {
      this.session.organizationId = config.organizationId;
    }
  }

  private isTokenFresh(): boolean {
    if (!this.session.token || this.session.createdOn === null || this.session.validTill === null) {
      return false;
    }
    const nowSeconds = Date.now() / 1000;
    const lifetime = this.session.validTill - this.session.createdOn;
    const refreshAt = this.session.createdOn + 0.8 * lifetime;
    return nowSeconds < refreshAt;
  }

  async authenticate(): Promise<void> {
    // For authenticate we pass rawFetchFn (not the rate-limit wrapper) because
    // the wrapper already uses globalThis.fetch as fallback — but we need to avoid
    // double-wrapping when a test injects a mock fetch. Use rawFetchFn here so the
    // mock fetch receives the auth call directly.
    const response = await authenticate(
      this.baseUrl,
      this.credentials,
      this.logger,
      this.rawFetchFn
    );
    this.session.token = response.token;
    this.session.createdOn = response["created-on"];
    this.session.validTill = response["valid-till"];
    this.logger.debug("token cached", {
      createdOn: this.session.createdOn,
      validTill: this.session.validTill,
    });
  }

  private async ensureAuth(): Promise<string> {
    if (!this.isTokenFresh()) {
      await this.authenticate();
    }
    return this.session.token!;
  }

  private async withAuthRetry<T>(endpoint: string, fn: (token: string) => Promise<T>): Promise<T> {
    const token = await this.ensureAuth();
    try {
      return await fn(token);
    } catch (err) {
      if (err instanceof TwizzitAuthError && err.status === 401) {
        this.logger.warn("401 on request, re-authenticating once", { endpoint });
        this.session.token = null;
        const freshToken = await this.ensureAuth();
        try {
          return await fn(freshToken);
        } catch (retryErr) {
          if (retryErr instanceof TwizzitAuthError && retryErr.status === 401) {
            throw new TwizzitAuthError(
              `Double 401 on ${endpoint}, giving up`,
              makeContext(endpoint, 2),
              401,
              [this.credentials.password]
            );
          }
          throw retryErr;
        }
      }
      throw err;
    }
  }

  private async ensureOrganizationId(): Promise<number> {
    if (this.session.organizationId !== null) {
      return this.session.organizationId;
    }
    const orgs = await this.getOrganizations();
    if (orgs.length === 0) {
      throw new TwizzitClientError(
        "No organizations returned; cannot resolve organizationId",
        makeContext("GET /organizations", 1),
        0,
        "",
        "missing-organization-id"
      );
    }
    if (orgs.length > 1) {
      this.logger.warn("Multiple organizations returned; using the first one", {
        count: orgs.length,
      });
    }
    this.session.organizationId = orgs[0].id;
    return this.session.organizationId;
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.withAuthRetry("GET /organizations", (token) =>
      getOrganizations(this.baseUrl, token, this.logger, this.fetchFn, [this.credentials.password])
    );
  }

  async getContacts(opts?: ContactsQuery): Promise<Contact[]> {
    await this.ensureOrganizationId();
    return this.withAuthRetry("GET /contacts", (token) =>
      getContacts(
        this.baseUrl,
        this.session.organizationId!,
        token,
        opts,
        this.logger,
        this.fetchFn,
        [this.credentials.password]
      )
    );
  }

  async getMemberships(opts?: MembershipsQuery): Promise<Membership[]> {
    await this.ensureOrganizationId();
    return this.withAuthRetry("GET /memberships", (token) =>
      getMemberships(
        this.baseUrl,
        this.session.organizationId!,
        token,
        opts,
        this.logger,
        this.fetchFn,
        [this.credentials.password]
      )
    );
  }

  async getMembershipTypes(): Promise<MembershipType[]> {
    await this.ensureOrganizationId();
    return this.withAuthRetry("GET /membershipTypes", (token) =>
      getMembershipTypes(
        this.baseUrl,
        this.session.organizationId!,
        token,
        this.logger,
        this.fetchFn,
        [this.credentials.password]
      )
    );
  }

  async getExtraFields(): Promise<ExtraField[]> {
    await this.ensureOrganizationId();
    return this.withAuthRetry("GET /extra-fields", (token) =>
      getExtraFields(this.baseUrl, this.session.organizationId!, token, this.logger, this.fetchFn, [
        this.credentials.password,
      ])
    );
  }

  fetchOrganizations(): Promise<Organization[]> {
    return this.getOrganizations();
  }

  fetchContacts(opts?: ContactsQuery): Promise<Contact[]> {
    return this.getContacts(opts);
  }

  fetchMemberships(opts?: MembershipsQuery): Promise<Membership[]> {
    return this.getMemberships(opts);
  }

  fetchMembershipTypes(): Promise<MembershipType[]> {
    return this.getMembershipTypes();
  }

  fetchExtraFields(): Promise<ExtraField[]> {
    return this.getExtraFields();
  }
}
