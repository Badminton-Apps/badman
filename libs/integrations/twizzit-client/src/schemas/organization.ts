import { z } from "zod";

export const OrganizationSchema = z
  .object({
    id: z.number().int().positive(),
    name: z.string().min(1),
  })
  .strict();

export type Organization = z.infer<typeof OrganizationSchema>;

export const OrganizationsResponseSchema = z.array(OrganizationSchema);
