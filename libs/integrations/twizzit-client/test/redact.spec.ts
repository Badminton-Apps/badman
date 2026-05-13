import { redact, redactExcerpt } from "../src/redact";

describe("redact", () => {
  const secrets = ["my-secret-token", "hunter2"];

  it("replaces token in a plain string", () => {
    expect(redact("Bearer my-secret-token here", secrets)).toBe("Bearer [REDACTED] here");
  });

  it("replaces token in a nested object", () => {
    const input = { Authorization: "Bearer my-secret-token", other: "safe" };
    const result = redact(input, secrets) as typeof input;
    expect(result.Authorization).toBe("Bearer [REDACTED]");
    expect(result.other).toBe("safe");
  });

  it("replaces password in JSON-stringified body", () => {
    const body = JSON.stringify({ username: "user", password: "hunter2" });
    const result = redact(body, secrets) as string;
    expect(result).not.toContain("hunter2");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Authorization: Bearer header value", () => {
    const headerValue = "Authorization: Bearer my-secret-token";
    expect(redact(headerValue, secrets)).toBe("Authorization: Bearer [REDACTED]");
  });

  it("replaces in nested arrays", () => {
    const input = ["safe", "my-secret-token is here", { nested: "hunter2" }];
    const result = redact(input, secrets) as string[];
    expect(result[0]).toBe("safe");
    expect(result[1]).toBe("[REDACTED] is here");
    expect((result[2] as unknown as { nested: string }).nested).toBe("[REDACTED]");
  });

  it("passes through non-string primitives unchanged", () => {
    expect(redact(42, secrets)).toBe(42);
    expect(redact(true, secrets)).toBe(true);
    expect(redact(null, secrets)).toBe(null);
    expect(redact(undefined, secrets)).toBe(undefined);
  });

  it("handles empty secrets array", () => {
    expect(redact("my-secret-token", [])).toBe("my-secret-token");
  });

  it("handles empty secret string (skips)", () => {
    expect(redact("hello world", [""])).toBe("hello world");
  });
});

// ---------------------------------------------------------------------------
// End-to-end pipeline tests (T043 — FR-016 / SC-004 regression gate)
// ---------------------------------------------------------------------------
describe("redact end-to-end pipeline (T043)", () => {
  const LEAK_PASS = "hunter2_LEAK_THIS";
  const LEAK_USER = "LEAK_ME_USER";
  // Synthetic bearer token value — must never appear in any error field
  const LEAK_TOKEN = "LEAK_BEARER_TOKEN_deadbeef";

  function assertNoLeak(value: unknown, label: string): void {
    const serialized =
      typeof value === "object" && value !== null
        ? JSON.stringify(value, Object.getOwnPropertyNames(value))
        : String(value);
    if (serialized.includes(LEAK_PASS)) {
      throw new Error(`${label}: password leaked → ${serialized.substring(0, 300)}`);
    }
    if (serialized.includes(LEAK_TOKEN)) {
      throw new Error(`${label}: token leaked → ${serialized.substring(0, 300)}`);
    }
  }

  function makeFreshAuthBodyWithToken(token: string): string {
    const now = Math.floor(Date.now() / 1000);
    return JSON.stringify({ token, "created-on": now, "valid-till": now + 1800 });
  }

  function makeCaptureLogger() {
    const { Logger } = require("../src/logger") as { Logger: unknown };
    void Logger;
    const calls: Array<{ level: string; message: string; meta?: unknown }> = [];
    return {
      logger: {
        debug: (msg: string, meta?: unknown) => calls.push({ level: "debug", message: msg, meta }),
        info: (msg: string, meta?: unknown) => calls.push({ level: "info", message: msg, meta }),
        warn: (msg: string, meta?: unknown) => calls.push({ level: "warn", message: msg, meta }),
        error: (msg: string, meta?: unknown) => calls.push({ level: "error", message: msg, meta }),
      },
      calls,
    };
  }

  function assertLogNoLeak(calls: Array<{ level: string; message: string; meta?: unknown }>): void {
    for (const call of calls) {
      const text = JSON.stringify(call);
      if (text.includes(LEAK_PASS)) {
        throw new Error(`password in log: ${text.substring(0, 300)}`);
      }
      if (text.includes(LEAK_TOKEN)) {
        throw new Error(`token in log: ${text.substring(0, 300)}`);
      }
    }
  }

  it("TwizzitAuthError: password never appears in error or log calls", async () => {
    const { TwizzitClient } = require("../src/client") as typeof import("../src/client");
    const mockFetch: typeof fetch = async () =>
      ({
        status: 401,
        ok: false,
        text: async () => `{"error":"bad pass: ${LEAK_PASS}"}`,
        clone: () => ({ headers: { forEach: () => undefined } }),
        headers: { forEach: () => undefined },
      }) as unknown as Response;

    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: "https://app.twizzit.com/v2/api",
      fetch: mockFetch,
      logger,
    });

    let caught: unknown;
    try {
      await client.authenticate();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitAuthError");
    assertLogNoLeak(calls);
  });

  it("TwizzitNetworkError: password never appears in error or log calls", async () => {
    const { TwizzitClient } = require("../src/client") as typeof import("../src/client");
    const mockFetch: typeof fetch = async () => {
      const err = new Error(`connect ECONNREFUSED with ${LEAK_PASS}`) as NodeJS.ErrnoException;
      err.code = "ECONNREFUSED";
      throw err;
    };

    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: "https://app.twizzit.com/v2/api",
      fetch: mockFetch,
      logger,
    });

    let caught: unknown;
    try {
      await client.authenticate();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitNetworkError");
    assertLogNoLeak(calls);
  });

  it("TwizzitServerError: token never appears in bodyExcerpt or log calls", async () => {
    const { TwizzitClient } = require("../src/client") as typeof import("../src/client");
    let callIdx = 0;
    const mockFetch: typeof fetch = async () => {
      callIdx++;
      if (callIdx === 1) {
        return {
          status: 200,
          ok: true,
          text: async () => makeFreshAuthBodyWithToken(LEAK_TOKEN),
          clone: () => ({ headers: { forEach: () => undefined } }),
          headers: { forEach: () => undefined },
        } as unknown as Response;
      }
      return {
        status: 503,
        ok: false,
        text: async () => `<html>Token: Bearer ${LEAK_TOKEN} Password: ${LEAK_PASS}</html>`,
        clone: () => ({ headers: { forEach: () => undefined } }),
        headers: { forEach: () => undefined },
      } as unknown as Response;
    };

    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: "https://app.twizzit.com/v2/api",
      organizationId: 34245,
      fetch: mockFetch,
      logger,
    });

    await client.authenticate();
    let caught: unknown;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitServerError");
    assertLogNoLeak(calls);
  });

  it("TwizzitValidationError: token never appears in path or actualSummary", async () => {
    const { TwizzitClient } = require("../src/client") as typeof import("../src/client");
    let callIdx = 0;
    const mockFetch: typeof fetch = async () => {
      callIdx++;
      if (callIdx === 1) {
        return {
          status: 200,
          ok: true,
          text: async () => makeFreshAuthBodyWithToken(LEAK_TOKEN),
          clone: () => ({ headers: { forEach: () => undefined } }),
          headers: { forEach: () => undefined },
        } as unknown as Response;
      }
      // Broken org response — missing name
      return {
        status: 200,
        ok: true,
        text: async () => `[{"id": 34245, "secret": "${LEAK_TOKEN} ${LEAK_PASS}"}]`,
        clone: () => ({ headers: { forEach: () => undefined } }),
        headers: { forEach: () => undefined },
      } as unknown as Response;
    };

    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: "https://app.twizzit.com/v2/api",
      organizationId: 34245,
      fetch: mockFetch,
      logger,
    });

    await client.authenticate();
    let caught: unknown;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitValidationError");
    assertLogNoLeak(calls);
  });
});

describe("redactExcerpt", () => {
  it("redacts and truncates long strings", () => {
    const body = "x".repeat(300);
    const result = redactExcerpt(body, []);
    expect(result.length).toBeLessThanOrEqual(202);
    expect(result).toContain("…");
  });

  it("does not truncate short strings", () => {
    const body = "short";
    expect(redactExcerpt(body, [])).toBe("short");
  });

  it("redacts before truncating", () => {
    const body = "prefix my-secret-token suffix " + "x".repeat(300);
    const result = redactExcerpt(body, ["my-secret-token"]);
    expect(result).not.toContain("my-secret-token");
    expect(result).toContain("[REDACTED]");
  });

  it("respects custom maxLen", () => {
    const body = "x".repeat(50);
    const result = redactExcerpt(body, [], 10);
    expect(result.length).toBeLessThanOrEqual(12);
  });
});
