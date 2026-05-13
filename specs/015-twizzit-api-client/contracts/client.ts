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
/* Federation-agnostic entity types (see federation.ts, data-model.md) */
/* ============================================================ */

// These are sketched here for the contract; real definitions live in src/federation.ts.
// Conventions: camelCase fields, lowercase locale keys (en/nl/fr), empty wire strings
// normalised to null. Twizzit's kebab-case wire format is internal; consumers see only these.
export type FederationOrganization = { id: number | string; name: string };
export type FederationContact = { /* see data-model.md → FederationContact */ };
export type FederationMembership = { /* see data-model.md → FederationMembership */ };
export type FederationMembershipType = { /* see data-model.md → FederationMembershipType */ };
export type FederationExtraField = { /* see data-model.md → FederationExtraField */ };
export type FederationExtraFieldValue = { /* see data-model.md → FederationExtraFieldValue */ };

/* ============================================================ */
/* Federation-agnostic gateway (FR-008, research.md R9)          */
/* ============================================================ */

export interface FederationGateway {
  fetchOrganizations(): Promise<FederationOrganization[]>;
  fetchContacts(opts?: ContactsQuery): Promise<FederationContact[]>;
  fetchMemberships(opts?: MembershipsQuery): Promise<FederationMembership[]>;
  fetchMembershipTypes(): Promise<FederationMembershipType[]>;
  fetchExtraFields(): Promise<FederationExtraField[]>;
}

/* ============================================================ */
/* TwizzitClient — concrete implementation                       */
/* ============================================================ */

export declare class TwizzitClient implements FederationGateway {
  constructor(config: TwizzitClientConfig);

  /**
   * POST /authenticate.
   * Idempotent across calls; only re-authenticates when the cached token is near expiry
   * (≥80% of created-on/valid-till lifetime) or after a 401. Per FR-013, FR-022.
   * Throws: TwizzitAuthError, TwizzitNetworkError.
   */
  authenticate(): Promise<void>;

  /**
   * GET /organizations.
   * Caches the resolved org id on the instance after the first successful call.
   */
  getOrganizations(): Promise<FederationOrganization[]>;

  /**
   * GET /contacts — paginated transparently via limit/offset.
   * Throws TwizzitClientError when maxPages is exceeded (FR-021).
   */
  getContacts(opts?: ContactsQuery): Promise<FederationContact[]>;

  /** GET /memberships — paginated transparently. */
  getMemberships(opts?: MembershipsQuery): Promise<FederationMembership[]>;

  /** GET /membershipTypes — single page; small reference data set. */
  getMembershipTypes(): Promise<FederationMembershipType[]>;

  /** GET /extra-fields — single page; reference data. */
  getExtraFields(): Promise<FederationExtraField[]>;

  /* FederationGateway aliases — same methods under federation-agnostic names. */
  fetchOrganizations(): Promise<FederationOrganization[]>;
  fetchContacts(opts?: ContactsQuery): Promise<FederationContact[]>;
  fetchMemberships(opts?: MembershipsQuery): Promise<FederationMembership[]>;
  fetchMembershipTypes(): Promise<FederationMembershipType[]>;
  fetchExtraFields(): Promise<FederationExtraField[]>;
}

/* ============================================================ */
/* Convenience                                                   */
/* ============================================================ */

// Note: the previous `getMemberId(contact)` helper is gone — `memberId` is now
// a top-level field on FederationContact, normalised by the schema's transform.

/* ============================================================ */
/* Public exports (index.ts) — for reference                     */
/* ============================================================ */

// Re-exported from src/index.ts:
// - TwizzitClient
// - TwizzitClientConfig, TwizzitClientCredentials, TwizzitClientRetryPolicy
// - Logger, noopLogger
// - PaginationBounds, ContactsQuery, MembershipsQuery, FederationGateway
// - Federation* entity types (Organization, Contact, Membership, MembershipType, ExtraField,
//   ExtraFieldValue, LocalisedName, Email, Phone, Address)
// - All zod schemas (OrganizationSchema, ContactSchema, MembershipSchema, …)
// - FederationGateway
// - All TwizzitError variants (see contracts/errors.ts)
// - getMemberId
