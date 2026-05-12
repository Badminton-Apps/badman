import { Logger, noopLogger } from "./logger";
import { TwizzitAuthError, TwizzitClientError, TwizzitErrorContext } from "./errors";
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

export class TwizzitClient implements FederationContactSource {
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly fetchFn: typeof fetch | undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used in Phase 4 429-retry wiring
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
    this.fetchFn = config.fetch;
    this.credentials = config.credentials;
    this.retryPolicy = {
      maxRateLimitRetries: config.retry?.maxRateLimitRetries ?? 3,
      maxRetryBudgetMs: config.retry?.maxRetryBudgetMs ?? 120_000,
      maxBackoffMs: config.retry?.maxBackoffMs ?? 30_000,
      initialBackoffMs: config.retry?.initialBackoffMs ?? 1_000,
    };

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
    const response = await authenticate(
      this.baseUrl,
      this.credentials,
      this.logger,
      this.fetchFn
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

  private async withAuthRetry<T>(
    endpoint: string,
    fn: (token: string) => Promise<T>
  ): Promise<T> {
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
      getOrganizations(this.baseUrl, token, this.logger, this.fetchFn)
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
        this.fetchFn
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
        this.fetchFn
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
        this.fetchFn
      )
    );
  }

  async getExtraFields(): Promise<ExtraField[]> {
    await this.ensureOrganizationId();
    return this.withAuthRetry("GET /extra-fields", (token) =>
      getExtraFields(
        this.baseUrl,
        this.session.organizationId!,
        token,
        this.logger,
        this.fetchFn
      )
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
