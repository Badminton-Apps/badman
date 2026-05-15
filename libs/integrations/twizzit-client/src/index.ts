/** Main Twizzit client — implements FederationGateway. */
export { TwizzitClient } from "./client";
/** Config shape passed to `new TwizzitClient(config)`. */
export type { TwizzitClientConfig } from "./client";
/** Credential pair (username + password) used to obtain a bearer token. */
export type { TwizzitClientCredentials } from "./client";
/** Optional 429-retry tuning knobs; all fields have sensible defaults. */
export type { TwizzitClientRetryPolicy } from "./client";

/** Minimal logger interface — pass a winston/pino adapter or the built-in noopLogger. */
export type { Logger } from "./logger";
/** No-op logger (default when no logger is supplied in config). */
export { noopLogger } from "./logger";

/** Thrown when authentication or re-authentication fails (401/403). */
export { TwizzitAuthError } from "./errors";
/** Thrown when a response payload fails Zod validation. */
export { TwizzitValidationError } from "./errors";
/** Thrown on transport-level failures (ECONNRESET, DNS, timeout). */
export { TwizzitNetworkError } from "./errors";
/** Thrown after the 429 retry budget is exhausted. */
export { TwizzitRateLimitError } from "./errors";
/** Thrown on HTTP 5xx responses. */
export { TwizzitServerError } from "./errors";
/** Thrown on non-401/429 4xx responses or lib-internal quota limits. */
export { TwizzitClientError } from "./errors";
/** Type-guard — narrows `unknown` to the `TwizzitError` discriminated union. */
export { isTwizzitError } from "./errors";
/** Discriminated union of all Twizzit error variants; use with `isTwizzitError`. */
export type { TwizzitError } from "./errors";
/** Common context attached to every Twizzit error (endpoint, occurredAt, attempts). */
export type { TwizzitErrorContext } from "./errors";

/** Federation-agnostic read gateway implemented by TwizzitClient. */
export type { FederationGateway } from "./gateway";
/** Shared pagination bounds (pageSize, maxPages) for list queries. */
export type { PaginationBounds } from "./gateway";
/** Query options for fetchContacts (pagination + lastModified). */
export type { ContactsQuery } from "./gateway";
/** Query options for fetchMemberships (pagination + lastModified + clubId). */
export type { MembershipsQuery } from "./gateway";

/** Federation-agnostic organisation shape (id + name). */
export type { FederationOrganization } from "./federation";
/** Federation-agnostic person shape (id, names, dates, contact, extra fields, memberId). */
export type { FederationContact } from "./federation";
/** Federation-agnostic club↔contact link with type + dates. */
export type { FederationMembership } from "./federation";
/** Federation-agnostic membership-type definition (localised name, cadence). */
export type { FederationMembershipType } from "./federation";
/** Federation-agnostic custom-field definition (id, localised name, options). */
export type { FederationExtraField } from "./federation";
/** Federation-agnostic custom-field value attached to a contact or membership. */
export type { FederationExtraFieldValue } from "./federation";
/** Federation-agnostic localised name ({ en, nl, fr }). */
export type { FederationLocalisedName } from "./federation";
/** Federation-agnostic email entry ({ target, address }). */
export type { FederationEmail } from "./federation";
/** Federation-agnostic phone entry ({ target, countryCode, number }). */
export type { FederationPhone } from "./federation";
/** Federation-agnostic postal address. */
export type { FederationAddress } from "./federation";
