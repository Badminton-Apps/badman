/**
 * Live-mode tests — exercise the real Twizzit staging API.
 *
 * Gate: `RUN_TWIZZIT_LIVE_TESTS=1`.
 * Env (existing project convention; see .env.example): `TWIZZIT_API_USER`,
 * `TWIZZIT_API_PASS`, optional `TWIZZIT_API` (base URL override).
 *
 * Run:
 *   RUN_TWIZZIT_LIVE_TESTS=1 \
 *   TWIZZIT_API_USER=... TWIZZIT_API_PASS=... \
 *   npx nx test integrations-twizzit-client --skip-nx-cache --testPathPattern '\.live\.spec\.ts$'
 *
 * Or, if your .env already has these set:
 *   RUN_TWIZZIT_LIVE_TESTS=1 npx dotenv -e .env -- nx test integrations-twizzit-client \
 *     --skip-nx-cache --testPathPattern '\.live\.spec\.ts$'
 *
 * Purpose: validate that our zod schemas match Twizzit's live wire format.
 * Strict-everywhere zod will throw TwizzitValidationError on any drift; that's
 * the desired behaviour and the highest-leverage use of credentials.
 */
import { TwizzitClient } from "../src/client";

const RUN_LIVE = process.env["RUN_TWIZZIT_LIVE_TESTS"] === "1";
const username = process.env["TWIZZIT_API_USER"];
const password = process.env["TWIZZIT_API_PASS"];
const baseUrl = process.env["TWIZZIT_API"];

const describeLive: jest.Describe = RUN_LIVE && username && password ? describe : describe.skip;

describeLive("TwizzitClient — live (RUN_TWIZZIT_LIVE_TESTS=1)", () => {
  let client: TwizzitClient;

  // Network can be slow; widen the per-test timeout for paginated pulls.
  jest.setTimeout(60_000);

  beforeAll(() => {
    client = new TwizzitClient({
      credentials: { username: username as string, password: password as string },
      baseUrl,
    });
  });

  it("authenticate() resolves", async () => {
    await expect(client.authenticate()).resolves.toBeUndefined();
  });

  it("getOrganizations() includes { id: 34245, name: 'Badminton Belgium' }", async () => {
    const orgs = await client.getOrganizations();
    expect(Array.isArray(orgs)).toBe(true);
    const bb = orgs.find((o) => o.id === 34245);
    expect(bb).toBeDefined();
    expect(bb?.name).toBe("Badminton Belgium");
  });

  it("getMembershipTypes() returns the federation's catalogue and parses cleanly", async () => {
    const types = await client.getMembershipTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(types.length).toBeGreaterThan(0);
    // Spot-check the known BV competitive type (id 51774, per api-exploration.md).
    const competitive = types.find((t) => t.id === 51774);
    if (competitive) {
      expect(competitive.name.en).toBe("Competitive member");
      expect(competitive.name.nl).toBe("Competitiespeler");
    }
    // Log the catalogue for manual inspection; tests don't depend on exact count.
    // eslint-disable-next-line no-console
    console.log(
      "[live] membershipTypes:",
      types.map((t) => ({ id: t.id, en: t.name.en }))
    );
  });

  it("getExtraFields() returns the field catalogue including 'Member ID'", async () => {
    const fields = await client.getExtraFields();
    expect(Array.isArray(fields)).toBe(true);
    expect(fields.length).toBeGreaterThan(0);
    const memberIdField = fields.find((f) => f.name.en === "Member ID");
    expect(memberIdField).toBeDefined();
    // eslint-disable-next-line no-console
    console.log(
      "[live] extraFields count:",
      fields.length,
      "; sample names:",
      fields.slice(0, 5).map((f) => f.name.en)
    );
  });

  it("getContacts({ maxPages: 1 }) returns one page parsed cleanly", async () => {
    const contacts = await client.getContacts({ pageSize: 50, maxPages: 1 });
    expect(Array.isArray(contacts)).toBe(true);
    // If the page is non-empty, spot-check the generic shape.
    if (contacts.length > 0) {
      const sample = contacts[0];
      expect(typeof sample.id).toBe("number");
      expect(typeof sample.fullName).toBe("string");
      expect(sample.address.country).toBeDefined();
      expect(sample.address.country.en).toBeDefined();
      // Either array of zero or more emails; the structure must hold.
      expect(Array.isArray(sample.emails)).toBe(true);
      expect(Array.isArray(sample.mobiles)).toBe(true);
      expect(Array.isArray(sample.extraFields)).toBe(true);
    }
    // eslint-disable-next-line no-console
    console.log(
      "[live] contacts page-1 count:",
      contacts.length,
      "; sample memberIds:",
      contacts.slice(0, 3).map((c) => c.memberId)
    );
  });

  it("getMemberships({ maxPages: 1 }) returns one page parsed cleanly", async () => {
    const memberships = await client.getMemberships({ pageSize: 50, maxPages: 1 });
    expect(Array.isArray(memberships)).toBe(true);
    if (memberships.length > 0) {
      const sample = memberships[0];
      expect(typeof sample.id).toBe("number");
      expect(typeof sample.contactId).toBe("number");
      expect(typeof sample.membershipTypeId).toBe("number");
      expect(typeof sample.startDate).toBe("string");
      // clubId is nullable per Swagger; endDate is nullable (wire "" → null).
      expect(sample.clubId === null || typeof sample.clubId === "number").toBe(true);
      expect(sample.endDate === null || typeof sample.endDate === "string").toBe(true);
    }
    // eslint-disable-next-line no-console
    console.log(
      "[live] memberships page-1 count:",
      memberships.length,
      "; type-id histogram:",
      Object.entries(
        memberships.reduce<Record<string, number>>((acc, m) => {
          const key = String(m.membershipTypeId);
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {})
      )
    );
  });
});

if (RUN_LIVE && (!username || !password)) {
  describe("TwizzitClient — live (misconfigured)", () => {
    it.skip("TWIZZIT_API_USER and TWIZZIT_API_PASS must both be set when RUN_TWIZZIT_LIVE_TESTS=1", () =>
      undefined);
  });
}
