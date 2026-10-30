import "reflect-metadata";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { WorkerSyncModule } from "../app.module";

describe("WorkerSyncModule", () => {
  // The worker's HTTP port has no auth guard; queue admin goes through the API's
  // QueueResolver, which checks change:job.
  it("exposes no HTTP controllers", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, WorkerSyncModule) ?? []).toEqual([]);
  });
});
