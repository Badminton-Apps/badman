import type {
  FederationOrganization,
  FederationContact,
  FederationMembership,
  FederationMembershipType,
  FederationExtraField,
} from "./federation";

export interface PaginationBounds {
  pageSize?: number;
  maxPages?: number;
}

export interface ContactsQuery extends PaginationBounds {
  lastModified?: Date;
}

export interface MembershipsQuery extends PaginationBounds {
  lastModified?: Date;
  clubId?: number;
}

/**
 * Federation read gateway — the abstract boundary between Badman and any
 * external federation membership system. Returns federation-agnostic shapes
 * (see `./federation.ts`); implementations parse their wire format and
 * normalise to these types at the schema layer.
 *
 * Today only `TwizzitClient` implements this; a future LFBB-or-other federation
 * would supply its own implementation returning the same generic shapes.
 */
export interface FederationGateway {
  fetchOrganizations(): Promise<FederationOrganization[]>;
  fetchContacts(opts?: ContactsQuery): Promise<FederationContact[]>;
  fetchMemberships(opts?: MembershipsQuery): Promise<FederationMembership[]>;
  fetchMembershipTypes(): Promise<FederationMembershipType[]>;
  fetchExtraFields(): Promise<FederationExtraField[]>;
}
