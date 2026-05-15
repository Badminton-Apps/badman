import { Logger, noopLogger } from "./logger";
import { TwizzitClientError, TwizzitErrorContext } from "./errors";
import { authenticate } from "./endpoints/authenticate";
import { getOrganizations } from "./endpoints/organizations";
import { getContacts } from "./endpoints/contacts";
import { getMemberships } from "./endpoints/memberships";
import { getMembershipTypes } from "./endpoints/membership-types";
import { getExtraFields } from "./endpoints/extra-fields";
import type {
  FederationOrganization,
  FederationContact,
  FederationMembership,
  FederationMembershipType,
  FederationExtraField,
} from "./federation";
import { FederationGateway, ContactsQuery, MembershipsQuery } from "./gateway";
import { HttpClient, createHttpClient } from "./http";

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
  /** Test seam: inject a pre-configured HTTP client (e.g. wrapped by axios-mock-adapter). */
  httpClient?: HttpClient;
}

const DEFAULT_BASE_URL = "https://app.twizzit.com/v2/api";

interface SessionState {
  token: string | null;
  createdOn: number | null;
  validTill: number | null;
  organizationId: number | null;
}

function makeContext(endpoint: string, attempts: number): TwizzitErrorContext {
  return { endpoint, occurredAt: new Date().toISOString(), attempts };
}

export class TwizzitClient implements FederationGateway {
  private readonly logger: Logger;
  private readonly credentials: TwizzitClientCredentials;
  private readonly http: HttpClient;

  private session: SessionState = {
    token: null,
    createdOn: null,
    validTill: null,
    organizationId: null,
  };

  constructor(config: TwizzitClientConfig) {
    this.logger = config.logger ?? noopLogger;
    this.credentials = config.credentials;

    if (config.organizationId !== undefined) {
      this.session.organizationId = config.organizationId;
    }

    const retryPolicy = {
      maxRateLimitRetries: config.retry?.maxRateLimitRetries ?? 3,
      maxRetryBudgetMs: config.retry?.maxRetryBudgetMs ?? 120_000,
      maxBackoffMs: config.retry?.maxBackoffMs ?? 30_000,
      initialBackoffMs: config.retry?.initialBackoffMs ?? 1_000,
    };

    this.http =
      config.httpClient ??
      createHttpClient({
        baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
        getToken: () => this.session.token ?? undefined,
        getOrganizationId: () => this.session.organizationId ?? undefined,
        retryPolicy,
        logger: this.logger,
        onUnauthorized: async () => {
          this.session.token = null;
          await this.runAuthenticate();
        },
      });
  }

  /** Test-only accessor for the internal axios instance. Stable but undocumented. */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  get _http(): HttpClient {
    return this.http;
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

  private async runAuthenticate(): Promise<void> {
    const response = await authenticate(this.http, this.credentials);
    this.session.token = response.token;
    this.session.createdOn = response["created-on"];
    this.session.validTill = response["valid-till"];
    this.logger.debug("token cached", {
      createdOn: this.session.createdOn,
      validTill: this.session.validTill,
    });
  }

  async authenticate(): Promise<void> {
    await this.runAuthenticate();
  }

  private async ensureAuth(): Promise<void> {
    if (!this.isTokenFresh()) {
      await this.runAuthenticate();
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
    const id = orgs[0].id;
    if (typeof id !== "number") {
      throw new TwizzitClientError(
        "Organization id is not numeric; Twizzit returns numeric ids",
        makeContext("GET /organizations", 1),
        0,
        "",
        "missing-organization-id"
      );
    }
    this.session.organizationId = id;
    return id;
  }

  async getOrganizations(): Promise<FederationOrganization[]> {
    await this.ensureAuth();
    return getOrganizations(this.http);
  }

  async getContacts(opts?: ContactsQuery): Promise<FederationContact[]> {
    await this.ensureAuth();
    await this.ensureOrganizationId();
    return getContacts(this.http, opts);
  }

  async getMemberships(opts?: MembershipsQuery): Promise<FederationMembership[]> {
    await this.ensureAuth();
    await this.ensureOrganizationId();
    return getMemberships(this.http, opts);
  }

  async getMembershipTypes(): Promise<FederationMembershipType[]> {
    await this.ensureAuth();
    await this.ensureOrganizationId();
    return getMembershipTypes(this.http);
  }

  async getExtraFields(): Promise<FederationExtraField[]> {
    await this.ensureAuth();
    await this.ensureOrganizationId();
    return getExtraFields(this.http);
  }

  fetchOrganizations(): Promise<FederationOrganization[]> {
    return this.getOrganizations();
  }
  fetchContacts(opts?: ContactsQuery): Promise<FederationContact[]> {
    return this.getContacts(opts);
  }
  fetchMemberships(opts?: MembershipsQuery): Promise<FederationMembership[]> {
    return this.getMemberships(opts);
  }
  fetchMembershipTypes(): Promise<FederationMembershipType[]> {
    return this.getMembershipTypes();
  }
  fetchExtraFields(): Promise<FederationExtraField[]> {
    return this.getExtraFields();
  }

  /**
   * Fetches exactly one page of contacts starting at `offset`.
   * Used by shadow-sync checkpointed pagination (T030).
   */
  async getContactsPage(opts: { offset: number; pageSize: number }): Promise<FederationContact[]> {
    await this.ensureAuth();
    await this.ensureOrganizationId();
    return getContacts(this.http, {
      pageSize: opts.pageSize,
      maxPages: 1,
      startOffset: opts.offset,
    });
  }

  /**
   * Fetches exactly one page of memberships starting at `offset`.
   * Used by shadow-sync checkpointed pagination (T030).
   */
  async getMembershipsPage(opts: { offset: number; pageSize: number }): Promise<FederationMembership[]> {
    await this.ensureAuth();
    await this.ensureOrganizationId();
    return getMemberships(this.http, {
      pageSize: opts.pageSize,
      maxPages: 1,
      startOffset: opts.offset,
    });
  }
}
