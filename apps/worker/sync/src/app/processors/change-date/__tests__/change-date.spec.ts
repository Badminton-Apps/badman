import { EncounterCompetition } from "@badman/backend-database";
import axios from "axios";
import { SyncDateProcessor } from "../change-date";

jest.mock("@badman/backend-database", () => ({
  EncounterCompetition: { findByPk: jest.fn() },
}));

jest.mock("axios");

// ─── helpers ────────────────────────────────────────────────────────────────

function makeEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-uuid",
    visualCode: "42",
    date: new Date("2025-11-15T13:00:00Z"),
    originalDate: new Date("2025-10-05T12:00:00Z"),
    dateSyncedAt: undefined as Date | undefined,
    save: jest.fn().mockResolvedValue(undefined),
    getDrawCompetition: jest.fn().mockResolvedValue({
      getSubEventCompetition: jest.fn().mockResolvedValue({
        getEventCompetition: jest.fn().mockResolvedValue({
          visualCode: "TOURN-1",
          name: "Test Event",
        }),
      }),
    }),
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    VR_CHANGE_DATES: true,
    NODE_ENV: "production",
    VR_API: "https://vr.api",
    VR_API_USER: "user",
    VR_API_PASS: "pass",
  };
  const map = { ...defaults, ...overrides };
  return { get: jest.fn((key: string) => map[key]) } as never;
}

function makeProcessor(configOverrides: Record<string, unknown> = {}) {
  return new SyncDateProcessor(makeConfig(configOverrides));
}

function makeJob(encounterId = "enc-uuid") {
  return { data: { encounterId } } as never;
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe("SyncDateProcessor.acceptDate", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it("returns early without touching DB when VR_CHANGE_DATES is not true", async () => {
    const processor = makeProcessor({ VR_CHANGE_DATES: false });
    await processor.acceptDate(makeJob());
    expect(EncounterCompetition.findByPk).not.toHaveBeenCalled();
  });

  it("returns early when encounter is not found", async () => {
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(null);
    const processor = makeProcessor();
    await processor.acceptDate(makeJob("missing-enc"));
    expect(axios).not.toHaveBeenCalled();
  });

  it("returns early when event has no visualCode — does not call axios", async () => {
    const enc = makeEncounter();
    enc.getDrawCompetition.mockResolvedValue({
      getSubEventCompetition: jest.fn().mockResolvedValue({
        getEventCompetition: jest.fn().mockResolvedValue({ visualCode: null, name: "No Code" }),
      }),
    });
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(enc);
    const processor = makeProcessor();
    await processor.acceptDate(makeJob());
    expect(axios).not.toHaveBeenCalled();
    // finally block still runs even on early return inside try
    expect(enc.save).toHaveBeenCalled();
  });

  it("returns early when encounter has no visualCode — does not call axios", async () => {
    const enc = makeEncounter({ visualCode: null });
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(enc);
    const processor = makeProcessor();
    await processor.acceptDate(makeJob());
    expect(axios).not.toHaveBeenCalled();
    // finally block still runs even on early return inside try
    expect(enc.save).toHaveBeenCalled();
  });

  it("in non-production: does NOT call axios and does NOT set dateSyncedAt", async () => {
    const enc = makeEncounter();
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(enc);
    const processor = makeProcessor({ NODE_ENV: "staging" });

    await processor.acceptDate(makeJob());

    expect(axios).not.toHaveBeenCalled();
    expect(enc.dateSyncedAt).toBeUndefined();
    expect(enc.save).toHaveBeenCalled();
  });

  it("in production: calls PUT with correct XML body and sets dateSyncedAt on success", async () => {
    const enc = makeEncounter();
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(enc);
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: `<?xml version="1.0"?><Result><Error><Code>0</Code><Message>Success.</Message></Error></Result>`,
    });

    const processor = makeProcessor();
    await processor.acceptDate(makeJob());

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        url: "https://vr.api/Tournament/TOURN-1/Match/42/Date",
        headers: { "Content-Type": "application/xml" },
        data: expect.stringContaining("<MatchDate>2025-11-15T14:00:00</MatchDate>"), // UTC+1 (CET)
      })
    );
    expect(enc.dateSyncedAt).toBeInstanceOf(Date);
    expect(enc.save).toHaveBeenCalled();
  });

  it("in production: clears dateSyncedAt and saves when VR API returns an error code", async () => {
    const enc = makeEncounter();
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(enc);
    (axios as unknown as jest.Mock).mockResolvedValue({
      data: `<?xml version="1.0"?><Result><Error><Code>1</Code><Message>Not found.</Message></Error></Result>`,
    });

    const processor = makeProcessor();
    await processor.acceptDate(makeJob());

    expect(enc.dateSyncedAt).toBeUndefined();
    expect(enc.save).toHaveBeenCalled();
  });

  it("in production: clears dateSyncedAt and saves when axios throws", async () => {
    const enc = makeEncounter();
    (EncounterCompetition.findByPk as jest.Mock).mockResolvedValue(enc);
    (axios as unknown as jest.Mock).mockRejectedValue(new Error("network error"));

    const processor = makeProcessor();
    await processor.acceptDate(makeJob());

    expect(enc.dateSyncedAt).toBeUndefined();
    expect(enc.save).toHaveBeenCalled();
  });
});
