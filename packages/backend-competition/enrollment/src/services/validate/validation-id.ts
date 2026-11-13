import { createHash } from "node:crypto";

/**
 * Stable id for an enrollment validation error or warning: the MD5 hex digest
 * of its JSON. Used to drop duplicate messages; clients may use it as a key.
 */
export function validationMessageId(message: unknown): string {
  return createHash("md5").update(JSON.stringify(message)).digest("hex");
}
