import { Kind } from "graphql";
import { ResilientDateTimeScalar } from "./datetime.scalar";

const serialize = (v: unknown) => ResilientDateTimeScalar.serialize(v);
const parseValue = (v: unknown) => ResilientDateTimeScalar.parseValue(v);
const parseLiteral = (ast: any) => ResilientDateTimeScalar.parseLiteral(ast, {});

describe("ResilientDateTimeScalar", () => {
  describe("serialize", () => {
    it("should serialize a Date instance to an ISO string", () => {
      const date = new Date("2026-03-23T10:15:30.000Z");
      expect(serialize(date)).toBe("2026-03-23T10:15:30.000Z");
    });

    it("should serialize a date-only string (the Sequelize DATEONLY case)", () => {
      expect(serialize("2026-03-23")).toBe("2026-03-23T00:00:00.000Z");
    });

    it("should serialize a date-only string with time-zone padding", () => {
      expect(serialize("2026-03-28")).toBe("2026-03-28T00:00:00.000Z");
    });

    it("should serialize a full ISO date-time string", () => {
      expect(serialize("2026-03-23T10:15:30Z")).toBe("2026-03-23T10:15:30.000Z");
    });

    it("should serialize an ISO string with milliseconds", () => {
      expect(serialize("2026-03-23T10:15:30.123Z")).toBe("2026-03-23T10:15:30.123Z");
    });

    it("should serialize a numeric timestamp", () => {
      const ts = new Date("2026-03-23T00:00:00.000Z").getTime();
      expect(serialize(ts)).toBe("2026-03-23T00:00:00.000Z");
    });

    it("should throw on an invalid Date instance", () => {
      expect(() => serialize(new Date("not-a-date"))).toThrow(
        "DateTime cannot represent an invalid Date instance",
      );
    });

    it("should throw on an unparseable string", () => {
      expect(() => serialize("not-a-date")).toThrow(
        'DateTime cannot represent an invalid date-time-string: not-a-date',
      );
    });

    it("should throw on null", () => {
      expect(() => serialize(null)).toThrow();
    });

    it("should throw on undefined", () => {
      expect(() => serialize(undefined)).toThrow();
    });

    it("should throw on a boolean", () => {
      expect(() => serialize(true)).toThrow(
        "DateTime cannot be serialized from a non-string, non-numeric, non-Date type: boolean",
      );
    });

    it("should throw on an object", () => {
      expect(() => serialize({})).toThrow();
    });
  });

  describe("parseValue", () => {
    it("should parse a full ISO string into a Date", () => {
      const result = parseValue("2026-03-23T10:15:30.000Z");
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2026-03-23T10:15:30.000Z");
    });

    it("should parse a date-only string into a Date", () => {
      const result = parseValue("2026-03-23");
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toMatch(/^2026-03-23/);
    });

    it("should parse a numeric timestamp into a Date", () => {
      const ts = new Date("2026-03-23T00:00:00.000Z").getTime();
      const result = parseValue(ts);
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2026-03-23T00:00:00.000Z");
    });
  });

  describe("parseLiteral", () => {
    it("should parse a STRING literal into a Date", () => {
      const ast = { kind: Kind.STRING, value: "2026-03-23T10:15:30.000Z" };
      const result = parseLiteral(ast);
      expect(result).toBeInstanceOf(Date);
      expect((result as Date).toISOString()).toBe("2026-03-23T10:15:30.000Z");
    });

    it("should return null for a non-STRING literal", () => {
      const ast = { kind: Kind.INT, value: "1234567890" };
      expect(parseLiteral(ast)).toBeNull();
    });
  });
});
