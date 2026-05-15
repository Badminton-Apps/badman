/**
 * Integration test for the Twizzit shadow ingest pipeline.
 * Gated by RUN_INTEGRATION_TESTS=1. Requires a running PostgreSQL instance.
 *
 * Run:
 *   RUN_INTEGRATION_TESTS=1 npx jest --config libs/backend/twizzit-shadow/jest.config.ts \
 *     --testPathPattern integration
 */
import * as dotenv from "dotenv";
import { Sequelize } from "sequelize-typescript";
import * as dbModels from "@badman/backend-database";
import { Model, ModelCtor } from "sequelize-typescript";

dotenv.config();

const RUN = process.env["RUN_INTEGRATION_TESTS"] === "1";
const DB_DIALECT = process.env["DB_DIALECT"];

describe("TwizzitShadowIngestService (integration)", () => {
  if (!RUN) {
    it.skip("skipped — set RUN_INTEGRATION_TESTS=1 to enable", () => {});
    return;
  }

  if (DB_DIALECT !== "postgres") {
    it("skips when DB_DIALECT is not postgres", () => {
      console.warn("Skipping integration tests: DB_DIALECT is not postgres");
    });
    return;
  }

  let sequelize: Sequelize;

  beforeAll(async () => {
    const models = Object.values(dbModels).filter(
      (m): m is ModelCtor => typeof m === "function" && m.prototype instanceof Model
    );

    sequelize = new Sequelize({
      dialect: "postgres",
      host: process.env["DB_IP"],
      port: Number(process.env["DB_PORT"]),
      username: process.env["DB_USER"],
      password: process.env["DB_PASSWORD"],
      database: process.env["DB_DATABASE"],
      logging: false,
      models,
    });

    await sequelize.authenticate();
  });

  afterAll(async () => {
    const { SyncRun, SyncCheckpoint, ShadowOrganization, ShadowExtraField,
      ShadowMembershipType, ShadowMembership, ShadowContact } = dbModels;

    await SyncCheckpoint.destroy({ where: {}, truncate: true });
    await SyncRun.destroy({ where: {}, truncate: true });
    await ShadowContact.destroy({ where: {}, truncate: true });
    await ShadowMembership.destroy({ where: {}, truncate: true });
    await ShadowMembershipType.destroy({ where: {}, truncate: true });
    await ShadowExtraField.destroy({ where: {}, truncate: true });
    await ShadowOrganization.destroy({ where: {}, truncate: true });

    await sequelize.close();
  });

  it("can create a sync_run row and update its status", async () => {
    const { SyncRun } = dbModels;

    const run = await SyncRun.create({
      status: "pending",
      organizationId: null,
      pageSize: 10,
      interPageDelayMs: 0,
      startedAt: null,
      finishedAt: null,
      counts: null,
      errorSummary: null,
    });

    expect(run.id).toBeTruthy();

    run.status = "running";
    run.startedAt = new Date();
    await run.save();

    const found = await SyncRun.findByPk(run.id);
    expect(found?.status).toBe("running");
  });

  it("can upsert shadow_contact rows idempotently", async () => {
    const { SyncRun, ShadowContact } = dbModels;

    const run = await SyncRun.create({
      status: "running",
      organizationId: null,
      pageSize: 10,
      interPageDelayMs: 0,
      startedAt: new Date(),
      finishedAt: null,
      counts: null,
      errorSummary: null,
    });

    const contactRow = {
      twizzitId: 999999,
      firstName: "Integration",
      lastName: "Test",
      dateOfBirth: "1990-01-01",
      memberId: "INT-001",
      gender: "M",
      payload: { id: 999999, firstName: "Integration", lastName: "Test" },
      syncRunId: run.id,
      fetchedAt: new Date(),
    };

    await ShadowContact.bulkCreate([contactRow] as never[], {
      updateOnDuplicate: ["firstName", "lastName", "dateOfBirth", "memberId", "gender", "payload", "syncRunId", "fetchedAt"],
    });

    // Upsert again with updated name
    await ShadowContact.bulkCreate([{ ...contactRow, firstName: "Updated" }] as never[], {
      updateOnDuplicate: ["firstName", "lastName", "dateOfBirth", "memberId", "gender", "payload", "syncRunId", "fetchedAt"],
    });

    const found = await ShadowContact.findOne({ where: { twizzitId: 999999 } });
    expect(found?.firstName).toBe("Updated");

    // Clean up
    await ShadowContact.destroy({ where: { twizzitId: 999999 } });
    await run.destroy();
  });
});
