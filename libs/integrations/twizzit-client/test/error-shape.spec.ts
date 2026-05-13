/**
 * T044 — Type-level test: verifies the TwizzitError discriminated union narrows correctly on `kind`.
 * Uses an exhaustive switch to prove TypeScript narrows each variant.
 */
import {
  TwizzitError,
  TwizzitAuthError,
  TwizzitValidationError,
  TwizzitNetworkError,
  TwizzitRateLimitError,
  TwizzitServerError,
  TwizzitClientError,
  isTwizzitError,
} from "../src/errors";

describe("TwizzitError discriminated union", () => {
  /**
   * Exhaustive switch that TypeScript will flag if a variant is missing.
   * Never() is only reachable if the union has unhandled cases.
   */
  function classifyError(err: TwizzitError): string {
    switch (err.kind) {
      case "auth":
        // TypeScript knows err is TwizzitAuthError here
        return `auth:${err.status}`;
      case "validation":
        // TypeScript knows err is TwizzitValidationError
        return `validation:${err.path}`;
      case "network":
        // TypeScript knows err is TwizzitNetworkError
        return `network:${err.code}`;
      case "rate-limit":
        // TypeScript knows err is TwizzitRateLimitError
        return `rate-limit:${err.retryAfterMs}`;
      case "server":
        // TypeScript knows err is TwizzitServerError
        return `server:${err.status}`;
      case "client":
        // TypeScript knows err is TwizzitClientError
        return `client:${err.subkind ?? "none"}`;
      default:
        // This branch is unreachable if the union is exhaustive.
        // TypeScript will error here if a variant is added without handling it.
        return assertNever(err);
    }
  }

  function assertNever(x: never): never {
    throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
  }

  const ctx = { endpoint: "test", occurredAt: "2026-01-01T00:00:00Z", attempts: 1 };

  it("auth variant narrows to TwizzitAuthError", () => {
    const err = new TwizzitAuthError("msg", ctx, 401);
    expect(classifyError(err)).toBe("auth:401");
  });

  it("validation variant narrows to TwizzitValidationError", () => {
    const err = new TwizzitValidationError("msg", ctx, "0.gender", "enum", "actual");
    expect(classifyError(err)).toBe("validation:0.gender");
  });

  it("network variant narrows to TwizzitNetworkError", () => {
    const err = new TwizzitNetworkError("msg", ctx, "ECONNRESET");
    expect(classifyError(err)).toBe("network:ECONNRESET");
  });

  it("rate-limit variant narrows to TwizzitRateLimitError", () => {
    const err = new TwizzitRateLimitError("msg", ctx, 2000);
    expect(classifyError(err)).toBe("rate-limit:2000");
  });

  it("server variant narrows to TwizzitServerError", () => {
    const err = new TwizzitServerError("msg", ctx, 503, "<html>down</html>");
    expect(classifyError(err)).toBe("server:503");
  });

  it("client variant (no subkind) narrows to TwizzitClientError", () => {
    const err = new TwizzitClientError("msg", ctx, 422, "bad limit");
    expect(classifyError(err)).toBe("client:none");
  });

  it("client variant (max-pages-exceeded) narrows with correct subkind", () => {
    const err = new TwizzitClientError("msg", ctx, 0, "", "max-pages-exceeded");
    expect(classifyError(err)).toBe("client:max-pages-exceeded");
  });

  it("isTwizzitError returns true for all six variants", () => {
    const errors: TwizzitError[] = [
      new TwizzitAuthError("msg", ctx, 401),
      new TwizzitValidationError("msg", ctx, "path", "exp", "actual"),
      new TwizzitNetworkError("msg", ctx, "ECONNRESET"),
      new TwizzitRateLimitError("msg", ctx, 1000),
      new TwizzitServerError("msg", ctx, 503, "body"),
      new TwizzitClientError("msg", ctx, 422, "body"),
    ];
    for (const err of errors) {
      expect(isTwizzitError(err)).toBe(true);
    }
  });

  it("isTwizzitError returns false for plain Error and non-Error values", () => {
    expect(isTwizzitError(new Error("plain"))).toBe(false);
    expect(isTwizzitError("string")).toBe(false);
    expect(isTwizzitError(null)).toBe(false);
    expect(isTwizzitError(undefined)).toBe(false);
    expect(isTwizzitError(42)).toBe(false);
    expect(isTwizzitError({ kind: "auth" })).toBe(false); // plain object, not instance
  });
});
