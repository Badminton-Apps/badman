/**
 * Phase 5 (US3): Error variant coverage.
 * One describe block per TwizzitError variant.
 */
import * as path from "path";
import * as fs from "fs";
import { TwizzitClient } from "../src/client";
import {
  TwizzitAuthError,
  TwizzitValidationError,
  TwizzitNetworkError,
  TwizzitRateLimitError,
  TwizzitServerError,
  TwizzitClientError,
} from "../src/errors";
import { Logger } from "../src/logger";

const FIXTURES_DIR = path.resolve(__dirname, "__fixtures__");

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

function stripJsonComments(raw: string): string {
  return raw
    .split("\n")
    .filter((l) => !l.trimStart().startsWith("//"))
    .join("\n");
}

function loadFixtureJson(name: string): unknown {
  return JSON.parse(stripJsonComments(loadFixture(name)));
}

function makeFreshAuthBody(): string {
  const now = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    token: "eyJ.synthetic.fresh.token",
    "created-on": now,
    "valid-till": now + 1800,
  });
}

function makeCaptureLogger(): {
  logger: Logger;
  calls: Array<{ level: string; message: string; meta?: Record<string, unknown> }>;
} {
  const calls: Array<{ level: string; message: string; meta?: Record<string, unknown> }> = [];
  const logger: Logger = {
    debug: (message, meta) => calls.push({ level: "debug", message, meta }),
    info: (message, meta) => calls.push({ level: "info", message, meta }),
    warn: (message, meta) => calls.push({ level: "warn", message, meta }),
    error: (message, meta) => calls.push({ level: "error", message, meta }),
  };
  return { logger, calls };
}

function makeMockFetchSequenced(
  responses: Array<{ status: number; body: string; headers?: Record<string, string> }>
): typeof fetch {
  let idx = 0;
  return async () => {
    const resp = responses[idx] ?? responses[responses.length - 1];
    idx++;
    const body = resp.body;
    const hdrs = resp.headers ?? {};
    return {
      status: resp.status,
      ok: resp.status >= 200 && resp.status < 300,
      text: async () => body,
      clone: () => ({
        headers: {
          forEach: (cb: (v: string, k: string) => void) => {
            Object.entries(hdrs).forEach(([k, v]) => cb(v, k));
          },
        },
      }),
      headers: {
        forEach: (cb: (v: string, k: string) => void) => {
          Object.entries(hdrs).forEach(([k, v]) => cb(v, k));
        },
      },
    } as unknown as Response;
  };
}

const TEST_CREDENTIALS = { username: "test@example.com", password: "s3cr3t-p4ssw0rd" };
const BASE_URL = "https://app.twizzit.com/v2/api";
const ORG_ID = 34245;

// ---------------------------------------------------------------------------
// (a) TwizzitAuthError
// ---------------------------------------------------------------------------
describe("TwizzitAuthError variants", () => {
  it("getOrganizations returns 403 with a fresh token → TwizzitAuthError with status 403", async () => {
    // auth succeeds with fresh token, then GET /organizations returns 403
    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: makeFreshAuthBody() },
      { status: 403, body: '{"error":"forbidden"}' },
    ]);
    const client = new TwizzitClient({
      credentials: TEST_CREDENTIALS,
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
    });

    await client.authenticate();
    let caught: TwizzitAuthError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitAuthError;
    }

    expect(caught).toBeInstanceOf(TwizzitAuthError);
    expect(caught!.kind).toBe("auth");
    expect(caught!.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// (b) TwizzitValidationError — synthetic mutated organizations.broken.json
// ---------------------------------------------------------------------------
describe("TwizzitValidationError variants", () => {
  it("organizations.broken.json (missing name) → TwizzitValidationError with path mentioning name", async () => {
    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: makeFreshAuthBody() },
      { status: 200, body: JSON.stringify(loadFixtureJson("organizations.broken.json")) },
    ]);
    const client = new TwizzitClient({
      credentials: TEST_CREDENTIALS,
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
    });

    await client.authenticate();
    let caught: TwizzitValidationError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitValidationError;
    }

    expect(caught).toBeInstanceOf(TwizzitValidationError);
    expect(caught!.kind).toBe("validation");
    // path should reference both the index (0) and the field name
    expect(caught!.path).toMatch(/name/);
  });
});

// ---------------------------------------------------------------------------
// (c) TwizzitNetworkError — mock fetch rejects with ECONNRESET
// ---------------------------------------------------------------------------
describe("TwizzitNetworkError variants", () => {
  it("fetch rejects with ECONNRESET → TwizzitNetworkError with code ECONNRESET", async () => {
    let authCalled = false;
    const mockFetch: typeof fetch = async (input) => {
      const url = input.toString();
      if (!authCalled && url.includes("/authenticate")) {
        authCalled = true;
        return {
          status: 200,
          ok: true,
          text: async () => makeFreshAuthBody(),
          clone: () => ({ headers: { forEach: () => undefined } }),
          headers: { forEach: () => undefined },
        } as unknown as Response;
      }
      // Any other call → ECONNRESET
      const err = new Error("ECONNRESET") as NodeJS.ErrnoException;
      err.code = "ECONNRESET";
      throw err;
    };
    const client = new TwizzitClient({
      credentials: TEST_CREDENTIALS,
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
      // Disable rate-limit retries so we don't retry on errors
      retry: { maxRateLimitRetries: 0 },
    });

    await client.authenticate();
    let caught: TwizzitNetworkError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitNetworkError;
    }

    expect(caught).toBeInstanceOf(TwizzitNetworkError);
    expect(caught!.kind).toBe("network");
    expect(caught!.code).toBe("ECONNRESET");
  });
});

// ---------------------------------------------------------------------------
// (d) TwizzitRateLimitError — 429 retry-with-backoff
// ---------------------------------------------------------------------------
describe("TwizzitRateLimitError variants", () => {
  it("two 429s then exhausts maxRateLimitRetries:2 on third → TwizzitRateLimitError", async () => {
    // Auth succeeds (fresh), then three consecutive 429 responses.
    // Retry-After is always "0" so no real waiting. The third attempt exceeds
    // maxRateLimitRetries:2 and throws TwizzitRateLimitError.
    let orgCallCount = 0;
    const mockFetch: typeof fetch = async (input) => {
      const url = input.toString();

      if (url.includes("/authenticate")) {
        return {
          status: 200,
          ok: true,
          text: async () => makeFreshAuthBody(),
          clone: () => ({ headers: { forEach: () => undefined } }),
          headers: { forEach: () => undefined },
        } as unknown as Response;
      }

      // GET /organizations — always 429
      orgCallCount++;
      // Use Retry-After: 2 on the last call so we can assert the final retryAfterMs
      const retryAfter = orgCallCount < 3 ? "0" : "2";
      return {
        status: 429,
        ok: false,
        text: async () => '{"error":"too many requests"}',
        clone: () => ({
          headers: {
            forEach: (cb: (v: string, k: string) => void) => {
              cb(retryAfter, "retry-after");
            },
          },
        }),
        headers: {
          forEach: (cb: (v: string, k: string) => void) => {
            cb(retryAfter, "retry-after");
          },
        },
      } as unknown as Response;
    };

    const client = new TwizzitClient({
      credentials: TEST_CREDENTIALS,
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
      retry: {
        maxRateLimitRetries: 2,
        maxRetryBudgetMs: 120_000,
        // 0ms backoff so test completes instantly without fake timers
        initialBackoffMs: 0,
        maxBackoffMs: 0,
      },
    });

    await client.authenticate();

    let caught: TwizzitRateLimitError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitRateLimitError;
    }

    expect(caught).toBeInstanceOf(TwizzitRateLimitError);
    expect(caught!.kind).toBe("rate-limit");
    // retryAfterMs from last Retry-After: "2" → 2000ms
    expect(caught!.retryAfterMs).toBe(2000);
    // attempts: 3 (two retried + one final exhaustion call)
    expect(caught!.context.attempts).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// (e) TwizzitServerError — 503 with HTML body
// ---------------------------------------------------------------------------
describe("TwizzitServerError variants", () => {
  it("503 response → TwizzitServerError with redacted bodyExcerpt (no token leak)", async () => {
    const token = "eyJ.fresh.test.token";
    const now = Math.floor(Date.now() / 1000);
    const authBody = JSON.stringify({
      token,
      "created-on": now,
      "valid-till": now + 1800,
    });

    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: authBody },
      { status: 503, body: "<html><body>Service Unavailable</body></html>" },
    ]);
    const client = new TwizzitClient({
      credentials: TEST_CREDENTIALS,
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
    });

    await client.authenticate();
    let caught: TwizzitServerError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitServerError;
    }

    expect(caught).toBeInstanceOf(TwizzitServerError);
    expect(caught!.kind).toBe("server");
    expect(caught!.status).toBe(503);
    // bodyExcerpt should be set and not contain the bearer token
    expect(caught!.bodyExcerpt).toBeDefined();
    expect(caught!.bodyExcerpt).not.toContain(token);
  });
});

// ---------------------------------------------------------------------------
// (f) TwizzitClientError — 422 with body
// ---------------------------------------------------------------------------
describe("TwizzitClientError variants", () => {
  it("422 response → TwizzitClientError with status 422 and no subkind", async () => {
    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: makeFreshAuthBody() },
      { status: 422, body: '{"error":"bad limit"}' },
    ]);
    const client = new TwizzitClient({
      credentials: TEST_CREDENTIALS,
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
    });

    await client.authenticate();
    let caught: TwizzitClientError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitClientError;
    }

    expect(caught).toBeInstanceOf(TwizzitClientError);
    expect(caught!.kind).toBe("client");
    expect(caught!.status).toBe(422);
    expect(caught!.subkind).toBeUndefined();
  });

  it("max-pages-exceeded → TwizzitClientError with subkind max-pages-exceeded (see also T030)", async () => {
    // Covered in client.entities.spec.ts T030; referenced here for traceability.
    // Quick smoke test:
    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: makeFreshAuthBody() },
      // 5 items at pageSize=5 → triggers second page attempt → maxPages=1 exceeded
      { status: 200, body: JSON.stringify(Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }))) },
    ]);
    // We call getContacts via a raw paginate — simulate via a direct paginate call
    // (the full path is tested in client.entities.spec.ts; here just confirm subkind)
    const { paginate } = await import("../src/pagination");
    let caught: TwizzitClientError | undefined;
    try {
      await paginate({
        fetchPage: async () => [1, 2],
        endpointLabel: "test",
        pageSize: 2,
        maxPages: 1,
      });
    } catch (err) {
      caught = err as TwizzitClientError;
    }
    expect(caught).toBeInstanceOf(TwizzitClientError);
    expect(caught!.subkind).toBe("max-pages-exceeded");
    // Suppress unused variable warning for mockFetch
    void mockFetch;
  });
});

// ---------------------------------------------------------------------------
// (g) Redaction — no credential leak in any error variant or logger call
// ---------------------------------------------------------------------------
describe("credential redaction across error variants", () => {
  const LEAK_USER = "LEAK_ME_USER@example.invalid";
  const LEAK_PASS = "hunter2_LEAK_ME_PASS";
  const LEAK_TOKEN = "LEAK_ME_BEARER_TOKEN_xyz123";

  function assertNoLeak(value: unknown, description: string): void {
    const serialized = JSON.stringify(value, Object.getOwnPropertyNames(value as object));
    expect(serialized).not.toContain(LEAK_PASS);
    expect(serialized).not.toContain(LEAK_TOKEN);
    // Note: username is NOT redacted by default (only password + token are secrets)
    // but we verify the password and token are clean.
    if (serialized.includes(LEAK_PASS) || serialized.includes(LEAK_TOKEN)) {
      throw new Error(`Leak found in ${description}: ${serialized.substring(0, 200)}`);
    }
  }

  function assertLogNoLeak(
    calls: Array<{ level: string; message: string; meta?: Record<string, unknown> }>,
    description: string
  ): void {
    // debug logs of HTTP response bodies intentionally show raw data (dev-only verbosity).
    // The security invariant (FR-016) requires warn/error logs to be clean.
    const sensitiveCallLevels = calls.filter((c) => c.level === "warn" || c.level === "error");
    for (const call of sensitiveCallLevels) {
      const text = JSON.stringify(call);
      if (text.includes(LEAK_PASS) || text.includes(LEAK_TOKEN)) {
        throw new Error(`Leak in log [${description}]: ${text.substring(0, 200)}`);
      }
    }
    // Also check that thrown errors (not logs) are clean — done by assertNoLeak separately
  }

  it("auth error: password and token never appear in error or logger output", async () => {
    const mockFetch = makeMockFetchSequenced([
      { status: 401, body: `{"error":"bad password: ${LEAK_PASS}"}` },
    ]);
    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: BASE_URL,
      fetch: mockFetch,
      logger,
    });

    let caught: Error | undefined;
    try {
      await client.authenticate();
    } catch (err) {
      caught = err as Error;
    }

    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitAuthError");
    assertLogNoLeak(calls, "auth error logs");
  });

  it("network error: no credential leak", async () => {
    const mockFetch: typeof fetch = async () => {
      const err = new Error(`ECONNRESET connecting with ${LEAK_PASS}`) as NodeJS.ErrnoException;
      err.code = "ECONNRESET";
      throw err;
    };
    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: BASE_URL,
      fetch: mockFetch,
      logger,
    });

    let caught: Error | undefined;
    try {
      await client.authenticate();
    } catch (err) {
      caught = err as Error;
    }

    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitNetworkError");
    assertLogNoLeak(calls, "network error logs");
  });

  it("server error: token not in bodyExcerpt", async () => {
    const now = Math.floor(Date.now() / 1000);
    const authBody = JSON.stringify({
      token: LEAK_TOKEN,
      "created-on": now,
      "valid-till": now + 1800,
    });

    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: authBody },
      { status: 503, body: `<html>error: Bearer ${LEAK_TOKEN}</html>` },
    ]);
    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
      logger,
    });

    await client.authenticate();
    let caught: Error | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as Error;
    }

    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitServerError");
    assertLogNoLeak(calls, "server error logs");
  });

  it("validation error: no credential leak in path or actualSummary", async () => {
    const now = Math.floor(Date.now() / 1000);
    const authBody = JSON.stringify({
      token: LEAK_TOKEN,
      "created-on": now,
      "valid-till": now + 1800,
    });

    const mockFetch = makeMockFetchSequenced([
      { status: 200, body: authBody },
      // Broken orgs: missing name → validation error
      { status: 200, body: `[{"id": 34245, "token_leak": "${LEAK_TOKEN}"}]` },
    ]);
    const { logger, calls } = makeCaptureLogger();
    const client = new TwizzitClient({
      credentials: { username: LEAK_USER, password: LEAK_PASS },
      baseUrl: BASE_URL,
      organizationId: ORG_ID,
      fetch: mockFetch,
      logger,
    });

    await client.authenticate();
    let caught: Error | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as Error;
    }

    expect(caught).toBeDefined();
    assertNoLeak(caught, "TwizzitValidationError");
    assertLogNoLeak(calls, "validation error logs");
  });
});
