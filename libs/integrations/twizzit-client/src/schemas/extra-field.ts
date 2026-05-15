import { z } from "zod";
import type { FederationExtraField } from "../federation";

export const ExtraFieldAttributeSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
  })
  .strict();

const RawExtraFieldSchema = z
  .object({
    id: z.number().int(),
    name: z.object({ EN: z.string(), NL: z.string(), FR: z.string() }).strict(),
    type: z.enum(["Text", "Date", "Single select", "Multiple select", "Checkbox"]),
    location: z.union([z.enum(["Contact", "Membership"]), z.literal(""), z.null()]),
    options: z.array(z.string()),
    attributes: z.array(ExtraFieldAttributeSchema),
  })
  .strict();

export const ExtraFieldSchema = RawExtraFieldSchema.transform(
  (raw): FederationExtraField => ({
    id: raw.id,
    name: { en: raw.name.EN, nl: raw.name.NL, fr: raw.name.FR },
    type: raw.type,
    location: raw.location === "" ? null : raw.location,
    options: raw.options,
    attributes: raw.attributes.map((a) => ({ id: a.id, name: a.name, type: a.type })),
  })
);

export const ExtraFieldsResponseSchema = z.array(ExtraFieldSchema);
