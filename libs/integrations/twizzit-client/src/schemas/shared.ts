import { z } from "zod";

export const LocalisedNameSchema = z
  .object({
    EN: z.string(),
    NL: z.string(),
    FR: z.string(),
  })
  .strict();

export type LocalisedName = z.infer<typeof LocalisedNameSchema>;

export const EmailSchema = z
  .object({
    target: z
      .string()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    email: z.string(),
  })
  .strict();

export type Email = z.infer<typeof EmailSchema>;

export const MobileSchema = z
  .object({
    target: z
      .string()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    cc: z
      .string()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    number: z.string(),
  })
  .strict();

export type Mobile = z.infer<typeof MobileSchema>;

export const PhoneSchema = MobileSchema;
export type Phone = z.infer<typeof PhoneSchema>;

export const AddressSchema = z
  .object({
    street: z.string(),
    number: z.string(),
    box: z.string(),
    postalCode: z.string(),
    city: z.string(),
    country: LocalisedNameSchema,
  })
  .strict();

export type Address = z.infer<typeof AddressSchema>;
