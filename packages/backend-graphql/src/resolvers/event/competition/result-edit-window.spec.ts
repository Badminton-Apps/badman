import { GraphQLError } from "graphql";
import { ErrorCode } from "../../../utils/error-codes";
import { assertResultEditWindowOpen, resultEditDeadline } from "./result-edit-window";

const HOUR = 60 * 60 * 1000;
const start = new Date("2026-10-24T18:00:00Z");

describe("result edit window", () => {
  it("closes 36 hours after the encounter's planned start", () => {
    expect(resultEditDeadline(start)).toEqual(new Date("2026-10-26T06:00:00Z"));
  });

  it("has no deadline for an encounter without a date", () => {
    expect(resultEditDeadline(undefined)).toBeNull();
  });

  it.each([
    ["before the encounter", new Date(start.getTime() - HOUR)],
    ["during the encounter", new Date(start.getTime() + 2 * HOUR)],
    ["at the deadline", new Date(start.getTime() + 36 * HOUR)],
  ])("is open %s", (_, now) => {
    expect(() => assertResultEditWindowOpen({ id: "enc-1", date: start }, now)).not.toThrow();
  });

  it("is open for an encounter without a date", () => {
    expect(() =>
      assertResultEditWindowOpen({ id: "enc-1", date: undefined }, new Date())
    ).not.toThrow();
  });

  it("throws RESULT_EDIT_WINDOW_CLOSED with the deadline once 36 hours have passed", () => {
    const now = new Date(start.getTime() + 36 * HOUR + 1);

    let thrown: unknown;
    try {
      assertResultEditWindowOpen({ id: "enc-1", date: start }, now);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(GraphQLError);
    expect((thrown as GraphQLError).extensions).toEqual({
      code: ErrorCode.RESULT_EDIT_WINDOW_CLOSED,
      encounterId: "enc-1",
      deadline: "2026-10-26T06:00:00.000Z",
    });
  });
});
