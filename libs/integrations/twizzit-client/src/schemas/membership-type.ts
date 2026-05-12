import { z } from "zod";
import { LocalisedNameSchema } from "./shared";

export const MembershipTypeSchema = z
  .object({
    id: z.number().int(),
    name: LocalisedNameSchema,
    type: z.enum(["Continuously", "Seasonal", "Fixed length", "Fixed end date"]),
    duration: z.number().int().nullable(),
    "duration-unit": z.enum(["Days", "Months", "Years"]).nullable(),
    "end-date": z.string().nullable(),
    "transfer-date": z.string().nullable(),
  })
  .strict();

export type MembershipType = z.infer<typeof MembershipTypeSchema>;

export const MembershipTypesResponseSchema = z.array(MembershipTypeSchema);
