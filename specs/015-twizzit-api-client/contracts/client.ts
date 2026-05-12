/**
 * Twizzit API Client — public contract (Phase 1 deliverable, /speckit-plan).
 *
 * This file is documentation, not source code. The actual implementation lives at
 * libs/integrations/twizzit-client/src/. The types and signatures below define the
 * stable public surface the lib MUST expose. Anything not listed here is internal.
 *
 * Spec: specs/015-twizzit-api-client/spec.md
 * Plan: specs/015-twizzit-api-client/plan.md
 */

import { z } from "zod";

/* ============================================================ */
/* Configuration                                                 */
/* ============================================================ */

export interface TwizzitClientCredentials {
  username: string;
  password: string;
}

export interface TwizzitClientRetryPolicy {
  /** Max retries on 429. Default: 3. */
  maxRateLimitRetries?: number;
  /** Wall-clock budget per call, milliseconds. Default: 120_000. */
  maxRetryBudgetMs?: number;
  /** Cap on individual back-off step, milliseconds. Default: 30_000. */
  maxBackoffMs?: number;
  /** Starting back-off, milliseconds. Default: 1_000. */
  initialBackoffMs?: number;
}

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface TwizzitClientConfig {
  credentials: TwizzitClientCredentials;
  /** Default: https://app.twizzit.com/v2/api */
  baseUrl?: string;
  /** Resolved on first call when omitted. */
  organizationId?: number;
  retry?: TwizzitClientRetryPolicy;
  /** Default: no-op logger. */
  logger?: Logger;
}

export interface PaginationBounds {
  /** Items per page sent as `limit` query param. Default: 100. */
  pageSize?: number;
  /** Max pages to walk. Default: 2000. Hitting this throws TwizzitClientError. */
  maxPages?: number;
}

export interface ContactsQuery extends PaginationBounds {
  /** Optional last-modified filter — placeholder for gap-doc Q1. */
  lastModified?: Date;
}

export interface MembershipsQuery extends PaginationBounds {
  lastModified?: Date;
  clubId?: number;
}

/* ============================================================ */
/* Inferred-from-zod entity types (see data-model.md)            */
/* ============================================================ */

// These are sketched here. Real types are `z.infer<typeof XxxSchema>` from src/schemas/.
export type Organization = { id: number; name: string };
export type Contact = { /* see data-model.md → Contact */ };
export type Membership = { /* see data-model.md → Membership */ };
export type MembershipType = { /* see data-model.md → MembershipType */ };
export type ExtraField = { /* see data-model.md → ExtraField */ };

/* ============================================================ */
/* Federation-agnostic seam (FR-008, research.md R9)             */
/* ============================================================ */

export interface FederationContactSource {
  fetchOrganizations(): Promise<Organization[]>;
  fetchContacts(opts?: ContactsQuery): Promise<Contact[]>;
  fetchMemberships(opts?: MembershipsQuery): Promise<Membership[]>;
  fetchMembershipTypes(): Promise<MembershipType[]>;
  fetchExtraFields(): Promise<ExtraField[]>;
}

/* ============================================================ */
/* TwizzitClient — concrete implementation                       */
/* ============================================================ */

export declare class TwizzitClient implements FederationContactSource {
  constructor(config: TwizzitClientConfig);

  /**
   * POST /authenticate.
   * Idempotent across calls; only re-authenticates when the cached token is near expiry
   * (≥80% of JWT exp lifetime) or after a 401. Per FR-013, FR-022.
   * Throws: TwizzitAuthError, TwizzitNetworkError.
   */
  authenticate(): Promise<void>;

  /**
   * GET /organizations.
   * Caches the result on the instance after the first successful call.
   */
  getOrganizations(): Promise<Organization[]>;

  /**
   * GET /contacts — paginated transparently via limit/offset.
   * Throws TwizzitClientError when maxPages is exceeded (FR-021).
   */
  getContacts(opts?: ContactsQuery): Promise<Contact[]>;

  /**
   * GET /memberships — paginated transparently.
   */
  getMemberships(opts?: MembershipsQuery): Promise<Membership[]>;

  /**
   * GET /membershipTypes — single page; small reference data set.
   */
  getMembershipTypes(): Promise<MembershipType[]>;

  /**
   * GET /extra-fields — single page; reference data.
   */
  getExtraFields(): Promise<ExtraField[]>;

  /* FederationContactSource shape — same methods under federation-agnostic names. */
  fetchOrganizations(): Promise<Organization[]>;
  fetchContacts(opts?: ContactsQuery): Promise<Contact[]>;
  fetchMemberships(opts?: MembershipsQuery): Promise<Membership[]>;
  fetchMembershipTypes(): Promise<MembershipType[]>;
  fetchExtraFields(): Promise<ExtraField[]>;
}

/* ============================================================ */
/* Convenience helpers                                           */
/* ============================================================ */

/**
 * Extract the federation "Member ID" from a Contact's extra-field-values.
 * Returns null if absent. Pure function, no I/O.
 */
export declare function getMemberId(contact: Contact): string | null;

/* ============================================================ */
/* Public exports (index.ts) — for reference                     */
/* ============================================================ */

// Re-exported from src/index.ts (NOT a re-statement of what's above; just the index list):
// - TwizzitClient
// - TwizzitClientConfig, TwizzitClientCredentials, TwizzitClientRetryPolicy
// - Logger, noopLogger
// - PaginationBounds, ContactsQuery, MembershipsQuery
// - All entity types (Organization, Contact, Membership, MembershipType, ExtraField)
// - All zod schemas (OrganizationSchema, ContactSchema, MembershipSchema, …)
// - FederationContactSource
// - All TwizzitError variants (see contracts/errors.ts)
// - getMemberId
