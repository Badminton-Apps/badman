import { z } from "zod";
import {
  LocalisedNameSchema,
  EmailSchema,
  MobileSchema,
  PhoneSchema,
  AddressSchema,
} from "./shared";
import { ExtraFieldAttributeSchema } from "./extra-field";

const ExtraFieldEmbeddedSchema = z
  .object({
    id: z.number().int(),
    name: LocalisedNameSchema,
    type: z.enum(["Text", "Date", "Single select", "Multiple select", "Checkbox"]),
    location: z.union([z.enum(["Contact", "Membership"]), z.literal(""), z.null()]),
    // Swagger types as [{}]; live data shows string[] for standalone /extra-fields. Loosened until verified.
    options: z.array(z.unknown()),
    attributes: z.array(ExtraFieldAttributeSchema),
  })
  .strict();

const ExtraFieldValueAttributeSchema = z
  .object({
    "attribute-id": z.number().int(),
    value: z.string(),
  })
  .strict();

const ExtraFieldValueValueSchema = z
  .object({
    value: z.string(),
    attributes: z.array(ExtraFieldValueAttributeSchema),
  })
  .strict();

export const ExtraFieldValueSchema = z
  .object({
    "extra-field": ExtraFieldEmbeddedSchema,
    value: ExtraFieldValueValueSchema,
  })
  .strict();

export type ExtraFieldValue = z.infer<typeof ExtraFieldValueSchema>;

export const ContactSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    "first-name": z.string(),
    "last-name": z.string(),
    "date-of-birth": z
      .string()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    gender: z.enum(["M", "F", "X"]).nullable(),
    nationality: z.string().nullable(),
    language: z.string().nullable(),
    "account-number": z.string().nullable(),
    "registry-number": z.string().nullable(),
    number: z.number().int().nullable(),
    "email-1": EmailSchema,
    "email-2": EmailSchema,
    "email-3": EmailSchema,
    "mobile-1": MobileSchema,
    "mobile-2": MobileSchema,
    "mobile-3": MobileSchema,
    home: PhoneSchema,
    address: AddressSchema,
    "has-profile-image": z.boolean(),
    "extra-field-values": z.array(ExtraFieldValueSchema),
  })
  .strict();

export type Contact = z.infer<typeof ContactSchema>;

export const ContactsResponseSchema = z.array(ContactSchema);

export function getMemberId(contact: Contact): string | null {
  const efv = contact["extra-field-values"].find(
    (v) => v["extra-field"].name.EN === "Member ID"
  );
  if (!efv) return null;
  const val = efv.value.value;
  return val === "" ? null : val;
}
