import { z } from "zod";
import type { FederationOrganization } from "../federation";

const RawOrganizationSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
  })
  .strict();

export const OrganizationSchema = RawOrganizationSchema.transform(
  (raw): FederationOrganization => ({ id: raw.id, name: raw.name })
);

export const OrganizationsResponseSchema = z.array(OrganizationSchema);
