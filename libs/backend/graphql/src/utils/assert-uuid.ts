import { validate as isUUID } from "uuid";
import { GraphQLError } from "graphql";
import { ErrorCode } from "./error-codes";

/**
 * Reject a GraphQL `ID` argument that is not a UUID.
 * Use at the top of any mutation whose `id`/`fooId` arg is contractually a UUID
 * (i.e. anywhere the resolver immediately does `Model.findByPk(id)`).
 *
 * Read-side resolvers that accept UUID-or-slug (e.g. `clubs.club(id)`) MUST NOT
 * call this — they branch on `isUUID(id)` instead.
 *
 * @param value   the raw arg as received from GraphQL
 * @param field   the GraphQL arg name (e.g. "clubId", "id") — included in the error payload
 * @param context optional extra context merged into `extensions` (e.g. `{ userId }`)
 *
 * @throws GraphQLError with extensions.code === ErrorCode.BAD_USER_INPUT when value is not a UUID
 */
export function assertUUID(
  value: string,
  field: string,
  context?: Record<string, unknown>,
): void {
  if (isUUID(value)) {
    return;
  }

  throw new GraphQLError(`${field} must be a UUID, got: ${JSON.stringify(value)}`, {
    extensions: {
      ...context,
      code: ErrorCode.BAD_USER_INPUT,
      field,
      value,
    },
  });
}
