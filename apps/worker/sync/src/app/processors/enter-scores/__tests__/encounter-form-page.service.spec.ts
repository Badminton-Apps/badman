import { EncounterCompetition } from "@badman/backend-database";
import { Transaction } from "sequelize";

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@badman/backend-pupeteer", () => ({
  getPage: jest.fn(),
  acceptCookies: jest.fn(),
  signIn: jest.fn(),
}));

jest.mock("../pupeteer", () => ({
  clearFields: jest.fn(),
  clickSaveButton: jest.fn(),
  enableInputValidation: jest.fn(),
  enterEditMode: jest.fn(),
  enterEndHour: jest.fn(),
  enterGameLeader: jest.fn(),
  enterShuttle: jest.fn(),
  enterStartHour: jest.fn(),
  getCurrentUrl: jest.fn(),
  getRowErrorMessages: jest.fn(),
  waitForNavigation: jest.fn(),
  waitForNetworkIdle: jest.fn(),
  waitForSaveErrorDialog: jest.fn(),
  waitForSignInConfirmation: jest.fn(),
}));

jest.mock("../pupeteer/enterGames", () => ({
  enterGames: jest.fn(),
}));

import { getPage, acceptCookies as mockAcceptCookies, signIn as mockSignIn } from "@badman/backend-pupeteer";
import {
  clearFields,
  clickSaveButton,
  enableInputValidation,
  enterEditMode,
  enterEndHour,
  enterGameLeader,
  enterShuttle,
  enterStartHour,
  getCurrentUrl,
  getRowErrorMessages,
  waitForNavigation,
  waitForNetworkIdle,
  waitForSaveErrorDialog,
  waitForSignInConfirmation,
} from "../pupeteer";
import { enterGames } from "../pupeteer/enterGames";
import { EncounterFormPageService } from "../encounter-form-page.service";

// ── Fake page ────────────────────────────────────────────────────────────────

function makeFakePage(closed = false) {
  return {
    setDefaultTimeout: jest.fn(),
    setViewport: jest.fn().mockResolvedValue(undefined),
    isClosed: jest.fn().mockReturnValue(closed),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("EncounterFormPageService", () => {
  let service: EncounterFormPageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EncounterFormPageService();
  });

  // ── open() ──────────────────────────────────────────────────────────────────

  describe("open()", () => {
    it("calls getPage with the given headless/flags, sets timeout and viewport", async () => {
      const fakePage = makeFakePage();
      (getPage as jest.Mock).mockResolvedValue(fakePage);

      await service.open(true, ["--flag"]);

      expect(getPage).toHaveBeenCalledWith(true, ["--flag"]);
      expect(fakePage.setDefaultTimeout).toHaveBeenCalledWith(30000);
      expect(fakePage.setViewport).toHaveBeenCalledWith({ width: 1691, height: 1337 });
    });

    it("throws when getPage returns null", async () => {
      (getPage as jest.Mock).mockResolvedValue(null);

      await expect(service.open(true, [])).rejects.toThrow("Failed to create browser page");
    });
  });

  // ── close() ─────────────────────────────────────────────────────────────────

  describe("close()", () => {
    it("calls page.close() when page is open (isClosed returns false)", async () => {
      const fakePage = makeFakePage(false);
      (getPage as jest.Mock).mockResolvedValue(fakePage);
      await service.open(true, []);

      await service.close();

      expect(fakePage.close).toHaveBeenCalledTimes(1);
    });

    it("skips page.close() when page is already closed (isClosed returns true)", async () => {
      const fakePage = makeFakePage(true);
      (getPage as jest.Mock).mockResolvedValue(fakePage);
      await service.open(true, []);

      await service.close();

      expect(fakePage.close).not.toHaveBeenCalled();
    });

    it("nulls out the page so subsequent method calls throw _assertPage", async () => {
      const fakePage = makeFakePage(false);
      (getPage as jest.Mock).mockResolvedValue(fakePage);
      await service.open(true, []);
      await service.close();

      await expect(service.acceptCookies()).rejects.toThrow("Page not open");
    });

    it("is a no-op if called before open()", async () => {
      await expect(service.close()).resolves.toBeUndefined();
    });
  });

  // ── _assertPage guard ────────────────────────────────────────────────────────

  describe("_assertPage guard", () => {
    it("throws 'Page not open — call open() first' for methods called before open()", async () => {
      await expect(service.acceptCookies()).rejects.toThrow("Page not open — call open() first");
      await expect(service.signIn("u", "p")).rejects.toThrow("Page not open — call open() first");
      await expect(service.getRowErrorMessages()).rejects.toThrow("Page not open — call open() first");
      await expect(service.clickSaveButton()).rejects.toThrow("Page not open — call open() first");
    });
  });

  // ── Delegating methods ───────────────────────────────────────────────────────

  describe("delegating methods (after open)", () => {
    let fakePage: ReturnType<typeof makeFakePage>;

    beforeEach(async () => {
      fakePage = makeFakePage(false);
      (getPage as jest.Mock).mockResolvedValue(fakePage);
      await service.open(false, []);
    });

    it("acceptCookies delegates with { page, timeout } and logger", async () => {
      (mockAcceptCookies as jest.Mock).mockResolvedValue(undefined);
      await service.acceptCookies(9000);
      expect(mockAcceptCookies).toHaveBeenCalledWith(
        expect.objectContaining({ page: fakePage, timeout: 9000 }),
        expect.objectContaining({ logger: expect.anything() })
      );
    });

    it("acceptCookies uses default timeout 20000", async () => {
      (mockAcceptCookies as jest.Mock).mockResolvedValue(undefined);
      await service.acceptCookies();
      expect(mockAcceptCookies).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 20000 }),
        expect.anything()
      );
    });

    it("signIn delegates with correct args", async () => {
      (mockSignIn as jest.Mock).mockResolvedValue(undefined);
      await service.signIn("user", "pass", 12000);
      expect(mockSignIn).toHaveBeenCalledWith(
        expect.objectContaining({ page: fakePage, timeout: 12000 }),
        expect.objectContaining({ username: "user", password: "pass" })
      );
    });

    it("waitForSignInConfirmation calls mocked fn and returns its result", async () => {
      (waitForSignInConfirmation as jest.Mock).mockResolvedValue(true);
      const result = await service.waitForSignInConfirmation(3000);
      expect(waitForSignInConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ page: fakePage, timeout: 3000 }),
        expect.anything()
      );
      expect(result).toBe(true);
    });

    it("enterEditMode delegates with { page } and encounter", async () => {
      (enterEditMode as jest.Mock).mockResolvedValue(undefined);
      const encounter = { id: "enc-1" } as EncounterCompetition;
      await service.enterEditMode(encounter);
      expect(enterEditMode).toHaveBeenCalledWith({ page: fakePage }, encounter);
    });

    it("clearFields delegates with { page }", async () => {
      (clearFields as jest.Mock).mockResolvedValue(undefined);
      await service.clearFields();
      expect(clearFields).toHaveBeenCalledWith({ page: fakePage }, expect.anything());
    });

    it("enterGames delegates correctly", async () => {
      (enterGames as jest.Mock).mockResolvedValue(undefined);
      const encounter = { id: "enc-1" } as EncounterCompetition;
      const tx = {} as Transaction;
      await service.enterGames(encounter, tx);
      expect(enterGames).toHaveBeenCalledWith(
        { page: fakePage },
        expect.objectContaining({ encounter, transaction: tx })
      );
    });

    it("enterGameLeader delegates with fullName", async () => {
      (enterGameLeader as jest.Mock).mockResolvedValue(undefined);
      await service.enterGameLeader("Jane Doe");
      expect(enterGameLeader).toHaveBeenCalledWith({ page: fakePage }, "Jane Doe");
    });

    it("enterShuttle delegates with shuttle value", async () => {
      (enterShuttle as jest.Mock).mockResolvedValue(undefined);
      await service.enterShuttle("RSL6");
      expect(enterShuttle).toHaveBeenCalledWith({ page: fakePage }, "RSL6");
    });

    it("enterStartHour delegates with hour value", async () => {
      (enterStartHour as jest.Mock).mockResolvedValue(undefined);
      await service.enterStartHour("20:00");
      expect(enterStartHour).toHaveBeenCalledWith({ page: fakePage }, "20:00");
    });

    it("enterEndHour delegates with hour value", async () => {
      (enterEndHour as jest.Mock).mockResolvedValue(undefined);
      await service.enterEndHour("22:00");
      expect(enterEndHour).toHaveBeenCalledWith({ page: fakePage }, "22:00");
    });

    it("enableInputValidation delegates correctly", async () => {
      (enableInputValidation as jest.Mock).mockResolvedValue(undefined);
      await service.enableInputValidation();
      expect(enableInputValidation).toHaveBeenCalledWith({ page: fakePage }, expect.anything());
    });

    it("getRowErrorMessages calls mocked fn and returns its result", async () => {
      (getRowErrorMessages as jest.Mock).mockResolvedValue(["err1"]);
      const result = await service.getRowErrorMessages();
      expect(getRowErrorMessages).toHaveBeenCalledWith({ page: fakePage }, expect.anything());
      expect(result).toEqual(["err1"]);
    });

    it("getCurrentUrl calls mocked fn and returns its result", () => {
      (getCurrentUrl as jest.Mock).mockReturnValue("https://example.com/page");
      const result = service.getCurrentUrl();
      expect(getCurrentUrl).toHaveBeenCalledWith({ page: fakePage }, expect.anything());
      expect(result).toBe("https://example.com/page");
    });

    it("clickSaveButton calls mocked fn with timeout and returns its result", async () => {
      (clickSaveButton as jest.Mock).mockResolvedValue(true);
      const result = await service.clickSaveButton(3000);
      expect(clickSaveButton).toHaveBeenCalledWith(
        expect.objectContaining({ page: fakePage, timeout: 3000 }),
        expect.anything()
      );
      expect(result).toBe(true);
    });

    it("waitForSaveErrorDialog calls mocked fn with timeout and returns its result", async () => {
      (waitForSaveErrorDialog as jest.Mock).mockResolvedValue("DE4: Some error.");
      const result = await service.waitForSaveErrorDialog(10000);
      expect(waitForSaveErrorDialog).toHaveBeenCalledWith(
        expect.objectContaining({ page: fakePage, timeout: 10000 }),
        expect.anything()
      );
      expect(result).toBe("DE4: Some error.");
    });

    it("waitForNavigation calls mocked fn with correct opts", async () => {
      (waitForNavigation as jest.Mock).mockResolvedValue(undefined);
      const opts = { waitUntil: "networkidle0" as const, timeout: 45000 };
      await service.waitForNavigation(opts);
      expect(waitForNavigation).toHaveBeenCalledWith({ page: fakePage }, opts, expect.anything());
    });

    it("waitForNetworkIdle calls mocked fn with correct opts", async () => {
      (waitForNetworkIdle as jest.Mock).mockResolvedValue(undefined);
      const opts = { idleTime: 1000, timeout: 15000 };
      await service.waitForNetworkIdle(opts);
      expect(waitForNetworkIdle).toHaveBeenCalledWith({ page: fakePage }, opts, expect.anything());
    });
  });
});
