export interface FederationOrganization {
  id: number;
  name: string;
}

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

export interface FederationContactSource {
  fetchOrganizations(): Promise<FederationOrganization[]>;
  fetchContacts(opts?: ContactsQuery): Promise<unknown[]>;
  fetchMemberships(opts?: MembershipsQuery): Promise<unknown[]>;
  fetchMembershipTypes(): Promise<unknown[]>;
  fetchExtraFields(): Promise<unknown[]>;
}
