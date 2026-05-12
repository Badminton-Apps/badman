import { TwizzitClient } from "../src/client";

const RUN_LIVE = process.env["RUN_TWIZZIT_LIVE_TESTS"] === "1";

describe.skip("TwizzitClient — live mode (RUN_TWIZZIT_LIVE_TESTS=1)", () => {
  if (!RUN_LIVE) {
    it.skip("skipped: set RUN_TWIZZIT_LIVE_TESTS=1 to run live tests", () => undefined);
    return;
  }

  const username = process.env["TWIZZIT_USERNAME"];
  const password = process.env["TWIZZIT_PASSWORD"];

  if (!username || !password) {
    it.skip("skipped: TWIZZIT_USERNAME and TWIZZIT_PASSWORD must be set", () => undefined);
    return;
  }

  let client: TwizzitClient;

  beforeAll(() => {
    client = new TwizzitClient({
      credentials: { username, password },
    });
  });

  it("authenticate() resolves without throwing", async () => {
    await expect(client.authenticate()).resolves.toBeUndefined();
  });

  it("getOrganizations() returns array containing Badminton Belgium", async () => {
    const orgs = await client.getOrganizations();
    expect(Array.isArray(orgs)).toBe(true);
    const bb = orgs.find((o) => o.id === 34245);
    expect(bb).toBeDefined();
    expect(bb?.name).toBe("Badminton Belgium");
  });
});

if (RUN_LIVE) {
  const username = process.env["TWIZZIT_USERNAME"];
  const password = process.env["TWIZZIT_PASSWORD"];

  if (!username || !password) {
    describe("TwizzitClient — live mode", () => {
      it.skip("TWIZZIT_USERNAME and TWIZZIT_PASSWORD must be set to run live tests", () => undefined);
    });
  } else {
    describe("TwizzitClient — live mode (RUN_TWIZZIT_LIVE_TESTS=1)", () => {
      let client: TwizzitClient;

      beforeAll(() => {
        client = new TwizzitClient({ credentials: { username, password } });
      });

      it("authenticate() resolves", async () => {
        await expect(client.authenticate()).resolves.toBeUndefined();
      });

      it("getOrganizations() includes { id: 34245, name: 'Badminton Belgium' }", async () => {
        const orgs = await client.getOrganizations();
        const bb = orgs.find((o) => o.id === 34245);
        expect(bb).toBeDefined();
        expect(bb?.name).toBe("Badminton Belgium");
      });
    });
  }
}
