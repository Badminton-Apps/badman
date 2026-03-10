import { enterScoresPreflight, isFinalAttempt } from "../guards";

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

    expect(result.canProceed).toBe(false);
    expect(result.reason).toContain("No username or password");
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
