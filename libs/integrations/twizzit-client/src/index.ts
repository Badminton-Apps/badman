/** Main client class — authenticate and call all Twizzit endpoints. */
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

/** Federation-agnostic read interface implemented by TwizzitClient. */
export type { FederationContactSource } from "./seam";
/** Lightweight org shape used in the seam interface. */
export type { FederationOrganization } from "./seam";
/** Shared pagination bounds (pageSize, maxPages) for list queries. */
export type { PaginationBounds } from "./seam";
/** Query options for getContacts / fetchContacts (pagination + lastModified). */
export type { ContactsQuery } from "./seam";
/** Query options for getMemberships / fetchMemberships (pagination + lastModified + clubId). */
export type { MembershipsQuery } from "./seam";

/** Zod schema for the POST /authenticate response. */
export { AuthenticateResponseSchema } from "./schemas/authenticate";
/** Parsed shape of a successful POST /authenticate response. */
export type { AuthenticateResponse } from "./schemas/authenticate";

/** Zod schema for a single organisation object. */
export { OrganizationSchema } from "./schemas/organization";
/** Zod schema for the GET /organizations array response. */
export { OrganizationsResponseSchema } from "./schemas/organization";
/** Parsed shape of a single Twizzit organisation. */
export type { Organization } from "./schemas/organization";

/** Zod schema for a localised name object (nl/fr/en). */
export { LocalisedNameSchema } from "./schemas/shared";
/** Zod schema for an email-address entry. */
export { EmailSchema } from "./schemas/shared";
/** Zod schema for a mobile-phone entry. */
export { MobileSchema } from "./schemas/shared";
/** Zod schema for a landline-phone entry. */
export { PhoneSchema } from "./schemas/shared";
/** Zod schema for a postal address. */
export { AddressSchema } from "./schemas/shared";
/** Parsed localised name. */
export type { LocalisedName } from "./schemas/shared";
/** Parsed email-address entry. */
export type { Email } from "./schemas/shared";
/** Parsed mobile-phone entry. */
export type { Mobile } from "./schemas/shared";
/** Parsed landline-phone entry. */
export type { Phone } from "./schemas/shared";
/** Parsed postal address. */
export type { Address } from "./schemas/shared";

/** Zod schema for a single contact. */
export { ContactSchema } from "./schemas/contact";
/** Zod schema for the GET /contacts array response. */
export { ContactsResponseSchema } from "./schemas/contact";
/** Zod schema for a single extra-field value on a contact. */
export { ExtraFieldValueSchema } from "./schemas/contact";
/** Extract the federation member-ID string from a contact's extra fields; returns null if absent. */
export { getMemberId } from "./schemas/contact";
/** Parsed shape of a single Twizzit contact. */
export type { Contact } from "./schemas/contact";
/** Parsed shape of an extra-field value attached to a contact. */
export type { ExtraFieldValue } from "./schemas/contact";

/** Zod schema for a single membership record. */
export { MembershipSchema } from "./schemas/membership";
/** Zod schema for the GET /memberships array response. */
export { MembershipsResponseSchema } from "./schemas/membership";
/** Parsed shape of a single Twizzit membership. */
export type { Membership } from "./schemas/membership";

/** Zod schema for a single membership-type definition. */
export { MembershipTypeSchema } from "./schemas/membership-type";
/** Zod schema for the GET /membershipTypes array response. */
export { MembershipTypesResponseSchema } from "./schemas/membership-type";
/** Parsed shape of a membership-type definition. */
export type { MembershipType } from "./schemas/membership-type";

/** Zod schema for a single extra-field definition. */
export { ExtraFieldSchema } from "./schemas/extra-field";
/** Zod schema for the GET /extra-fields array response. */
export { ExtraFieldsResponseSchema } from "./schemas/extra-field";
/** Parsed shape of an extra-field definition. */
export type { ExtraField } from "./schemas/extra-field";
