import { z } from "zod";

export const AuthenticateResponseSchema = z
  .object({
    token: z.string().min(1),
    "created-on": z.number().int().positive(),
    "valid-till": z.number().int().positive(),
  })
  .strict();

export type AuthenticateResponse = z.infer<typeof AuthenticateResponseSchema>;
