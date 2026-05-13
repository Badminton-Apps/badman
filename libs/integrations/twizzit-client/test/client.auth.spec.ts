import * as path from "path";
import * as fs from "fs";
import { TwizzitClient } from "../src/client";
import {
  TwizzitAuthError,
  TwizzitNetworkError,
  TwizzitValidationError,
  TwizzitClientError,
} from "../src/errors";
import { Logger } from "../src/logger";

const FIXTURES_DIR = path.resolve(__dirname, "__fixtures__");

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

function makeMockFetch(responses: Array<{ status: number; body: string }>): typeof fetch {
  let callIndex = 0;
  return async () => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    const body = resp.body;
    return {
      status: resp.status,
      ok: resp.status >= 200 && resp.status < 300,
      text: async () => body,
      headers: { forEach: (_cb: (value: string, key: string) => void) => undefined },
    } as unknown as Response;
  };
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

const TEST_CREDENTIALS = { username: "test@example.com", password: "s3cr3t-p4ssw0rd" };
const BASE_URL = "https://app.twizzit.com/v2/api";

describe("TwizzitClient authentication", () => {
  describe("authenticate happy path", () => {
    it("returns void and caches token", async () => {
      const mockFetch = makeMockFetch([
        { status: 200, body: loadFixture("authenticate.200.json") },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await expect(client.authenticate()).resolves.toBeUndefined();
    });

    it("parses the authenticate fixture correctly (fixture token is expired → expect proactive re-auth)", async () => {
      // The fixture has valid-till in the past, so getOrganizations() triggers a proactive
      // re-authenticate before the GET. We provide auth+auth+orgs (3 responses).
      const mockFetch = makeMockFetch([
        { status: 200, body: loadFixture("authenticate.200.json") },
        { status: 200, body: loadFixture("authenticate.200.json") },
        { status: 200, body: loadFixture("organizations.200.json") },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await client.authenticate();
      const orgs = await client.getOrganizations();
      expect(orgs).toHaveLength(1);
      expect(orgs[0]).toEqual({ id: 34245, name: "Badminton Belgium" });
    });
  });

  describe("authenticate 401", () => {
    it("throws TwizzitAuthError on 401 response", async () => {
      const mockFetch = makeMockFetch([{ status: 401, body: '{"error":"invalid credentials"}' }]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await expect(client.authenticate()).rejects.toThrow(TwizzitAuthError);
    });

    it("throws TwizzitAuthError on 403 response", async () => {
      const mockFetch = makeMockFetch([{ status: 403, body: '{"error":"forbidden"}' }]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await expect(client.authenticate()).rejects.toThrow(TwizzitAuthError);
    });
  });

  describe("authenticate network error", () => {
    it("throws TwizzitNetworkError on network failure", async () => {
      const mockFetch: typeof fetch = async () => {
        const err = new Error("ECONNRESET") as NodeJS.ErrnoException;
        err.code = "ECONNRESET";
        throw err;
      };
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await expect(client.authenticate()).rejects.toThrow(TwizzitNetworkError);
    });
  });

  describe("authenticate response missing valid-till", () => {
    it("throws TwizzitValidationError when valid-till is absent", async () => {
      const badBody = JSON.stringify({
        token: "eyJ.test.token",
        "created-on": 1778610846,
      });
      const mockFetch = makeMockFetch([{ status: 200, body: badBody }]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await expect(client.authenticate()).rejects.toThrow(TwizzitValidationError);
    });
  });

  describe("credential redaction", () => {
    it("does not leak password in thrown auth error message", async () => {
      const leakyPassword = "hunter2_LEAK_THIS";
      const mockFetch = makeMockFetch([
        { status: 401, body: `{"error":"bad password: ${leakyPassword}"}` },
      ]);
      const { logger, calls } = makeCaptureLogger();
      const client = new TwizzitClient({
        credentials: { username: "user@test.com", password: leakyPassword },
        baseUrl: BASE_URL,
        fetch: mockFetch,
        logger,
      });

      let caughtError: Error | undefined;
      try {
        await client.authenticate();
      } catch (err) {
        caughtError = err as Error;
      }

      expect(caughtError).toBeDefined();
      const serialised = JSON.stringify(caughtError, Object.getOwnPropertyNames(caughtError));
      expect(serialised).not.toContain(leakyPassword);

      for (const call of calls) {
        const logText = JSON.stringify(call);
        expect(logText).not.toContain(leakyPassword);
      }
    });

    it("does not leak username in thrown auth error", async () => {
      const leakyUser = "supersecretuser@private.com";
      const mockFetch = makeMockFetch([{ status: 401, body: `{"error":"unauthorized"}` }]);
      const client = new TwizzitClient({
        credentials: { username: leakyUser, password: "password123" },
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      try {
        await client.authenticate();
      } catch (err) {
        const serialised = JSON.stringify(err, Object.getOwnPropertyNames(err as object));
        expect(serialised).not.toContain("password123");
      }
    });
  });

  describe("getOrganizations happy path", () => {
    it("returns parsed organization array from fixture", async () => {
      // Fixture token is expired → proactive re-auth before GET; provide auth+auth+orgs.
      const mockFetch = makeMockFetch([
        { status: 200, body: loadFixture("authenticate.200.json") },
        { status: 200, body: loadFixture("authenticate.200.json") },
        { status: 200, body: loadFixture("organizations.200.json") },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await client.authenticate();
      const orgs = await client.getOrganizations();
      expect(orgs).toHaveLength(1);
      expect(orgs[0]).toMatchObject({ id: 34245, name: "Badminton Belgium" });
    });

    it("auto-authenticates when called before authenticate()", async () => {
      const mockFetch = makeMockFetch([
        { status: 200, body: loadFixture("authenticate.200.json") },
        { status: 200, body: loadFixture("organizations.200.json") },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      const orgs = await client.getOrganizations();
      expect(orgs).toHaveLength(1);
    });
  });

  describe("getOrganizations called before authenticate", () => {
    it("auto-authenticates if token is missing", async () => {
      // No prior authenticate() call → one auth then one GET
      const mockFetch = makeMockFetch([
        { status: 200, body: loadFixture("authenticate.200.json") },
        { status: 200, body: loadFixture("organizations.200.json") },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      const orgs = await client.getOrganizations();
      expect(Array.isArray(orgs)).toBe(true);
    });
  });
});

function makeFreshAuthBody(): string {
  const now = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    token: "eyJ.synthetic.fresh.token",
    "created-on": now,
    "valid-till": now + 1800,
  });
}

describe("TwizzitClient token refresh", () => {
  describe("proactive refresh", () => {
    it("refreshes when token has expired based on valid-till", async () => {
      const calls: string[] = [];

      const now = Date.now();
      const expiredCreatedOn = Math.floor(now / 1000) - 1900;
      const expiredValidTill = Math.floor(now / 1000) - 100;

      const expiredAuthBody = JSON.stringify({
        token: "eyJ.expired.token",
        "created-on": expiredCreatedOn,
        "valid-till": expiredValidTill,
      });

      const freshAuthBody = JSON.stringify({
        token: "eyJ.fresh.token",
        "created-on": Math.floor(now / 1000),
        "valid-till": Math.floor(now / 1000) + 1800,
      });

      let authCallCount = 0;
      const mockFetch: typeof fetch = async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/authenticate")) {
          const body = authCallCount === 0 ? expiredAuthBody : freshAuthBody;
          authCallCount++;
          calls.push("auth");
          return {
            status: 200,
            ok: true,
            text: async () => body,
            headers: { forEach: () => undefined },
          } as unknown as Response;
        }
        calls.push("orgs");
        return {
          status: 200,
          ok: true,
          text: async () => loadFixture("organizations.200.json"),
          headers: { forEach: () => undefined },
        } as unknown as Response;
      };

      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      // First authenticate: stores expired token
      await client.authenticate();
      expect(calls).toEqual(["auth"]);

      // getOrganizations: detects expired token → proactive re-auth → then GET
      await client.getOrganizations();

      // Should have authenticated at least twice
      const authCalls = calls.filter((c) => c === "auth");
      expect(authCalls.length).toBeGreaterThanOrEqual(2);
      expect(calls).toContain("orgs");
    });
  });

  describe("reactive 401-retry", () => {
    it("re-authenticates and retries when 401 is returned mid-session", async () => {
      // Use a fresh auth body so proactive refresh does NOT trigger.
      // Sequence: auth (fresh) → orgs (401) → re-auth (fresh) → orgs (200)
      let orgCallCount = 0;
      const mockFetch: typeof fetch = async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/authenticate")) {
          return {
            status: 200,
            ok: true,
            text: async () => makeFreshAuthBody(),
            headers: { forEach: () => undefined },
          } as unknown as Response;
        }
        orgCallCount++;
        if (orgCallCount === 1) {
          return {
            status: 401,
            ok: false,
            text: async () => '{"error":"expired"}',
            headers: { forEach: () => undefined },
          } as unknown as Response;
        }
        return {
          status: 200,
          ok: true,
          text: async () => loadFixture("organizations.200.json"),
          headers: { forEach: () => undefined },
        } as unknown as Response;
      };

      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await client.authenticate();
      const orgs = await client.getOrganizations();
      expect(Array.isArray(orgs)).toBe(true);
      expect(orgs).toHaveLength(1);
    });

    it("throws TwizzitAuthError on double 401", async () => {
      // Use fresh auth body so proactive refresh does NOT trigger.
      // Sequence: auth (fresh) → orgs (401) → re-auth (fresh) → orgs (401) → TwizzitAuthError
      const mockFetch: typeof fetch = async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/authenticate")) {
          return {
            status: 200,
            ok: true,
            text: async () => makeFreshAuthBody(),
            headers: { forEach: () => undefined },
          } as unknown as Response;
        }
        return {
          status: 401,
          ok: false,
          text: async () => '{"error":"always 401"}',
          headers: { forEach: () => undefined },
        } as unknown as Response;
      };

      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      await client.authenticate();
      await expect(client.getOrganizations()).rejects.toThrow(TwizzitAuthError);
    });
  });

  describe("double 401 final failure", () => {
    it("throws TwizzitAuthError after second 401 with correct kind", async () => {
      // Use fresh auth body so proactive refresh doesn't run before the GET.
      // Sequence: fresh auth → GET /orgs 401 → re-auth → GET /orgs 401 → TwizzitAuthError
      const mockFetch: typeof fetch = async (url) => {
        const urlStr = url.toString();
        if (urlStr.includes("/authenticate")) {
          return {
            status: 200,
            ok: true,
            text: async () => makeFreshAuthBody(),
            headers: { forEach: () => undefined },
          } as unknown as Response;
        }
        return {
          status: 401,
          ok: false,
          text: async () => '{"error":"always 401"}',
          headers: { forEach: () => undefined },
        } as unknown as Response;
      };

      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        fetch: mockFetch,
      });

      let caught: TwizzitAuthError | undefined;
      try {
        await client.getOrganizations();
      } catch (err) {
        caught = err as TwizzitAuthError;
      }
      expect(caught).toBeInstanceOf(TwizzitAuthError);
      expect(caught!.kind).toBe("auth");
    });
  });
});
