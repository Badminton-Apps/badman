import { GraphQLScalarType, Kind } from "graphql";

export const ResilientDateTimeScalar = new GraphQLScalarType({
  name: "DateTime",
  description:
    "A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format.",

  serialize(value: unknown): string {
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        throw new TypeError("DateTime cannot represent an invalid Date instance");
      }
      return value.toISOString();
    }
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new TypeError(
          `DateTime cannot represent an invalid date-time-string: ${String(value)}`,
        );
      }
      return date.toISOString();
    }
    throw new TypeError(
      `DateTime cannot be serialized from a non-string, non-numeric, non-Date type: ${typeof value}`,
    );
  },

  parseValue(value: unknown): Date {
    return new Date(value as string | number);
  },

  parseLiteral(ast): Date | null {
    return ast.kind === Kind.STRING ? new Date(ast.value) : null;
  },
});
