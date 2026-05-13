import { z } from "zod";
import type { FederationMembershipType } from "../federation";

const RawMembershipTypeSchema = z
  .object({
    id: z.number().int(),
    name: z.object({ EN: z.string(), NL: z.string(), FR: z.string() }).strict(),
    type: z.enum(["Continuously", "Seasonal", "Fixed length", "Fixed end date"]),
    duration: z.number().int().nullable(),
    "duration-unit": z.enum(["Days", "Months", "Years"]).nullable(),
    "end-date": z.string().nullable(),
    "transfer-date": z.string().nullable(),
  })
  .strict();

export const MembershipTypeSchema = RawMembershipTypeSchema.transform(
  (raw): FederationMembershipType => ({
    id: raw.id,
    name: { en: raw.name.EN, nl: raw.name.NL, fr: raw.name.FR },
    type: raw.type,
    duration: raw.duration,
    durationUnit: raw["duration-unit"],
    endDate: raw["end-date"],
    transferDate: raw["transfer-date"],
  })
);

export const MembershipTypesResponseSchema = z.array(MembershipTypeSchema);
