import { z } from "zod";
import { ExtraFieldValueSchema } from "./contact";

export const MembershipSchema = z
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

export type Membership = z.infer<typeof MembershipSchema>;

export const MembershipsResponseSchema = z.array(MembershipSchema);
