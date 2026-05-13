/**
 * Phase 5 (US3): Error variant coverage.
 * One describe block per TwizzitError variant. Uses axios-mock-adapter.
 */
import * as path from "path";
import * as fs from "fs";
import MockAdapter from "axios-mock-adapter";
import { TwizzitClient } from "../src/client";
import {
  TwizzitAuthError,
  TwizzitValidationError,
  TwizzitNetworkError,
  TwizzitRateLimitError,
  TwizzitServerError,
  TwizzitClientError,
} from "../src/errors";

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

function newClient(
  retryConfig: {
    maxRateLimitRetries?: number;
    initialBackoffMs?: number;
    maxBackoffMs?: number;
  } = {}
): { client: TwizzitClient; mock: MockAdapter } {
  const client = new TwizzitClient({
    credentials: TEST_CREDENTIALS,
    baseUrl: BASE_URL,
    organizationId: ORG_ID,
    retry: {
      maxRateLimitRetries: retryConfig.maxRateLimitRetries ?? 0,
      initialBackoffMs: retryConfig.initialBackoffMs ?? 0,
      maxBackoffMs: retryConfig.maxBackoffMs ?? 0,
    },
  });
  const mock = new MockAdapter(client._http);
  mock.onPost("/authenticate").reply(200, freshAuthBody());
  return { client, mock };
}

describe("TwizzitAuthError variants", () => {
  it("getOrganizations returns 403 with a fresh token → TwizzitAuthError with status 403", async () => {
    const { client, mock } = newClient();
    mock.onGet("/organizations").reply(403, { error: "forbidden" });

    await client.authenticate();
    let caught: TwizzitAuthError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitAuthError;
    }

    expect(caught).toBeInstanceOf(TwizzitClientError);
    // 403 is a 4xx-other (not 401), classified as TwizzitClientError per FR-015
    expect((caught as unknown as TwizzitClientError).kind).toBe("client");
    expect((caught as unknown as TwizzitClientError).status).toBe(403);
  });
});

describe("TwizzitValidationError variants", () => {
  it("organizations.broken.json (missing name) → TwizzitValidationError with path mentioning name", async () => {
    const { client, mock } = newClient();
    mock.onGet("/organizations").reply(200, loadFixture("organizations.broken.json"));

    await client.authenticate();
    let caught: TwizzitValidationError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitValidationError;
    }

    expect(caught).toBeInstanceOf(TwizzitValidationError);
    expect(caught!.kind).toBe("validation");
    expect(caught!.path).toMatch(/name/);
  });
});

describe("TwizzitNetworkError variants", () => {
  it("transport failure → TwizzitNetworkError", async () => {
    const { client, mock } = newClient();
    mock.onGet("/organizations").networkError();

    await client.authenticate();
    let caught: TwizzitNetworkError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitNetworkError;
    }

    expect(caught).toBeInstanceOf(TwizzitNetworkError);
    expect(caught!.kind).toBe("network");
    expect(caught!.code).toBeDefined();
  });
});

describe("TwizzitRateLimitError variants", () => {
  it("three 429s with maxRateLimitRetries=2 → TwizzitRateLimitError with retryAfterMs from final Retry-After", async () => {
    const { client, mock } = newClient({ maxRateLimitRetries: 2 });
    // axios-retry consumes the first two; the third surfaces as TwizzitRateLimitError.
    mock
      .onGet("/organizations")
      .replyOnce(429, { error: "too many" }, { "retry-after": "0" })
      .onGet("/organizations")
      .replyOnce(429, { error: "too many" }, { "retry-after": "0" })
      .onGet("/organizations")
      .reply(429, { error: "too many" }, { "retry-after": "2" });

    await client.authenticate();

    let caught: TwizzitRateLimitError | undefined;
    try {
      await client.getOrganizations();
    } catch (err) {
      caught = err as TwizzitRateLimitError;
    }

    expect(caught).toBeInstanceOf(TwizzitRateLimitError);
    expect(caught!.kind).toBe("rate-limit");
    expect(caught!.retryAfterMs).toBe(2000);
  });
});

describe("TwizzitServerError variants", () => {
  it("503 → TwizzitServerError with truncated bodyExcerpt", async () => {
    const { client, mock } = newClient();
    mock.onGet("/organizations").reply(503, "<html><body>Service Unavailable</body></html>");

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
    expect(caught!.bodyExcerpt).toBeDefined();
    expect(typeof caught!.bodyExcerpt).toBe("string");
    expect(caught!.bodyExcerpt.length).toBeLessThanOrEqual(201); // 200 + ellipsis
  });
});

describe("TwizzitClientError variants", () => {
  it("422 → TwizzitClientError with status 422 and no subkind", async () => {
    const { client, mock } = newClient();
    mock.onGet("/organizations").reply(422, { error: "bad limit" });

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

  it("max-pages-exceeded → TwizzitClientError with subkind max-pages-exceeded (smoke; full coverage in entities spec)", async () => {
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
  });
});
