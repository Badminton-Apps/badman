import { z } from "zod";
import type {
  FederationContact,
  FederationEmail,
  FederationPhone,
  FederationExtraFieldValue,
} from "../federation";
import { ExtraFieldAttributeSchema } from "./extra-field";

const emptyToNull = (v: string | null): string | null => (v === "" ? null : v);

const RawEmailSchema = z
  .object({
    target: z.string().nullable().transform(emptyToNull),
    email: z.string(),
  })
  .strict();

const RawPhoneSchema = z
  .object({
    target: z.string().nullable().transform(emptyToNull),
    cc: z.string().nullable().transform(emptyToNull),
    number: z.string(),
  })
  .strict();

const RawLocalisedNameSchema = z
  .object({ EN: z.string(), NL: z.string(), FR: z.string() })
  .strict();

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

// Live wire format (confirmed 2026-05-13): the embedded extra-field on a contact
// uses camelCase wrapper keys — `extraField` (not `extra-field`) — and the inner
// field model uses `extraFieldAttributes` (not `attributes`). There is no
// `options` field on the embedded variant; that only appears on the standalone
// `/extra-fields` resource. The Swagger drift docs claimed otherwise; live data wins.
const RawExtraFieldEmbeddedSchema = z
  .object({
    id: z.number().int(),
    name: RawLocalisedNameSchema,
    type: z.enum(["Text", "Date", "Single select", "Multiple select", "Checkbox"]),
    location: z.union([z.enum(["Contact", "Membership"]), z.literal(""), z.null()]),
    extraFieldAttributes: z.array(ExtraFieldAttributeSchema),
  })
  .strict();

const RawExtraFieldValueAttributeSchema = z
  .object({
    "attribute-id": z.number().int(),
    value: z.string(),
  })
  .strict();

const RawExtraFieldValueValueSchema = z
  .object({
    value: z.string(),
    attributes: z.array(RawExtraFieldValueAttributeSchema),
  })
  .strict();

const RawExtraFieldValueSchema = z
  .object({
    extraField: RawExtraFieldEmbeddedSchema,
    value: RawExtraFieldValueValueSchema,
  })
  .strict();

export const ExtraFieldValueSchema = RawExtraFieldValueSchema.transform(
  (raw): FederationExtraFieldValue => ({
    field: {
      id: raw.extraField.id,
      name: {
        en: raw.extraField.name.EN,
        nl: raw.extraField.name.NL,
        fr: raw.extraField.name.FR,
      },
      type: raw.extraField.type,
      location: raw.extraField.location === "" ? null : raw.extraField.location,
    },
    value: raw.value.value,
    attributes: raw.value.attributes.map((a) => ({
      attributeId: a["attribute-id"],
      value: a.value,
    })),
  })
);

const RawContactSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    "first-name": z.string(),
    "last-name": z.string(),
    "date-of-birth": z.string().nullable().transform(emptyToNull),
    gender: z.enum(["M", "F", "X"]).nullable(),
    nationality: z.string().nullable(),
    language: z.string().nullable(),
    "account-number": z.string().nullable(),
    "registry-number": z.string().nullable(),
    number: z.number().int().nullable(),
    "email-1": RawEmailSchema,
    "email-2": RawEmailSchema,
    "email-3": RawEmailSchema,
    "mobile-1": RawPhoneSchema,
    "mobile-2": RawPhoneSchema,
    "mobile-3": RawPhoneSchema,
    phone: RawPhoneSchema,
    address: RawAddressSchema,
    "has-profile-image": z.boolean(),
    "extra-field-values": z.array(ExtraFieldValueSchema),
  })
  .strict();

function mapEmail(raw: z.infer<typeof RawEmailSchema>): FederationEmail {
  return { target: raw.target, address: raw.email };
}

function mapPhone(raw: z.infer<typeof RawPhoneSchema>): FederationPhone {
  return { target: raw.target, countryCode: raw.cc, number: raw.number };
}

export const ContactSchema = RawContactSchema.transform((raw): FederationContact => {
  const emails = [raw["email-1"], raw["email-2"], raw["email-3"]]
    .map(mapEmail)
    .filter((e) => e.address !== "");
  const mobiles = [raw["mobile-1"], raw["mobile-2"], raw["mobile-3"]]
    .map(mapPhone)
    .filter((m) => m.number !== "");
  const homePhone = mapPhone(raw.phone);
  const home: FederationPhone | null = homePhone.number === "" ? null : homePhone;

  const extraFields = raw["extra-field-values"];
  const memberIdEntry = extraFields.find((e) => e.field.name.en === "Member ID");
  const memberId = memberIdEntry && memberIdEntry.value !== "" ? memberIdEntry.value : null;

  return {
    id: raw.id,
    fullName: raw.name,
    firstName: raw["first-name"],
    lastName: raw["last-name"],
    dateOfBirth: raw["date-of-birth"],
    gender: raw.gender,
    nationality: raw.nationality,
    language: raw.language,
    accountNumber: raw["account-number"],
    registryNumber: raw["registry-number"],
    federationNumber: raw.number,
    memberId,
    hasProfileImage: raw["has-profile-image"],
    address: {
      street: raw.address.street,
      number: raw.address.number,
      box: raw.address.box,
      postalCode: raw.address.postalCode,
      city: raw.address.city,
      country: {
        en: raw.address.country.EN,
        nl: raw.address.country.NL,
        fr: raw.address.country.FR,
      },
    },
    emails,
    mobiles,
    home,
    extraFields,
  };
});

export const ContactsResponseSchema = z.array(ContactSchema);
