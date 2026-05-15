import { z } from "zod";
import type {
  FederationLocalisedName,
  FederationAddress,
  FederationEmail,
  FederationPhone,
} from "../federation";

const emptyToNull = (v: string | null): string | null => (v === "" ? null : v);

const RawLocalisedNameSchema = z
  .object({ EN: z.string(), NL: z.string(), FR: z.string() })
  .strict();
export const LocalisedNameSchema = RawLocalisedNameSchema.transform(
  (raw): FederationLocalisedName => ({ en: raw.EN, nl: raw.NL, fr: raw.FR })
);

const RawEmailSchema = z
  .object({
    target: z.string().nullable().transform(emptyToNull),
    email: z.string(),
  })
  .strict();
export const EmailSchema = RawEmailSchema.transform(
  (raw): FederationEmail => ({ target: raw.target, address: raw.email })
);
export const RawEmailSchemaInternal = RawEmailSchema;

const RawPhoneSchema = z
  .object({
    target: z.string().nullable().transform(emptyToNull),
    cc: z.string().nullable().transform(emptyToNull),
    number: z.string(),
  })
  .strict();
export const MobileSchema = RawPhoneSchema.transform(
  (raw): FederationPhone => ({ target: raw.target, countryCode: raw.cc, number: raw.number })
);
export const PhoneSchema = MobileSchema;
export const RawPhoneSchemaInternal = RawPhoneSchema;

const RawAddressSchema = z
  .object({
    street: z.string(),
    number: z.string(),
    box: z.string(),
    postalCode: z.string(),
    city: z.string(),
    country: RawLocalisedNameSchema,
  })
  .strict();
export const AddressSchema = RawAddressSchema.transform(
  (raw): FederationAddress => ({
    street: raw.street,
    number: raw.number,
    box: raw.box,
    postalCode: raw.postalCode,
    city: raw.city,
    country: { en: raw.country.EN, nl: raw.country.NL, fr: raw.country.FR },
  })
);
