import "reflect-metadata";
import { MODULE_METADATA } from "@nestjs/common/constants";

// Importing the module runs ConfigModule.forRoot, which validates the env; CI has no .env file.
const REQUIRED_ENV = {
  CLIENT_URL: "http://localhost:3000",
  LEGACY_CLIENT_URL: "http://localhost:3000",
  AUTH0_ISSUER_URL: "https://auth.example.test",
  AUTH0_AUDIENCE: "test-audience",
  VR_API: "http://localhost:4000",
};

describe("WorkerSyncModule", () => {
  beforeAll(() => {
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] ||= value;
    }
  });

  // The worker's HTTP port has no auth guard; queue admin goes through the API's
  // QueueResolver, which checks change:job.
  it("exposes no HTTP controllers", async () => {
    const { WorkerSyncModule } = await import("../app.module");

    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, WorkerSyncModule) ?? []).toEqual([]);
  });
});
