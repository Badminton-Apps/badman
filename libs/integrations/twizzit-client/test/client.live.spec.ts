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
 *   RUN_TWIZZIT_LIVE_TESTS=1 npx dotenv -e .env -- nx test integrations-twizzit-client --skip-nx-cache --testPathPattern '\.live\.spec\.ts$'
 */
import { TwizzitClient } from "../src/client";

const RUN_LIVE = process.env["RUN_TWIZZIT_LIVE_TESTS"] === "1";
const username = process.env["TWIZZIT_API_USER"];
const password = process.env["TWIZZIT_API_PASS"];
const baseUrl = process.env["TWIZZIT_API"];

const describeLive: jest.Describe = RUN_LIVE && username && password ? describe : describe.skip;

describeLive("TwizzitClient — live (RUN_TWIZZIT_LIVE_TESTS=1)", () => {
  let client: TwizzitClient;

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
});

if (RUN_LIVE && (!username || !password)) {
  // Print a clear error when the gate is on but credentials are missing.
  describe("TwizzitClient — live (misconfigured)", () => {
    it.skip("TWIZZIT_API_USER and TWIZZIT_API_PASS must both be set when RUN_TWIZZIT_LIVE_TESTS=1", () =>
      undefined);
  });
}
