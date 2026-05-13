import { z } from "zod";
import { LocalisedNameSchema } from "./shared";

export const ExtraFieldAttributeSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    type: z.string(),
  })
  .strict();

export const ExtraFieldSchema = z
  .object({
    id: z.number().int(),
    name: LocalisedNameSchema,
    type: z.enum(["Text", "Date", "Single select", "Multiple select", "Checkbox"]),
    location: z.union([z.enum(["Contact", "Membership"]), z.literal(""), z.null()]),
    options: z.array(z.string()),
    attributes: z.array(ExtraFieldAttributeSchema),
  })
  .strict();

export type ExtraField = z.infer<typeof ExtraFieldSchema>;

export const ExtraFieldsResponseSchema = z.array(ExtraFieldSchema);
