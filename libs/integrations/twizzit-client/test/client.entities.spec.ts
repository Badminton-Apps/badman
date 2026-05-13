import * as path from "path";
import * as fs from "fs";
import { TwizzitClient } from "../src/client";
import {
  TwizzitValidationError,
  TwizzitClientError,
} from "../src/errors";
import { Logger } from "../src/logger";
import { getMemberId } from "../src/schemas/contact";

const FIXTURES_DIR = path.resolve(__dirname, "__fixtures__");

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

// Strip the leading comment line that starts with "//" before parsing as JSON
function loadFixtureJson(name: string): unknown {
  const raw = loadFixture(name);
  const lines = raw.split("\n");
  const filtered = lines.filter((l) => !l.trimStart().startsWith("//"));
  return JSON.parse(filtered.join("\n"));
}

function makeFreshAuthBody(): string {
  const now = Math.floor(Date.now() / 1000);
  return JSON.stringify({
    token: "eyJ.synthetic.fresh.token",
    "created-on": now,
    "valid-till": now + 1800,
  });
}

function makeMockFetchByUrl(
  routes: Record<string, { status: number; body: string }>
): typeof fetch {
  return async (input) => {
    const urlStr = input.toString();
    const matchingKey = Object.keys(routes).find((k) => urlStr.includes(k));
    const resp = matchingKey
      ? routes[matchingKey]
      : { status: 404, body: '{"error":"not found"}' };
    const body = resp.body;
    return {
      status: resp.status,
      ok: resp.status >= 200 && resp.status < 300,
      text: async () => body,
      headers: { forEach: (_cb: (value: string, key: string) => void) => undefined },
    } as unknown as Response;
  };
}

type FetchCall = { url: string };

function makeMockFetchSequenced(
  responses: Array<{ status: number; body: string; urlMatch?: string }>
): { fetchFn: typeof fetch; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  let idx = 0;
  const fetchFn: typeof fetch = async (input) => {
    const urlStr = input.toString();
    calls.push({ url: urlStr });
    const resp = responses[idx] ?? responses[responses.length - 1];
    idx++;
    const body = resp.body;
    return {
      status: resp.status,
      ok: resp.status >= 200 && resp.status < 300,
      text: async () => body,
      headers: { forEach: (_cb: (value: string, key: string) => void) => undefined },
    } as unknown as Response;
  };
  return { fetchFn, calls };
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
const ORG_ID = 34245;

describe("TwizzitClient entities", () => {
  describe("getMembershipTypes", () => {
    it("returns the expected 7 BV types with localised names", async () => {
      // auth + membershipTypes (organizationId pre-set, so no orgs call)
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("membership-types.200.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      const types = await client.getMembershipTypes();

      expect(types).toHaveLength(7);

      const competitive = types.find((t) => t.id === 51774);
      expect(competitive).toBeDefined();
      expect(competitive!.name.EN).toBe("Competitive member");
      expect(competitive!.name.NL).toBe("Competitiespeler");
      expect(competitive!.name.FR).toBe("Compétiteur");
      expect(competitive!.type).toBe("Continuously");

      const trial = types.find((t) => t.id === 57922);
      expect(trial).toBeDefined();
      expect(trial!.type).toBe("Fixed length");
      expect(trial!.duration).toBe(21);
      expect(trial!["duration-unit"]).toBe("Days");

      const unbound = types.find((t) => t.id === 72908);
      expect(unbound).toBeDefined();
      expect(unbound!.type).toBe("Fixed end date");
      expect(unbound!["end-date"]).toBe("09-07");
      expect(unbound!["transfer-date"]).toBe("04-01");
    });
  });

  describe("getExtraFields", () => {
    it("returns at least one entry whose name.EN === 'Member ID'", async () => {
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("extra-fields.200.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      const fields = await client.getExtraFields();

      expect(Array.isArray(fields)).toBe(true);
      const memberIdField = fields.find((f) => f.name.EN === "Member ID");
      expect(memberIdField).toBeDefined();
      expect(memberIdField!.id).toBe(41763);
      expect(memberIdField!.type).toBe("Text");
      expect(memberIdField!.location).toBe("Contact");
    });
  });

  describe("getContacts happy path", () => {
    it("parses a single page of contacts from fixture", async () => {
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.page-1.200.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      // pageSize=5 → page-1 has exactly 5 records → will try page-2
      // but since we only provide one response, the second call returns the same
      // Use pageSize=10 to get everything in one page (page-1 has 5 items < 10)
      const contacts = await client.getContacts({ pageSize: 10 });

      expect(contacts).toHaveLength(5);
      expect(contacts[0].id).toBe(6348001);
      expect(contacts[0].name).toBe("Test One");
      expect(contacts[0].gender).toBe("M");
    });
  });

  describe("getContacts with broken fixture", () => {
    it("throws TwizzitValidationError whose path mentions gender", async () => {
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.broken.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();

      let caught: TwizzitValidationError | undefined;
      try {
        await client.getContacts({ pageSize: 10 });
      } catch (err) {
        caught = err as TwizzitValidationError;
      }

      expect(caught).toBeInstanceOf(TwizzitValidationError);
      expect(caught!.kind).toBe("validation");
      // path should contain "gender" (index + field)
      expect(caught!.path).toMatch(/gender/);
    });
  });

  describe("getContacts two-page pagination", () => {
    it("stitches two pages into one array", async () => {
      // page-1 has 5 items; pageSize=5 → loop continues; page-2 has 2 items < 5 → terminates
      const { fetchFn, calls } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() }, // auth
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.page-1.200.json")) }, // page 1 offset=0
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.page-2.200.json")) }, // page 2 offset=5
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 5 });

      expect(contacts).toHaveLength(7);
      expect(contacts[0].id).toBe(6348001);
      expect(contacts[5].id).toBe(6348006);
      expect(contacts[6].id).toBe(6348007);

      // Check the two paginated URLs were called
      const contactCalls = calls.filter((c) => c.url.includes("/contacts"));
      expect(contactCalls[0].url).toContain("offset=0");
      expect(contactCalls[1].url).toContain("offset=5");
    });
  });

  describe("getMemberships happy path", () => {
    it("returns memberships including a Loan-type row", async () => {
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("memberships.page-1.200.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      const memberships = await client.getMemberships({ pageSize: 10 });

      expect(memberships.length).toBeGreaterThan(0);

      // The fixture has one Loan player row (membership-type-id: 57915)
      const loanRow = memberships.find((m) => m["membership-type-id"] === 57915);
      expect(loanRow).toBeDefined();
      expect(loanRow!["contact-id"]).toBe(6348001);

      // end-date "" should be normalised to null
      const emptyEndDate = memberships.find((m) => m.id === 6437001);
      expect(emptyEndDate).toBeDefined();
      expect(emptyEndDate!["end-date"]).toBeNull();
    });
  });

  describe("getMemberId helper", () => {
    it("returns the embedded Member ID value", async () => {
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.page-1.200.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 10 });

      const contactWithMemberId = contacts.find((c) => c.id === 6348001);
      expect(contactWithMemberId).toBeDefined();
      expect(getMemberId(contactWithMemberId!)).toBe("50000001");
    });

    it("returns null when contact has no Member ID extra field", async () => {
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.page-1.200.json")) },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 10 });

      const contactWithoutMemberId = contacts.find((c) => c.id === 6348002);
      expect(contactWithoutMemberId).toBeDefined();
      expect(getMemberId(contactWithoutMemberId!)).toBeNull();
    });
  });
});

describe("TwizzitClient pagination edge cases", () => {
  describe("pageSize forwarded as limit query param", () => {
    it("forwards pageSize=50 as limit=50 in URL", async () => {
      const { fetchFn, calls } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        // Return empty page so it terminates
        { status: 200, body: "[]" },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();
      await client.getContacts({ pageSize: 50 });

      const contactCalls = calls.filter((c) => c.url.includes("/contacts"));
      expect(contactCalls[0].url).toContain("limit=50");
      expect(contactCalls[0].url).toContain("offset=0");
    });
  });

  describe("maxPages overflow", () => {
    it("throws TwizzitClientError with subkind max-pages-exceeded when maxPages is 1 and data spans 2 pages", async () => {
      // page-1 returns 5 items, pageSize=5 → loop would try page-2, but maxPages=1 → throws
      const { fetchFn } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: JSON.stringify(loadFixtureJson("contacts.page-1.200.json")) },
        // This should not be reached — exception thrown before second fetch
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      await client.authenticate();

      let caught: TwizzitClientError | undefined;
      try {
        await client.getContacts({ pageSize: 5, maxPages: 1 });
      } catch (err) {
        caught = err as TwizzitClientError;
      }

      expect(caught).toBeInstanceOf(TwizzitClientError);
      expect(caught!.kind).toBe("client");
      expect(caught!.subkind).toBe("max-pages-exceeded");
    });
  });

  describe("lastModified forwarded as query param", () => {
    it("includes last-modified param in the URL when provided", async () => {
      const { fetchFn, calls } = makeMockFetchSequenced([
        { status: 200, body: makeFreshAuthBody() },
        { status: 200, body: "[]" },
      ]);
      const client = new TwizzitClient({
        credentials: TEST_CREDENTIALS,
        baseUrl: BASE_URL,
        organizationId: ORG_ID,
        fetch: fetchFn,
      });

      const lastModified = new Date("2024-01-01T00:00:00.000Z");
      await client.authenticate();
      await client.getContacts({ lastModified });

      const contactCalls = calls.filter((c) => c.url.includes("/contacts"));
      expect(contactCalls[0].url).toContain("last-modified=");
      expect(contactCalls[0].url).toContain("2024-01-01");
    });
  });
});
