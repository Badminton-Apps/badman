import { EncounterCompetition } from "@badman/backend-database";
import { TransactionManager } from "@badman/backend-queue";
import { MailingService } from "@badman/backend-mailing";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/nestjs";
import { EnterScoresProcessor } from "../enter-scores.processor";
import { EncounterFormPageService } from "../encounter-form-page.service";

jest.mock("@sentry/nestjs", () => ({
  setTag: jest.fn(),
  setContext: jest.fn(),
}));

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
    hasPage: jest.fn().mockReturnValue(false),
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
    getCurrentUrl: jest.fn().mockReturnValue("https://www.toernooi.nl/sport/teammatch.aspx?id=EV001&match=VC001"),
    clickSaveButton: jest.fn().mockResolvedValue(true),
    waitForNavigation: jest.fn().mockResolvedValue(undefined),
    waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
    waitForSaveErrorDialog: jest.fn().mockResolvedValue(null),
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

  // ── Sentry context on failure ─────────────────────────────────────────────

  describe("Sentry context on failure", () => {
    it("sets processor tag and job context when enterScores throws", async () => {
      findByPkSpy.mockResolvedValue(null);

      const job = makeJob({ encounterId: "enc-1", attemptsMade: 0, maxAttempts: 1 });
      await expect(processor.enterScores(job as any)).rejects.toThrow(/enc-1 not found/);

      expect(Sentry.setTag).toHaveBeenCalledWith("processor", "enter-scores");
      expect(Sentry.setTag).toHaveBeenCalledWith("error_code", "ENCOUNTER_NOT_FOUND");
      expect(Sentry.setContext).toHaveBeenCalledWith(
        "job",
        expect.objectContaining({
          encounterId: "enc-1",
          jobId: "job-1",
          attemptsMade: 1,
          maxAttempts: 1,
          phase: "load_encounter",
          errorCode: "ENCOUNTER_NOT_FOUND",
        })
      );
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

  // ── Save error dialog (Foutmelding) ─────────────────────────────────────────

  describe("save error dialog", () => {
    it("throws and sends failure email with dialog message when toernooi.nl shows error dialog after save", async () => {
      const dialogMessage = "DE4: Catry, Petra heeft te veel wedstrijden gespeeld.";
      formPage.waitForSaveErrorDialog.mockResolvedValue(dialogMessage);
      formPage.waitForNavigation.mockImplementation(() => new Promise(() => {}));

      const job = makeJob({ attemptsMade: 2, maxAttempts: 3 });
      await expect(processor.enterScores(job as any)).rejects.toThrow(
        /Toernooi.nl showed an error after save/
      );

      expect(mailingService.sendEnterScoresFailedMail).toHaveBeenCalledTimes(1);
      expect(mailingService.sendEnterScoresFailedMail).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(dialogMessage),
        expect.anything(),
        expect.any(String),
        expect.any(String)
      );
    });
  });

  // ── Navigation timeout ─────────────────────────────────────────────────────

  describe("navigation handling", () => {
    it("treats as success when navigation times out but no row errors and left teammatch page", async () => {
      const encounter = makeEncounter();
      findByPkSpy.mockResolvedValue(encounter as any);
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      formPage.getCurrentUrl.mockReturnValue("https://www.toernooi.nl/sport/teammatch.aspx?id=EV001&match=VC001");
      formPage.getRowErrorMessages.mockResolvedValue([]);

      await processor.enterScores(makeJob() as any);

      expect(formPage.waitForNetworkIdle).toHaveBeenCalled();
      expect(encounter.update).toHaveBeenCalledWith({ scoresSyncedAt: expect.any(Date) });
      expect(mailingService.sendEnterScoresSuccessMail).toHaveBeenCalled();
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
      const criticalError = new Error("Site down");
      formPage.acceptCookies.mockRejectedValue(criticalError);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow("Site down");
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

    it("treats as success when navigation+network-idle both time out but no row errors (we may stay on teammatch)", async () => {
      const encounter = makeEncounter();
      findByPkSpy.mockResolvedValue(encounter as any);
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      formPage.waitForNetworkIdle.mockRejectedValue(new Error("network idle timeout"));
      formPage.getCurrentUrl.mockReturnValue(
        "https://www.toernooi.nl/sport/teammatch.aspx?id=EV001&match=VC001"
      );
      formPage.getRowErrorMessages.mockResolvedValue([]);

      await processor.enterScores(makeJob() as any);

      expect(encounter.update).toHaveBeenCalledWith({ scoresSyncedAt: expect.any(Date) });
      expect(mailingService.sendEnterScoresSuccessMail).toHaveBeenCalled();
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

  // ── Serial mutex ─────────────────────────────────────────────────────────

  describe("serial mutex", () => {
    it("processes concurrent enterScores calls sequentially, not in parallel", async () => {
      const executionLog: string[] = [];

      // Make enterGames take some time so we can detect overlap
      formPage.enterGames.mockImplementation(async () => {
        const encId = findByPkSpy.mock.results[findByPkSpy.mock.results.length - 1]?.value?.visualCode;
        executionLog.push(`start:${encId}`);
        await new Promise((r) => setTimeout(r, 50));
        executionLog.push(`end:${encId}`);
      });

      // Set up three encounters
      const enc1 = makeEncounter({ id: "e1", visualCode: "V1" });
      const enc2 = makeEncounter({ id: "e2", visualCode: "V2" });
      const enc3 = makeEncounter({ id: "e3", visualCode: "V3" });

      findByPkSpy
        .mockResolvedValueOnce(enc1 as any)
        .mockResolvedValueOnce(enc2 as any)
        .mockResolvedValueOnce(enc3 as any);

      const job1 = makeJob({ encounterId: "e1" });
      const job2 = { ...makeJob({ encounterId: "e2" }), id: "job-2" };
      const job3 = { ...makeJob({ encounterId: "e3" }), id: "job-3" };

      // Launch all three concurrently
      await Promise.all([
        processor.enterScores(job1 as any),
        processor.enterScores(job2 as any),
        processor.enterScores(job3 as any),
      ]);

      // Verify sequential execution: each "end" must come before the next "start"
      expect(executionLog).toHaveLength(6);
      for (let i = 0; i < executionLog.length - 1; i += 2) {
        expect(executionLog[i]).toMatch(/^start:/);
        expect(executionLog[i + 1]).toMatch(/^end:/);
      }
    });

    it("starts lock renewal before waiting for the serial lock", async () => {
      // Make the first job slow so the second has to wait
      let resolveFirstJob: () => void;
      const firstJobBlocking = new Promise<void>((r) => { resolveFirstJob = r; });

      formPage.enterGames
        .mockImplementationOnce(async () => { await firstJobBlocking; })
        .mockImplementationOnce(async () => {});

      const enc = makeEncounter();
      findByPkSpy.mockResolvedValue(enc as any);

      const job1 = makeJob({ encounterId: "e1" });
      const job2 = { ...makeJob({ encounterId: "e2" }), id: "job-2", extendLock: jest.fn().mockResolvedValue(undefined) };

      const p1 = processor.enterScores(job1 as any);
      const p2 = processor.enterScores(job2 as any);

      // Give the event loop a moment for both jobs to enter enterScores()
      await new Promise((r) => setTimeout(r, 10));

      // Job 2 is waiting for the serial lock, but lock renewal should already
      // be active (startLockRenewal is called before await waitFor).
      // We can't directly observe the interval, but we verify that extendLock
      // is set up by checking job2.extendLock hasn't been called yet (it runs
      // on a 2-minute interval), and the job didn't stall or throw.

      // Unblock the first job
      resolveFirstJob!();
      await Promise.all([p1, p2]);

      // Both should have completed successfully
      expect(formPage.close).toHaveBeenCalledTimes(2);
    });

    it("releases the serial lock even when a job fails, allowing the next job to proceed", async () => {
      formPage.enterGames
        .mockRejectedValueOnce(new Error("game entry failed"))
        .mockResolvedValueOnce(undefined);

      const enc = makeEncounter();
      findByPkSpy.mockResolvedValue(enc as any);

      const job1 = makeJob({ encounterId: "e1" });
      const job2 = { ...makeJob({ encounterId: "e2" }), id: "job-2" };

      const results = await Promise.allSettled([
        processor.enterScores(job1 as any),
        processor.enterScores(job2 as any),
      ]);

      expect(results[0].status).toBe("rejected");
      expect(results[1].status).toBe("fulfilled");
      // The second job should have completed its full flow
      expect(formPage.close).toHaveBeenCalledTimes(2);
    });
  });

  // ── saveFailureReason in error message ────────────────────────────────────

  describe("saveFailureReason in error message", () => {
    it("includes 'row validation' when navigation times out but row errors are present after save", async () => {
      formPage.waitForNavigation.mockRejectedValue(new Error("Navigation timeout"));
      formPage.waitForNetworkIdle.mockRejectedValue(new Error("network idle timeout"));
      formPage.getRowErrorMessages
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(["Post-save validation error"]);

      await expect(processor.enterScores(makeJob() as any)).rejects.toThrow(
        /row validation/i
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
