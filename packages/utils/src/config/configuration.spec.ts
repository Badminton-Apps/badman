import { configSchema } from "./configuration";

// Same options @nestjs/config uses by default for `validationSchema`.
const validate = (env: Record<string, unknown>) =>
  configSchema.validate(env, { abortEarly: false, allowUnknown: true });

const failingKeys = (env: Record<string, unknown>) =>
  validate(env).error?.details.map((d) => d.path.join(".")) ?? [];

describe("configSchema", () => {
  it("no longer requires LEGACY_CLIENT_URL (the legacy client is gone)", () => {
    expect(failingKeys({})).not.toContain("LEGACY_CLIENT_URL");
  });

  it("still accepts environments that set removed keys", () => {
    const env = { LEGACY_CLIENT_URL: "http://localhost:3000", GRAPH_ID: "x", DB_CACHE_PREFIX: "y" };
    const keys = failingKeys(env);
    expect(keys).not.toContain("LEGACY_CLIENT_URL");
    expect(keys).not.toContain("GRAPH_ID");
    expect(keys).not.toContain("DB_CACHE_PREFIX");
  });
});
