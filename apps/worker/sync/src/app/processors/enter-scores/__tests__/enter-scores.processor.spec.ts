import { EncounterCompetition } from "@badman/backend-database";
import { TransactionManager } from "@badman/backend-queue";
import { MailingService } from "@badman/backend-mailing";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EnterScoresProcessor } from "../enter-scores.processor";
import { EncounterFormPageService } from "../encounter-form-page.service";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeJob(overrides: Partial<{
  encounterId: string;
  attemptsMade: number;
  maxAttempts: number;
}> = {}) {
  const { encounterId = "enc-1", attemptsMade = 0, maxAttempts = 3 } = overrides;
  return {
    id: "job-1",
    data: { encounterId },
    attemptsMade,
    opts: { attempts: maxAttempts },
    extendLock: jest.fn().mockResolvedValue(undefined),
    progress: jest.fn(),
  };
}

function makeEncounter(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "enc-1",
    visualCode: "VC001",
    shuttle: "RSL6",
    startHour: "20:00",
    endHour: "22:00",
    gameLeader: { fullName: "John Doe" },
    drawCompetition: {
      subEventCompetition: {
        eventCompetition: { id: "event-1", visualCode: "EV001" },
      },
    },
    games: [],
    update: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    VISUAL_SYNC_ENABLED: false,
    ENTER_SCORES_ENABLED: true,
    NODE_ENV: "test",
    VR_API_USER: "user",
    VR_API_PASS: "pass",
    DEV_EMAIL_DESTINATION: "dev@example.com",
    HANG_BEFORE_BROWSER_CLEANUP: false,
    ...overrides,
  };
  return { get: jest.fn((key: string) => defaults[key] ?? undefined) };
}

function makeFormPageService() {
  return {
    open: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    acceptCookies: jest.fn().mockResolvedValue(undefined),
    signIn: jest.fn().mockResolvedValue(undefined),
    waitForSignInConfirmation: jest.fn().mockResolvedValue(true),
    enterEditMode: jest.fn().mockResolvedValue(undefined),
    clearFields: jest.fn().mockResolvedValue(undefined),
    enterGames: jest.fn().mockResolvedValue(undefined),
    enterGameLeader: jest.fn().mockResolvedValue(undefined),
    enterShuttle: jest.fn().mockResolvedValue(undefined),
    enterStartHour: jest.fn().mockResolvedValue(undefined),
    enterEndHour: jest.fn().mockResolvedValue(undefined),
    enableInputValidation: jest.fn().mockResolvedValue(undefined),
    getRowErrorMessages: jest.fn().mockResolvedValue([]),
    getCurrentUrl: jest.fn().mockReturnValue("https://www.toernooi.nl/sport/matchresult.aspx"),
    clickSaveButton: jest.fn().mockResolvedValue(true),
    waitForNavigation: jest.fn().mockResolvedValue(undefined),
    waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
  };
}

function makeTransactionManager() {
  const mockTransaction = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };
  return {
    _mockTransaction: mockTransaction,
    transaction: jest.fn().mockResolvedValue("tx-1"),
    getTransaction: jest.fn().mockResolvedValue(mockTransaction),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe("EnterScoresProcessor", () => {
  let processor: EnterScoresProcessor;
  let formPage: ReturnType<typeof makeFormPageService>;
  let transactionManager: ReturnType<typeof makeTransactionManager>;
  let mailingService: { sendEnterScoresSuccessMail: jest.Mock; sendEnterScoresFailedMail: jest.Mock };
  let findByPkSpy: jest.SpyInstance;

  async function buildModule(configOverrides: Record<string, unknown> = {}) {
    formPage = makeFormPageService();
    transactionManager = makeTransactionManager();
    mailingService = {
      sendEnterScoresSuccessMail: jest.fn().mockResolvedValue(undefined),
      sendEnterScoresFailedMail: jest.fn().mockResolvedValue(undefined),
    };
    const config = makeConfig(configOverrides);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnterScoresProcessor,
        { provide: ConfigService, useValue: config },
        { provide: TransactionManager, useValue: transactionManager },
        { provide: MailingService, useValue: mailingService },
        { provide: EncounterFormPageService, useValue: formPage },
      ],
    }).compile();

    processor = module.get(EnterScoresProcessor);
  }

  beforeEach(async () => {
    await buildModule();
    findByPkSpy = jest
      .spyOn(EncounterCompetition, "findByPk")
      .mockResolvedValue(makeEncounter() as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Preflight ──────────────────────────────────────────────────────────────

  describe("preflight checks", () => {
    it("throws when no username is configured", async () => {
      await buildModule({ VR_API_USER: undefined });
      findByPkSpy = jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeEncounter() as any);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        "No username or password configured for Visual sync"
      );
      expect(formPage.open).not.toHaveBeenCalled();
    });

    it("throws when no password is configured", async () => {
      await buildModule({ VR_API_PASS: undefined });
      findByPkSpy = jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeEncounter() as any);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        "No username or password configured for Visual sync"
      );
    });
  });

  // ── Encounter lookup ───────────────────────────────────────────────────────

  describe("encounter loading", () => {
    it("throws when encounter is not found", async () => {
      findByPkSpy.mockResolvedValue(null);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("enc-1 not found");
      expect(formPage.enterEditMode).not.toHaveBeenCalled();
    });
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  describe("happy path", () => {
    it("opens page, enters all data, commits transaction, and marks encounter as synced", async () => {
      const job = makeJob();
      await processor.enterScores(job as any);

      expect(formPage.open).toHaveBeenCalledTimes(1);
      expect(formPage.acceptCookies).toHaveBeenCalledWith(20000);
      expect(formPage.signIn).toHaveBeenCalledWith("user", "pass", 20000);
      expect(formPage.enterEditMode).toHaveBeenCalledTimes(1);
      expect(formPage.clearFields).toHaveBeenCalledTimes(1);
      expect(formPage.enterGames).toHaveBeenCalledTimes(1);
      expect(transactionManager.commitTransaction).toHaveBeenCalledWith("tx-1");
      expect(transactionManager.rollbackTransaction).not.toHaveBeenCalled();
      expect(formPage.enterGameLeader).toHaveBeenCalledWith("John Doe");
      expect(formPage.enterShuttle).toHaveBeenCalledWith("RSL6");
      expect(formPage.enterStartHour).toHaveBeenCalledWith("20:00");
      expect(formPage.enterEndHour).toHaveBeenCalledWith("22:00");
      expect(formPage.enableInputValidation).toHaveBeenCalledTimes(1);
      expect(formPage.clickSaveButton).toHaveBeenCalledWith(5000);
      expect(formPage.waitForNavigation).toHaveBeenCalledTimes(1);
    });

    it("marks encounter as scoresSyncedAt on successful save", async () => {
      const encounter = makeEncounter();
      findByPkSpy.mockResolvedValue(encounter as any);

      await processor.enterScores(makeJob() as any);

      expect(encounter.update).toHaveBeenCalledWith({ scoresSyncedAt: expect.any(Date) });
    });

    it("sends success email on successful save", async () => {
      await processor.enterScores(makeJob() as any);

      expect(mailingService.sendEnterScoresSuccessMail).toHaveBeenCalledTimes(1);
      expect(mailingService.sendEnterScoresFailedMail).not.toHaveBeenCalled();
    });

    it("skips optional fields when not set on encounter", async () => {
      const encounter = makeEncounter({ gameLeader: null, shuttle: null, startHour: null, endHour: null });
      findByPkSpy.mockResolvedValue(encounter as any);

      await processor.enterScores(makeJob() as any);

      expect(formPage.enterGameLeader).not.toHaveBeenCalled();
      expect(formPage.enterShuttle).not.toHaveBeenCalled();
      expect(formPage.enterStartHour).not.toHaveBeenCalled();
      expect(formPage.enterEndHour).not.toHaveBeenCalled();
    });

    it("closes the page in the finally block", async () => {
      await processor.enterScores(makeJob() as any);
      expect(formPage.close).toHaveBeenCalledTimes(1);
    });
  });

  // ── shouldSave = false (dev mode) ──────────────────────────────────────────

  describe("dev mode (shouldSave = false)", () => {
    beforeEach(async () => {
      await buildModule({ ENTER_SCORES_ENABLED: false, NODE_ENV: "test" });
      findByPkSpy = jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeEncounter() as any);
    });

    it("skips clicking save and does not update encounter", async () => {
      const encounter = makeEncounter();
      findByPkSpy.mockResolvedValue(encounter as any);

      await processor.enterScores(makeJob() as any);

      expect(formPage.clickSaveButton).not.toHaveBeenCalled();
      expect(encounter.update).not.toHaveBeenCalled();
    });

    it("still sends a dev success email", async () => {
      await processor.enterScores(makeJob() as any);

      expect(mailingService.sendEnterScoresSuccessMail).toHaveBeenCalledTimes(1);
    });
  });

  // ── Transaction rollback ───────────────────────────────────────────────────

  describe("transaction management", () => {
    it("rolls back transaction when enterGames throws", async () => {
      formPage.enterGames.mockRejectedValue(new Error("game entry failed"));

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("game entry failed");

      expect(transactionManager.rollbackTransaction).toHaveBeenCalledWith("tx-1");
      expect(transactionManager.commitTransaction).not.toHaveBeenCalled();
    });
  });

  // ── Row validation errors ──────────────────────────────────────────────────

  describe("row validation", () => {
    it("throws when row error messages are present before save", async () => {
      formPage.getRowErrorMessages.mockResolvedValue(["Player 1 invalid", "Score missing"]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("Row validation failed");
    });

    it("treats row errors after save as failure (throws)", async () => {
      // First call (pre-save validation): no errors
      // Second call (post-save check): errors present
      formPage.getRowErrorMessages
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["Row error after save"]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow();
      expect(mailingService.sendEnterScoresSuccessMail).not.toHaveBeenCalled();
    });
  });

  // ── Save button not found ──────────────────────────────────────────────────

  describe("save button", () => {
    it("throws when save button is not found on page", async () => {
      formPage.clickSaveButton.mockResolvedValue(false);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        "Save button not found on page"
      );
    });
  });

  // ── Navigation timeout ─────────────────────────────────────────────────────

  describe("navigation handling", () => {
    it("attempts network idle fallback when navigation times out", async () => {
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      formPage.getCurrentUrl.mockReturnValue("https://www.toernooi.nl/sport/matchresult.aspx");
      formPage.getRowErrorMessages.mockResolvedValue([]);

      // Navigation timeout means saveSucceeded=false, so the job still throws
      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("navigation timeout");

      expect(formPage.waitForNetworkIdle).toHaveBeenCalledTimes(1);
      expect(mailingService.sendEnterScoresSuccessMail).not.toHaveBeenCalled();
    });

    it("throws when navigation times out and row errors are present", async () => {
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      // First call pre-save: no errors; second call post-save: errors
      formPage.getRowErrorMessages
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["Validation error"]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow();
    });
  });

  // ── Cookie / sign-in error handling ───────────────────────────────────────

  describe("cookie and sign-in error handling", () => {
    it("continues when cookie acceptance times out", async () => {
      const timeoutError = new Error("Navigation timeout");
      formPage.acceptCookies.mockRejectedValue(timeoutError);

      await processor.enterScores(makeJob() as any);

      // Should continue and reach signIn
      expect(formPage.signIn).toHaveBeenCalled();
    });

    it("throws when cookie acceptance fails with a non-timeout error", async () => {
      const criticalError = Object.assign(new Error("Site down"), { name: "CookieAcceptanceError" });
      formPage.acceptCookies.mockRejectedValue(criticalError);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("Failed to accept cookies");
    });

    it("continues when sign-in times out but user is confirmed signed in", async () => {
      const timeoutError = new Error("timeout");
      formPage.signIn.mockRejectedValue(timeoutError);
      formPage.waitForSignInConfirmation.mockResolvedValue(true);

      await processor.enterScores(makeJob() as any);

      expect(formPage.enterEditMode).toHaveBeenCalled();
    });

    it("throws when sign-in times out and user is not signed in", async () => {
      formPage.signIn.mockRejectedValue(new Error("timeout"));
      formPage.waitForSignInConfirmation.mockRejectedValue(new Error("not signed in"));

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("Sign in failed");
    });
  });

  // ── Failure email on final attempt ─────────────────────────────────────────

  describe("failure email", () => {
    it("sends failure email on the final attempt", async () => {
      formPage.enterGames.mockRejectedValue(new Error("game error"));

      const job = makeJob({ attemptsMade: 2, maxAttempts: 3 });
      await expect(processor.enterScores(job as any)).rejects.toThrow();

      expect(mailingService.sendEnterScoresFailedMail).toHaveBeenCalledTimes(1);
    });

    it("does not send failure email on non-final attempts", async () => {
      formPage.enterGames.mockRejectedValue(new Error("game error"));

      const job = makeJob({ attemptsMade: 0, maxAttempts: 3 });
      await expect(processor.enterScores(job as any)).rejects.toThrow();

      expect(mailingService.sendEnterScoresFailedMail).not.toHaveBeenCalled();
    });

    it("does not send failure email when no DEV_EMAIL_DESTINATION is configured", async () => {
      await buildModule({ DEV_EMAIL_DESTINATION: undefined });
      findByPkSpy = jest.spyOn(EncounterCompetition, "findByPk").mockResolvedValue(makeEncounter() as any);
      formPage.enterGames.mockRejectedValue(new Error("game error"));

      const job = makeJob({ attemptsMade: 2, maxAttempts: 3 });
      await expect(processor.enterScores(job as any)).rejects.toThrow();

      expect(mailingService.sendEnterScoresFailedMail).not.toHaveBeenCalled();
    });
  });

  // ── URL construction / post-save state ────────────────────────────────────

  describe("URL construction / post-save state", () => {
    it("still updates the encounter when getCurrentUrl returns a URL containing teammatch.aspx after successful navigation", async () => {
      // Navigation succeeds (saveSucceeded=true), URL happens to still contain teammatch.aspx
      formPage.waitForNavigation.mockResolvedValue(undefined);
      formPage.getCurrentUrl.mockReturnValue(
        "https://www.toernooi.nl/sport/teammatch.aspx?id=EV001&match=VC001"
      );
      formPage.getRowErrorMessages.mockResolvedValue([]);

      const encounter = makeEncounter();
      findByPkSpy.mockResolvedValue(encounter as any);

      await processor.enterScores(makeJob() as any);

      // URL check is just a log — encounter should still be updated
      expect(encounter.update).toHaveBeenCalledWith({ scoresSyncedAt: expect.any(Date) });
    });

    it("includes 'Still on teammatch page' when navigation+network-idle both time out and URL contains teammatch.aspx", async () => {
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      formPage.waitForNetworkIdle.mockRejectedValue(new Error("network idle timeout"));
      formPage.getCurrentUrl.mockReturnValue(
        "https://www.toernooi.nl/sport/teammatch.aspx?id=EV001&match=VC001"
      );
      formPage.getRowErrorMessages.mockResolvedValue([]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        /Still on teammatch page/
      );
    });
  });

  // ── HANG_BEFORE_BROWSER_CLEANUP flag ──────────────────────────────────────

  describe("HANG_BEFORE_BROWSER_CLEANUP flag", () => {
    it("does NOT call formPage.close() when HANG_BEFORE_BROWSER_CLEANUP is true", async () => {
      await buildModule({ HANG_BEFORE_BROWSER_CLEANUP: true });
      findByPkSpy = jest
        .spyOn(EncounterCompetition, "findByPk")
        .mockResolvedValue(makeEncounter() as any);

      await processor.enterScores(makeJob() as any);

      expect(formPage.close).not.toHaveBeenCalled();
    });
  });

  // ── saveFailureReason in error message ────────────────────────────────────

  describe("saveFailureReason in error message", () => {
    it("includes 'navigation timeout' when save fails due to navigation timeout", async () => {
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      formPage.waitForNetworkIdle.mockResolvedValue(undefined);
      // Post-save: no row errors, but saveSucceeded = false because navigation timed out
      formPage.getRowErrorMessages.mockResolvedValue([]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        /navigation timeout/i
      );
    });

    it("includes 'row validation' when save fails due to row-validation errors after save", async () => {
      formPage.waitForNavigation.mockResolvedValue(undefined);
      // First call (pre-save): no errors; second call (post-save): errors present
      formPage.getRowErrorMessages
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["Post-save row error"]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        /row validation/i
      );
    });
  });

  // ── Row error messages in failure message ──────────────────────────────────

  describe("row error messages in failure", () => {
    it("includes the error text when post-save row errors exist", async () => {
      formPage.waitForNavigation.mockResolvedValue(undefined);
      formPage.getRowErrorMessages
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["Bad score for game 3"]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        /Bad score for game 3/
      );
    });
  });
});
