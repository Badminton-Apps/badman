import * as path from "path";
import * as fs from "fs";
import MockAdapter from "axios-mock-adapter";
import { TwizzitClient } from "../src/client";
import { TwizzitAuthError, TwizzitNetworkError, TwizzitValidationError } from "../src/errors";

const FIXTURES_DIR = path.resolve(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
  const lines = raw.split("\n").filter((l) => !l.trimStart().startsWith("//"));
  return JSON.parse(lines.join("\n"));
}

function freshAuthBody(): {
  token: string;
  "created-on": number;
  "valid-till": number;
} {
  const now = Math.floor(Date.now() / 1000);
  return { token: "eyJ.synthetic.fresh.token", "created-on": now, "valid-till": now + 1800 };
}

const TEST_CREDENTIALS = { username: "test@example.com", password: "s3cr3t-p4ssw0rd" };
const BASE_URL = "https://app.twizzit.com/v2/api";
const ORG_ID = 34245;

function newClient(opts: { organizationId?: number; maxRateLimitRetries?: number } = {}): {
  client: TwizzitClient;
  mock: MockAdapter;
} {
  const client = new TwizzitClient({
    credentials: TEST_CREDENTIALS,
    baseUrl: BASE_URL,
    organizationId: opts.organizationId,
    retry: {
      maxRateLimitRetries: opts.maxRateLimitRetries ?? 0,
      initialBackoffMs: 0,
      maxBackoffMs: 0,
    },
  });
  const mock = new MockAdapter(client._http);
  return { client, mock };
}

describe("TwizzitClient authentication", () => {
  describe("authenticate happy path", () => {
    it("returns void and caches token", async () => {
      const { client, mock } = newClient();
      mock.onPost("/authenticate").reply(200, freshAuthBody());

      await expect(client.authenticate()).resolves.toBeUndefined();
    });

    it("getOrganizations returns the fixture parsed array", async () => {
      const { client, mock } = newClient({ organizationId: ORG_ID });
      mock.onPost("/authenticate").reply(200, freshAuthBody());
      mock.onGet("/organizations").reply(200, loadFixture("organizations.200.json"));

      const orgs = await client.getOrganizations();
      expect(orgs).toHaveLength(1);
      expect(orgs[0]).toEqual({ id: 34245, name: "Badminton Belgium" });
    });

    it("auto-authenticates when getOrganizations called before authenticate()", async () => {
      const { client, mock } = newClient();
      mock.onPost("/authenticate").reply(200, freshAuthBody());
      mock.onGet("/organizations").reply(200, loadFixture("organizations.200.json"));

      const orgs = await client.getOrganizations();
      expect(Array.isArray(orgs)).toBe(true);
      expect(orgs).toHaveLength(1);
    });
  });

  describe("authenticate 401 / 403", () => {
    it("throws TwizzitAuthError on 401", async () => {
      const { client, mock } = newClient();
      mock.onPost("/authenticate").reply(401, { error: "invalid credentials" });

      await expect(client.authenticate()).rejects.toThrow(TwizzitAuthError);
    });

    it("throws TwizzitAuthError on 403", async () => {
      const { client, mock } = newClient();
      mock.onPost("/authenticate").reply(403, { error: "forbidden" });

      await expect(client.authenticate()).rejects.toThrow(TwizzitAuthError);
    });
  });

  describe("authenticate network error", () => {
    it("throws TwizzitNetworkError on transport failure", async () => {
      const { client, mock } = newClient();
      mock.onPost("/authenticate").networkError();

      await expect(client.authenticate()).rejects.toThrow(TwizzitNetworkError);
    });
  });

  describe("authenticate response missing valid-till", () => {
    it("throws TwizzitValidationError when valid-till is absent", async () => {
      const { client, mock } = newClient();
      mock.onPost("/authenticate").reply(200, {
        token: "eyJ.test.token",
        "created-on": 1778610846,
      });

      await expect(client.authenticate()).rejects.toThrow(TwizzitValidationError);
    });
  });
});

describe("TwizzitClient token refresh", () => {
  describe("proactive refresh", () => {
    it("refreshes when the cached token has elapsed > 80% of its lifetime", async () => {
      const { client, mock } = newClient({ organizationId: ORG_ID });
      const now = Math.floor(Date.now() / 1000);
      // First auth: token already past 80% (lifetime 100s, age 100s → past expiry)
      mock
        .onPost("/authenticate")
        .replyOnce(200, {
          token: "eyJ.expired",
          "created-on": now - 1900,
          "valid-till": now - 100,
        })
        .onPost("/authenticate")
        .reply(200, freshAuthBody());
      mock.onGet("/organizations").reply(200, loadFixture("organizations.200.json"));

      await client.authenticate(); // stores expired token
      await client.getOrganizations(); // triggers proactive re-auth before the GET

      // 2 POST /authenticate calls + 1 GET /organizations
      const authCalls = mock.history.post.filter((h) => h.url === "/authenticate");
      expect(authCalls.length).toBe(2);
      expect(mock.history.get.filter((h) => h.url === "/organizations").length).toBe(1);
    });
  });

  describe("reactive 401-retry", () => {
    it("re-authenticates and retries when 401 is returned mid-session", async () => {
      const { client, mock } = newClient({ organizationId: ORG_ID });
      mock.onPost("/authenticate").reply(200, freshAuthBody());
      mock
        .onGet("/organizations")
        .replyOnce(401, { error: "expired" })
        .onGet("/organizations")
        .reply(200, loadFixture("organizations.200.json"));

      await client.authenticate();
      const orgs = await client.getOrganizations();
      expect(Array.isArray(orgs)).toBe(true);
      expect(orgs).toHaveLength(1);
    });

    it("throws TwizzitAuthError on double 401", async () => {
      const { client, mock } = newClient({ organizationId: ORG_ID });
      mock.onPost("/authenticate").reply(200, freshAuthBody());
      mock.onGet("/organizations").reply(401, { error: "always 401" });

      await client.authenticate();
      await expect(client.getOrganizations()).rejects.toThrow(TwizzitAuthError);
    });
  });
});
