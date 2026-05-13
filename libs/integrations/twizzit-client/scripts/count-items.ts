import { TwizzitClient } from "../src/client";

const username = process.env["TWIZZIT_API_USER"]!;
const password = process.env["TWIZZIT_API_PASS"]!;
const baseUrl   = process.env["TWIZZIT_API"];

async function main() {
  const logger = {
    debug: () => undefined,
    info:  (msg: string, meta?: Record<string, unknown>) => console.log(`[info]  ${msg}`, meta ?? ""),
    warn:  (msg: string, meta?: Record<string, unknown>) => console.warn(`[WARN]  ${msg}`, meta ?? ""),
    error: (msg: string, meta?: Record<string, unknown>) => console.error(`[ERROR] ${msg}`, meta ?? ""),
  };
  const client = new TwizzitClient({ credentials: { username, password }, baseUrl, logger });
  await client.authenticate();

  console.log("Fetching counts for Badminton Vlaanderen (org 34245)...\n");

  const [orgs, types, fields] = await Promise.all([
    client.getOrganizations(),
    client.getMembershipTypes(),
    client.getExtraFields(),
  ]);

  console.log(`organizations:    ${orgs.length}`);
  console.log(`membership-types: ${types.length}`);
  console.log(`extra-fields:     ${fields.length}`);

  console.log("\nFetching contacts (all pages, pageSize=100)...");
  const t0c = Date.now();
  const contacts = await client.getContacts({ pageSize: 100 });
  const durC = ((Date.now() - t0c) / 1000).toFixed(1);

  console.log("\nFetching memberships (all pages, pageSize=100)...");
  const t0m = Date.now();
  const memberships = await client.getMemberships({ pageSize: 100 });
  const durM = ((Date.now() - t0m) / 1000).toFixed(1);

  console.log("\n--- Results ---");
  console.log(`organizations:    ${orgs.length}`);
  console.log(`membership-types: ${types.length}`);
  console.log(`extra-fields:     ${fields.length}`);
  console.log(`contacts:         ${contacts.length}  (${durC}s)`);
  console.log(`memberships:      ${memberships.length}  (${durM}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
