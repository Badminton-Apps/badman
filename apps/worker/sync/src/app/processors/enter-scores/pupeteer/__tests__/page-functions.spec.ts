import { waitForSelectors } from "@badman/backend-pupeteer";
import { clickSaveButton } from "../clickSaveButton";
import { getCurrentUrl } from "../getCurrentUrl";
import { getRowErrorMessages } from "../getRowErrorMessages";
import { waitForNavigation } from "../waitForNavigation";
import { waitForNetworkIdle } from "../waitForNetworkIdle";
import { waitForSaveErrorDialog } from "../waitForSaveErrorDialog";
import { waitForSignInConfirmation } from "../waitForSignInConfirmation";

jest.mock("@badman/backend-pupeteer", () => ({
  waitForSelectors: jest.fn(),
}));

function makePage(overrides: Record<string, unknown> = {}) {
  return {
    url: jest.fn().mockReturnValue("https://www.toernooi.nl/"),
    evaluate: jest.fn(),
    waitForSelector: jest.fn(),
    waitForNavigation: jest.fn().mockResolvedValue(undefined),
    waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── getCurrentUrl ─────────────────────────────────────────────────────────────

describe("getCurrentUrl", () => {
  it("returns the current page URL", () => {
    const page = makePage({ url: jest.fn().mockReturnValue("https://example.com/path") });
    expect(getCurrentUrl({ page: page as any })).toBe("https://example.com/path");
    expect(page.url).toHaveBeenCalledTimes(1);
  });
});

// ── getRowErrorMessages ───────────────────────────────────────────────────────

describe("getRowErrorMessages", () => {
  it("returns messages collected by page.evaluate", async () => {
    const page = makePage({
      evaluate: jest.fn().mockResolvedValue(["Player 1 invalid", "Score missing"]),
    });

    const result = await getRowErrorMessages({ page: page as any });

    expect(result).toEqual(["Player 1 invalid", "Score missing"]);
    expect(page.evaluate).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when there are no error messages", async () => {
    const page = makePage({ evaluate: jest.fn().mockResolvedValue([]) });

    const result = await getRowErrorMessages({ page: page as any });

    expect(result).toEqual([]);
  });
});

// ── waitForSignInConfirmation ─────────────────────────────────────────────────

describe("waitForSignInConfirmation", () => {
  it("returns true when #profileMenu element is found", async () => {
    const fakeElement = {};
    const page = makePage({ waitForSelector: jest.fn().mockResolvedValue(fakeElement) });

    const result = await waitForSignInConfirmation({ page: page as any });

    expect(result).toBe(true);
    expect(page.waitForSelector).toHaveBeenCalledWith("#profileMenu", { timeout: 5000 });
  });

  it("returns false when #profileMenu element is null", async () => {
    const page = makePage({ waitForSelector: jest.fn().mockResolvedValue(null) });

    const result = await waitForSignInConfirmation({ page: page as any });

    expect(result).toBe(false);
  });

  it("propagates timeout error from waitForSelector", async () => {
    const page = makePage({
      waitForSelector: jest.fn().mockRejectedValue(new Error("Timeout waiting for #profileMenu")),
    });

    await expect(waitForSignInConfirmation({ page: page as any })).rejects.toThrow("Timeout");
  });

  it("uses the provided custom timeout", async () => {
    const page = makePage({ waitForSelector: jest.fn().mockResolvedValue({}) });

    await waitForSignInConfirmation({ page: page as any, timeout: 10000 });

    expect(page.waitForSelector).toHaveBeenCalledWith("#profileMenu", { timeout: 10000 });
  });
});

// ── clickSaveButton ───────────────────────────────────────────────────────────

describe("clickSaveButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("clicks the button and returns true when found", async () => {
    const fakeButton = { click: jest.fn().mockResolvedValue(undefined) };
    (waitForSelectors as jest.Mock).mockResolvedValue(fakeButton);
    const page = makePage();

    const result = await clickSaveButton({ page: page as any });

    expect(result).toBe(true);
    expect(fakeButton.click).toHaveBeenCalledTimes(1);
    expect(waitForSelectors).toHaveBeenCalledWith([["input#btnSave.button"]], page, 5000);
  });

  it("returns false when save button is not found", async () => {
    (waitForSelectors as jest.Mock).mockResolvedValue(null);
    const page = makePage();

    const result = await clickSaveButton({ page: page as any });

    expect(result).toBe(false);
  });

  it("uses the provided timeout", async () => {
    const fakeButton = { click: jest.fn().mockResolvedValue(undefined) };
    (waitForSelectors as jest.Mock).mockResolvedValue(fakeButton);
    const page = makePage();

    await clickSaveButton({ page: page as any, timeout: 15000 });

    expect(waitForSelectors).toHaveBeenCalledWith([["input#btnSave.button"]], page, 15000);
  });
});

// ── waitForNavigation ─────────────────────────────────────────────────────────

describe("waitForNavigation", () => {
  it("calls page.waitForNavigation with the given opts", async () => {
    const page = makePage();
    const opts = { waitUntil: "networkidle0" as const, timeout: 30000 };

    await waitForNavigation({ page: page as any }, opts);

    expect(page.waitForNavigation).toHaveBeenCalledWith(opts);
  });

  it("propagates errors from page.waitForNavigation", async () => {
    const page = makePage({
      waitForNavigation: jest.fn().mockRejectedValue(new Error("Navigation timeout")),
    });

    await expect(
      waitForNavigation({ page: page as any }, { waitUntil: "load", timeout: 5000 })
    ).rejects.toThrow("Navigation timeout");
  });
});

// ── waitForSaveErrorDialog ─────────────────────────────────────────────────────

describe("waitForSaveErrorDialog", () => {
  it("returns dialog message when #dlgError becomes visible", async () => {
    const fakeEl = { evaluate: jest.fn().mockResolvedValue("DE4: Catry, Petra heeft te veel wedstrijden gespeeld.") };
    const page = makePage({ waitForSelector: jest.fn().mockResolvedValue(fakeEl) });

    const result = await waitForSaveErrorDialog({ page: page as any, timeout: 15000 });

    expect(result).toBe("DE4: Catry, Petra heeft te veel wedstrijden gespeeld.");
    expect(page.waitForSelector).toHaveBeenCalledWith("#dlgError", { visible: true, timeout: 15000 });
    expect(fakeEl.evaluate).toHaveBeenCalled();
  });

  it("returns null when timeout is reached before dialog appears", async () => {
    const page = makePage({
      waitForSelector: jest.fn().mockRejectedValue(new Error("Timeout")),
    });

    const result = await waitForSaveErrorDialog({ page: page as any, timeout: 5000 });

    expect(result).toBeNull();
  });
});

// ── waitForNetworkIdle ────────────────────────────────────────────────────────

describe("waitForNetworkIdle", () => {
  it("calls page.waitForNetworkIdle with the given opts", async () => {
    const page = makePage();
    const opts = { idleTime: 500, timeout: 30000 };

    await waitForNetworkIdle({ page: page as any }, opts);

    expect(page.waitForNetworkIdle).toHaveBeenCalledWith(opts);
  });

  it("propagates errors from page.waitForNetworkIdle", async () => {
    const page = makePage({
      waitForNetworkIdle: jest.fn().mockRejectedValue(new Error("Network idle timeout")),
    });

    await expect(
      waitForNetworkIdle({ page: page as any }, { idleTime: 500, timeout: 5000 })
    ).rejects.toThrow("Network idle timeout");
  });
});
