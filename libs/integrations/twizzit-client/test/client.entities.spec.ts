import * as path from "path";
import * as fs from "fs";
import MockAdapter from "axios-mock-adapter";
import { TwizzitClient } from "../src/client";
import { TwizzitValidationError, TwizzitClientError } from "../src/errors";
import { getMemberId } from "../src/schemas/contact";

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

function newClient(): { client: TwizzitClient; mock: MockAdapter } {
  const client = new TwizzitClient({
    credentials: TEST_CREDENTIALS,
    baseUrl: BASE_URL,
    organizationId: ORG_ID,
    retry: { maxRateLimitRetries: 0, initialBackoffMs: 0, maxBackoffMs: 0 },
  });
  const mock = new MockAdapter(client._http);
  mock.onPost("/authenticate").reply(200, freshAuthBody());
  return { client, mock };
}

describe("TwizzitClient entities", () => {
  describe("getMembershipTypes", () => {
    it("returns the expected 7 BV types with localised names", async () => {
      const { client, mock } = newClient();
      mock.onGet("/membershipTypes").reply(200, loadFixture("membership-types.200.json"));

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
      const { client, mock } = newClient();
      mock.onGet("/extra-fields").reply(200, loadFixture("extra-fields.200.json"));

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
      const { client, mock } = newClient();
      mock.onGet("/contacts").reply(200, loadFixture("contacts.page-1.200.json"));

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 10 });

      expect(contacts).toHaveLength(5);
      expect(contacts[0].id).toBe(6348001);
      expect(contacts[0].name).toBe("Test One");
      expect(contacts[0].gender).toBe("M");
    });
  });

  describe("getContacts with broken fixture", () => {
    it("throws TwizzitValidationError whose path mentions gender", async () => {
      const { client, mock } = newClient();
      mock.onGet("/contacts").reply(200, loadFixture("contacts.broken.json"));

      await client.authenticate();

      let caught: TwizzitValidationError | undefined;
      try {
        await client.getContacts({ pageSize: 10 });
      } catch (err) {
        caught = err as TwizzitValidationError;
      }

      expect(caught).toBeInstanceOf(TwizzitValidationError);
      expect(caught!.kind).toBe("validation");
      expect(caught!.path).toMatch(/gender/);
    });
  });

  describe("getContacts two-page pagination", () => {
    it("stitches two pages into one array", async () => {
      const { client, mock } = newClient();
      // page 1 (5 items) on offset=0, page 2 (2 items) on offset=5
      mock
        .onGet("/contacts", { params: { limit: 5, offset: 0, "organization-ids": [ORG_ID] } })
        .reply(200, loadFixture("contacts.page-1.200.json"))
        .onGet("/contacts", { params: { limit: 5, offset: 5, "organization-ids": [ORG_ID] } })
        .reply(200, loadFixture("contacts.page-2.200.json"));

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 5 });

      expect(contacts).toHaveLength(7);
      expect(contacts[0].id).toBe(6348001);
      expect(contacts[5].id).toBe(6348006);
      expect(contacts[6].id).toBe(6348007);
    });
  });

  describe("getMemberships happy path", () => {
    it("returns memberships including a Loan-type row and normalises empty end-date to null", async () => {
      const { client, mock } = newClient();
      mock.onGet("/memberships").reply(200, loadFixture("memberships.page-1.200.json"));

      await client.authenticate();
      const memberships = await client.getMemberships({ pageSize: 10 });

      expect(memberships.length).toBeGreaterThan(0);

      const loanRow = memberships.find((m) => m["membership-type-id"] === 57915);
      expect(loanRow).toBeDefined();
      expect(loanRow!["contact-id"]).toBe(6348001);

      const emptyEndDate = memberships.find((m) => m.id === 6437001);
      expect(emptyEndDate).toBeDefined();
      expect(emptyEndDate!["end-date"]).toBeNull();
    });
  });

  describe("getMemberId helper", () => {
    it("returns the embedded Member ID value", async () => {
      const { client, mock } = newClient();
      mock.onGet("/contacts").reply(200, loadFixture("contacts.page-1.200.json"));

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 10 });

      const contactWithMemberId = contacts.find((c) => c.id === 6348001);
      expect(contactWithMemberId).toBeDefined();
      expect(getMemberId(contactWithMemberId!)).toBe("50000001");
    });

    it("returns null when contact has no Member ID extra field", async () => {
      const { client, mock } = newClient();
      mock.onGet("/contacts").reply(200, loadFixture("contacts.page-1.200.json"));

      await client.authenticate();
      const contacts = await client.getContacts({ pageSize: 10 });

      const contactWithoutMemberId = contacts.find((c) => c.id === 6348002);
      expect(contactWithoutMemberId).toBeDefined();
      expect(getMemberId(contactWithoutMemberId!)).toBeNull();
    });
  });
});

describe("TwizzitClient pagination edge cases", () => {
  it("forwards pageSize as limit query param", async () => {
    const { client, mock } = newClient();
    mock.onGet("/contacts").reply(200, []);

    await client.authenticate();
    await client.getContacts({ pageSize: 50 });

    const contactCall = mock.history.get.find((h) => h.url === "/contacts");
    expect(contactCall).toBeDefined();
    expect(contactCall!.params).toMatchObject({ limit: 50, offset: 0 });
  });

  it("throws TwizzitClientError with subkind max-pages-exceeded when limit is reached", async () => {
    const { client, mock } = newClient();
    // Always return a full page → triggers further iteration → maxPages=1 trips
    mock.onGet("/contacts").reply(200, loadFixture("contacts.page-1.200.json"));

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

  it("forwards lastModified as a query param", async () => {
    const { client, mock } = newClient();
    mock.onGet("/contacts").reply(200, []);

    const lastModified = new Date("2024-01-01T00:00:00.000Z");
    await client.authenticate();
    await client.getContacts({ lastModified });

    const contactCall = mock.history.get.find((h) => h.url === "/contacts");
    expect(contactCall).toBeDefined();
    expect(contactCall!.params).toMatchObject({
      "last-modified": "2024-01-01T00:00:00.000Z",
    });
  });
});
