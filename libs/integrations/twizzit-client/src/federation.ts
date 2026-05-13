/**
 * Federation-agnostic domain types.
 *
 * These are the shapes consumers of the lib see. They are intentionally generic so
 * a non-Twizzit federation can implement `FederationGateway` and return the same
 * shapes. Concrete implementations (like `TwizzitClient`) parse their wire format
 * and produce values matching these interfaces.
 *
 * Conventions:
 * - camelCase field names (wire-format kebab-case is normalised at parse time)
 * - lowercase locale keys (`en`, `nl`, `fr`) — generic across federations
 * - empty-string values from federations that emit them MUST be normalised to `null`
 * - federations whose ids are not numeric expose them as strings; `id: number | string`
 */

export interface FederationLocalisedName {
  en: string;
  nl: string;
  fr: string;
}

export interface FederationAddress {
  street: string;
  number: string;
  box: string;
  postalCode: string;
  city: string;
  country: FederationLocalisedName;
}

export interface FederationEmail {
  target: string | null;
  address: string;
}

export interface FederationPhone {
  target: string | null;
  countryCode: string | null;
  number: string;
}

export interface FederationExtraFieldValue {
  field: {
    id: number | string;
    name: FederationLocalisedName;
    type: string;
    location: string | null;
  };
  value: string;
  attributes: Array<{ attributeId: number | string; value: string }>;
}

export interface FederationOrganization {
  id: number | string;
  name: string;
}

export interface FederationContact {
  id: number | string;
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  language: string | null;
  accountNumber: string | null;
  registryNumber: string | null;
  federationNumber: number | string | null;
  memberId: string | null;
  hasProfileImage: boolean;
  address: FederationAddress;
  emails: FederationEmail[];
  mobiles: FederationPhone[];
  home: FederationPhone | null;
  extraFields: FederationExtraFieldValue[];
}

export interface FederationMembership {
  id: number | string;
  contactId: number | string;
  membershipTypeId: number | string;
  clubId: number | string | null;
  seasonId: number | string | null;
  startDate: string;
  endDate: string | null;
  extraFields: FederationExtraFieldValue[];
}

export interface FederationMembershipType {
  id: number | string;
  name: FederationLocalisedName;
  type: string;
  duration: number | null;
  durationUnit: string | null;
  endDate: string | null;
  transferDate: string | null;
}

export interface FederationExtraField {
  id: number | string;
  name: FederationLocalisedName;
  type: string;
  location: string | null;
  options: string[];
  attributes: Array<{ id: number | string; name: string; type: string }>;
}
