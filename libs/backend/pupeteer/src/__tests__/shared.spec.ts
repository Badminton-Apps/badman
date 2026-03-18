/**
 * Unit tests for shared.ts browser recovery (getPage, getBrowser, forceCloseBrowser behavior).
 * Puppeteer and fs are mocked; no real browser or filesystem.
 */

jest.mock("puppeteer", () => {
  const launch = jest.fn();
  return {
    __esModule: true,
    default: { launch },
    launch,
  };
});

jest.mock("fs", () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

function makeMockPage() {
  const closeFn = jest.fn().mockResolvedValue(undefined);
  return {
    close: closeFn,
    on: jest.fn(),
    bind: (fn: () => unknown) => fn,
  };
}

function makeMockBrowser(overrides: Partial<{
  pages: jest.Mock;
  newPage: jest.Mock;
  close: jest.Mock;
  process: jest.Mock;
}> = {}) {
  const defaultProcess = { killed: false, kill: jest.fn() };
  const processFn = jest.fn().mockReturnValue(defaultProcess);
  return {
    pages: jest.fn().mockResolvedValue([]),
    newPage: jest.fn().mockResolvedValue(makeMockPage()),
    close: jest.fn().mockResolvedValue(undefined),
    process: processFn,
    on: jest.fn(),
    ...overrides,
  };
}

type SharedModule = {
  getPage: (headless?: boolean, args?: string[]) => Promise<unknown>;
  getBrowser: (headless?: boolean, args?: string[]) => Promise<unknown>;
  restartBrowser: () => Promise<void>;
  createProtocolTimeoutGuard: (logger: { warn: (...args: unknown[]) => void }) => {
    install: () => void;
    remove: () => void;
  };
};

let shared: SharedModule;
let mockLaunch: jest.Mock;

beforeEach(() => {
  jest.resetModules();
  shared = require("../shared") as SharedModule;
  mockLaunch = require("puppeteer").launch;
  mockLaunch.mockReset();
});

describe("getPage", () => {
  it("happy path: pages() returns [], newPage() succeeds and returns a Page", async () => {
    const mockBrowser = makeMockBrowser();
    mockLaunch.mockResolvedValue(mockBrowser);

    const page = await shared.getPage(true, []);

    expect(page).toBeDefined();
    expect(mockBrowser.pages).toHaveBeenCalled();
    expect(mockBrowser.newPage).toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalledTimes(1);
  });

  it("browser.pages() throws -> forceCloses old browser, retries with fresh browser", async () => {
    const firstBrowser = makeMockBrowser();
    firstBrowser.pages.mockRejectedValueOnce(new Error("Browser disconnected"));
    const secondBrowser = makeMockBrowser();
    secondBrowser.pages.mockResolvedValue([]);
    secondBrowser.newPage.mockResolvedValue(makeMockPage());

    mockLaunch.mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser);

    const page = await shared.getPage(true, []);

    expect(page).toBeDefined();
    expect(firstBrowser.close).toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalledTimes(2);
  });

  it("browser.newPage() throws -> forceCloses old browser, retries with fresh browser", async () => {
    const firstBrowser = makeMockBrowser();
    firstBrowser.pages.mockResolvedValue([]);
    firstBrowser.newPage.mockRejectedValueOnce(
      new Error("Protocol error (Target.createTarget): Session with given id not found")
    );
    const secondBrowser = makeMockBrowser();
    secondBrowser.pages.mockResolvedValue([]);
    secondBrowser.newPage.mockResolvedValue(makeMockPage());

    mockLaunch.mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser);

    const page = await shared.getPage(true, []);

    expect(page).toBeDefined();
    expect(firstBrowser.close).toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalledTimes(2);
  });

  it("too many pages -> closes browser, retries", async () => {
    const firstBrowser = makeMockBrowser();
    const manyPages = Array.from({ length: 51 }, () => makeMockPage());
    firstBrowser.pages.mockResolvedValue(manyPages);
    const secondBrowser = makeMockBrowser();
    secondBrowser.pages.mockResolvedValue([]);
    secondBrowser.newPage.mockResolvedValue(makeMockPage());

    mockLaunch.mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser);

    const page = await shared.getPage(true, []);

    expect(page).toBeDefined();
    expect(firstBrowser.close).toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalledTimes(2);
  });
});

describe("forceCloseBrowser (via getPage error paths)", () => {
  it("close() succeeds -> does not kill process", async () => {
    const firstBrowser = makeMockBrowser();
    firstBrowser.pages.mockRejectedValueOnce(new Error("disconnected"));
    firstBrowser.close.mockResolvedValue(undefined);
    const secondBrowser = makeMockBrowser();
    secondBrowser.pages.mockResolvedValue([]);
    secondBrowser.newPage.mockResolvedValue(makeMockPage());

    mockLaunch.mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser);

    await shared.getPage(true, []);

    expect(firstBrowser.close).toHaveBeenCalled();
    const proc = firstBrowser.process();
    expect(proc.kill).not.toHaveBeenCalled();
  });

  it("close() throws -> falls back to process.kill(SIGKILL)", async () => {
    const killFn = jest.fn();
    const firstBrowser = makeMockBrowser();
    firstBrowser.pages.mockRejectedValueOnce(new Error("disconnected"));
    firstBrowser.close.mockRejectedValueOnce(new Error("Target closed"));
    firstBrowser.process.mockReturnValue({ killed: false, kill: killFn });
    const secondBrowser = makeMockBrowser();
    secondBrowser.pages.mockResolvedValue([]);
    secondBrowser.newPage.mockResolvedValue(makeMockPage());

    mockLaunch.mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser);

    await shared.getPage(true, []);

    expect(firstBrowser.close).toHaveBeenCalled();
    expect(killFn).toHaveBeenCalledWith("SIGKILL");
  });
});

describe("getBrowser", () => {
  it("aged browser is closed and replaced", async () => {
    jest.useFakeTimers();
    const firstBrowser = makeMockBrowser();
    const secondBrowser = makeMockBrowser();
    mockLaunch.mockResolvedValueOnce(firstBrowser).mockResolvedValueOnce(secondBrowser);

    await shared.getBrowser(true, []);
    expect(mockLaunch).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60 * 60 * 1000 + 1); // BROWSER_MAX_AGE_MS + 1

    await shared.getBrowser(true, []);

    expect(firstBrowser.close).toHaveBeenCalled();
    expect(mockLaunch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

describe("createProtocolTimeoutGuard", () => {
  let logger: { warn: jest.Mock };

  beforeEach(() => {
    logger = { warn: jest.fn() };
  });

  it("returns install and remove functions", () => {
    const guard = shared.createProtocolTimeoutGuard(logger);
    expect(guard.install).toBeDefined();
    expect(guard.remove).toBeDefined();
    expect(typeof guard.install).toBe("function");
    expect(typeof guard.remove).toBe("function");
  });

  it("install adds unhandledRejection listener, remove removes it", () => {
    const guard = shared.createProtocolTimeoutGuard(logger);
    const countBefore = process.listenerCount("unhandledRejection");

    guard.install();
    expect(process.listenerCount("unhandledRejection")).toBe(countBefore + 1);

    guard.remove();
    expect(process.listenerCount("unhandledRejection")).toBe(countBefore);
  });

  it("suppresses matching ProtocolError timeout and calls logger.warn", () => {
    const guard = shared.createProtocolTimeoutGuard(logger);
    guard.install();

    const reason = new Error(
      "Page.addScriptToEvaluateOnNewDocument timed out. Increase the 'protocolTimeout' setting in launch/connect calls for a higher timeout if needed."
    );
    // Invoke the handler directly to avoid triggering Jest's unhandledRejection handling
    const listeners = process.rawListeners("unhandledRejection");
    const ourListener = listeners[listeners.length - 1] as (reason: unknown, promise: Promise<unknown>) => void;
    ourListener(reason, Promise.resolve());

    expect(logger.warn).toHaveBeenCalledWith(
      "Suppressed internal Puppeteer ProtocolError (non-fatal):",
      reason.message
    );

    guard.remove();
  });

  it("suppresses Network.enable timed out message", () => {
    const guard = shared.createProtocolTimeoutGuard(logger);
    guard.install();

    const reason = new Error("Network.enable timed out");
    const listeners = process.rawListeners("unhandledRejection");
    const ourListener = listeners[listeners.length - 1] as (reason: unknown, promise: Promise<unknown>) => void;
    ourListener(reason, Promise.resolve());

    expect(logger.warn).toHaveBeenCalledWith(
      "Suppressed internal Puppeteer ProtocolError (non-fatal):",
      reason.message
    );

    guard.remove();
  });

  it("double install does not add duplicate listener", () => {
    const guard = shared.createProtocolTimeoutGuard(logger);
    const countBefore = process.listenerCount("unhandledRejection");

    guard.install();
    guard.install();
    expect(process.listenerCount("unhandledRejection")).toBe(countBefore + 1);

    guard.remove();
    expect(process.listenerCount("unhandledRejection")).toBe(countBefore);
  });

  it("remove is idempotent", () => {
    const guard = shared.createProtocolTimeoutGuard(logger);
    guard.install();
    const countAfterInstall = process.listenerCount("unhandledRejection");

    guard.remove();
    guard.remove();
    expect(process.listenerCount("unhandledRejection")).toBe(countAfterInstall - 1);
  });
});
