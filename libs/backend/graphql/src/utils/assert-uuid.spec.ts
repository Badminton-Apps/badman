import { GraphQLError } from "graphql";
import { assertUUID } from "./assert-uuid";
import { ErrorCode } from "./error-codes";

const VALID_UUID_LOWER = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const VALID_UUID_UPPER = "F47AC10B-58CC-4372-A567-0E02B2C3D479";

describe("assertUUID", () => {
  // --- Pass cases ---

  it("does not throw for a canonical lowercase UUID", () => {
    expect(() => assertUUID(VALID_UUID_LOWER, "clubId")).not.toThrow();
  });

  it("does not throw for an uppercase UUID (validator is case-insensitive)", () => {
    expect(() => assertUUID(VALID_UUID_UPPER, "clubId")).not.toThrow();
  });

  // --- Throw cases ---

  it("throws GraphQLError for an empty string", () => {
    expect(() => assertUUID("", "clubId")).toThrow(GraphQLError);
  });

  it("throws GraphQLError for a slug", () => {
    expect(() => assertUUID("smash-for-fun", "clubId")).toThrow(GraphQLError);
  });

  it("throws GraphQLError for a UUID-shaped non-hex string", () => {
    expect(() => assertUUID("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "clubId")).toThrow(GraphQLError);
  });

  it("throws GraphQLError for a whitespace-wrapped UUID (does not trim)", () => {
    expect(() => assertUUID(` ${VALID_UUID_LOWER} `, "clubId")).toThrow(GraphQLError);
  });

  // --- Error shape ---

  it("error message includes JSON.stringify(value)", () => {
    try {
      assertUUID("smash-for-fun", "clubId");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.message).toContain(JSON.stringify("smash-for-fun"));
    }
  });

  it("extensions.code is BAD_USER_INPUT", () => {
    try {
      assertUUID("smash-for-fun", "clubId");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
    }
  });

  it("extensions.field is the field argument", () => {
    try {
      assertUUID("smash-for-fun", "clubId");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["field"]).toBe("clubId");
    }
  });

  it("extensions.value is the offending value", () => {
    try {
      assertUUID("smash-for-fun", "clubId");
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["value"]).toBe("smash-for-fun");
    }
  });

  // --- Context merge ---

  it("merges context keys into extensions", () => {
    try {
      assertUUID("smash-for-fun", "clubId", { userId: "abc" });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["userId"]).toBe("abc");
    }
  });

  it("helper's own keys (code, field, value) win over context on collision", () => {
    try {
      assertUUID("smash-for-fun", "clubId", {
        code: "SOME_OTHER_CODE",
        field: "shouldNotWin",
        value: "shouldNotWin",
      });
      fail("expected throw");
    } catch (err) {
      const e = err as GraphQLError;
      expect(e.extensions["code"]).toBe(ErrorCode.BAD_USER_INPUT);
      expect(e.extensions["field"]).toBe("clubId");
      expect(e.extensions["value"]).toBe("smash-for-fun");
    }
  });
});
