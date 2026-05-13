import { z } from "zod";
import type { FederationMembership } from "../federation";
import { ExtraFieldValueSchema } from "./contact";

const RawMembershipSchema = z
  .object({
    id: z.number().int(),
    "contact-id": z.number().int(),
    "membership-type-id": z.number().int(),
    "season-id": z.number().int().nullable(),
    "start-date": z.string(),
    "end-date": z
      .string()
      .nullable()
      .transform((v) => (v === "" ? null : v)),
    "club-id": z.number().int().positive().nullable(),
    "extra-field-values": z.array(ExtraFieldValueSchema),
  })
  .strict();

export const MembershipSchema = RawMembershipSchema.transform(
  (raw): FederationMembership => ({
    id: raw.id,
    contactId: raw["contact-id"],
    membershipTypeId: raw["membership-type-id"],
    seasonId: raw["season-id"],
    startDate: raw["start-date"],
    endDate: raw["end-date"],
    clubId: raw["club-id"],
    extraFields: raw["extra-field-values"],
  })
);

export const MembershipsResponseSchema = z.array(MembershipSchema);
