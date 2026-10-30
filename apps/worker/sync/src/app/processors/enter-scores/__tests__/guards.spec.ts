import { enterScoresPreflight, isFinalAttempt, isSeasonOpen, oldestOpenSeason } from "../guards";

describe("enterScoresPreflight", () => {
  const baseConfig = {
    visualSyncEnabled: false,
    enterScoresEnabled: false,
    nodeEnv: "development",
    username: "user",
    password: "pass",
  };

  it("should not proceed without credentials", () => {
    const result = enterScoresPreflight({ ...baseConfig, username: undefined });

    expect(result).toMatchObject({
      canProceed: false,
      reason: expect.stringContaining("No username or password"),
    });
  });

  it("returns the credentials when it can proceed", () => {
    const result = enterScoresPreflight(baseConfig);

    expect(result).toMatchObject({ canProceed: true, username: "user", password: "pass" });
  });

  it("should not proceed without password", () => {
    const result = enterScoresPreflight({ ...baseConfig, password: undefined });

    expect(result.canProceed).toBe(false);
  });

  it("should use headless when visualSyncEnabled is false", () => {
    const result = enterScoresPreflight({ ...baseConfig, visualSyncEnabled: false });

    expect(result.headless).toBe(true);
  });

  it("should use visible browser when visualSyncEnabled is true", () => {
    const result = enterScoresPreflight({ ...baseConfig, visualSyncEnabled: true });

    expect(result.headless).toBe(false);
  });

  it("should save in production", () => {
    const result = enterScoresPreflight({ ...baseConfig, nodeEnv: "production" });

    expect(result.shouldSave).toBe(true);
  });

  it("should save when enterScoresEnabled is true", () => {
    const result = enterScoresPreflight({ ...baseConfig, enterScoresEnabled: true });

    expect(result.shouldSave).toBe(true);
  });

  it("should not save in development without enterScoresEnabled", () => {
    const result = enterScoresPreflight({
      ...baseConfig,
      nodeEnv: "development",
      enterScoresEnabled: false,
    });

    expect(result.shouldSave).toBe(false);
  });
});

describe("isFinalAttempt", () => {
  it("should return true on the last attempt", () => {
    expect(isFinalAttempt(2, 3)).toBe(true); // 0-indexed: attempts 0,1,2 → attempt 2 is final
  });

  it("should return true when exceeding max attempts", () => {
    expect(isFinalAttempt(5, 3)).toBe(true);
  });

  it("should return false on early attempts", () => {
    expect(isFinalAttempt(0, 3)).toBe(false);
    expect(isFinalAttempt(1, 3)).toBe(false);
  });

  it("should return true when max attempts is 1", () => {
    expect(isFinalAttempt(0, 1)).toBe(true);
  });
});

describe("isSeasonOpen", () => {
  it.each([
    ["during the season", 2025, "2026-03-05T19:00:00"],
    ["for matches played in May", 2025, "2026-05-30T20:00:00"],
    ["until the end of June", 2025, "2026-06-30T23:59:00"],
    ["for a season that has not started yet", 2027, "2026-10-29T12:00:00"],
  ])("keeps the season open %s", (_, season, now) => {
    expect(isSeasonOpen(season, new Date(now))).toBe(true);
  });

  it.each([
    ["from 1 July", 2025, "2026-07-01T00:00:00"],
    ["when old jobs are retried in September", 2025, "2026-09-08T11:17:00"],
  ])("closes the season %s", (_, season, now) => {
    expect(isSeasonOpen(season, new Date(now))).toBe(false);
  });
});

describe("oldestOpenSeason", () => {
  it.each([
    ["2026-01-15T12:00:00", 2025],
    ["2026-06-30T23:59:00", 2025],
    ["2026-07-01T00:00:00", 2026],
    ["2026-10-29T12:00:00", 2026],
  ])("on %s is %i", (now, season) => {
    expect(oldestOpenSeason(new Date(now))).toBe(season);
  });
});
