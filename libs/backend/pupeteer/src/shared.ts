import path from "path";
import { ElementHandle, Page, Browser } from "puppeteer";
import { promises as fsPromises } from "fs";

// Single shared browser instance for all requests
let sharedBrowser: Browser | null = null;
let browserPromise: Promise<Browser> | null = null;
let browserStartTime = 0;
const BROWSER_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const MAX_AGE = BROWSER_MAX_AGE_MS;
const MAX_PAGES = 50;
const MAX_INACTIVE = 15 * 60 * 1000; // 15 minutes

// Track browser activity and requests
let lastActivityTime = 0;
let activeRequestCount = 0;
let isRestarting = false; // Prevent multiple simultaneous restarts
const decrementedPages = new WeakSet<Page>();

// Function to decrement active request count
export function decrementActiveRequestCount(): void {
  if (activeRequestCount > 0) {
    activeRequestCount--;
  }
}

// Function to check if browser is safe to restart
function isBrowserSafeToRestart(): boolean {
  return activeRequestCount === 0 && !isRestarting;
}

export async function getBrowser(headless = true, args: string[] = []): Promise<Browser> {
  // Update activity tracking
  lastActivityTime = Date.now();
  activeRequestCount++;

  // Check if browser needs restart due to age
  if (sharedBrowser && browserStartTime > 0) {
    const browserAge = Date.now() - browserStartTime;
    if (browserAge > BROWSER_MAX_AGE_MS) {
      console.log("Browser aged out, restarting...");
      await sharedBrowser.close();
      sharedBrowser = null;
      browserPromise = null;
    }
  }

  // If browser is already created, return it
  if (sharedBrowser) {
    return sharedBrowser;
  }

  // If browser is being created, wait for it
  if (browserPromise) {
    return browserPromise;
  }

  // Create the browser
  browserPromise = createSharedBrowser(headless, args);
  sharedBrowser = await browserPromise;
  browserStartTime = Date.now();
  return sharedBrowser;
}

// Get a new page from the shared browser (more efficient for multiple requests)
export async function getPage(headless = true, args: string[] = []): Promise<Page> {
  const browser = await getBrowser(headless, args);

  // Check memory usage and restart if needed
  try {
    const pages = await browser.pages();
    if (pages.length > MAX_PAGES) {
      // Too many pages, restart browser
      console.log("Too many pages, restarting browser...");
      await browser.close();
      sharedBrowser = null;
      browserPromise = null;
      return await getPage(headless, args); // Recursive call to get fresh browser
    }
  } catch (error) {
    // Browser might be disconnected, restart
    console.log("Browser disconnected, restarting...");
    sharedBrowser = null;
    browserPromise = null;
    return await getPage(headless, args); // Recursive call to get fresh browser
  }

  let page: Page;
  try {
    page = await browser.newPage();
  } catch (error) {
    // CDP session may be stale (e.g. "Session with given id not found") after a previous job
    const msg = error instanceof Error ? error.message : String(error);
    console.log("browser.newPage() failed (stale session?), restarting browser:", msg);
    sharedBrowser = null;
    browserPromise = null;
    return await getPage(headless, args); // Recursive call to get fresh browser
  }

  // Track when page is closed to update request count (guard against double-decrement)
  const originalClose = page.close.bind(page);
  page.close = async () => {
    if (!decrementedPages.has(page)) {
      decrementedPages.add(page);
      decrementActiveRequestCount();
    }
    return originalClose();
  };

  // Safety net for crashes where close() isn't called
  page.on("error", () => {
    if (!decrementedPages.has(page)) {
      decrementedPages.add(page);
      decrementActiveRequestCount();
    }
  });

  return page;
}

async function createSharedBrowser(headless = true, args: string[] = []): Promise<Browser> {
  const puppeteer = await import("puppeteer");

  // Use a unique user data directory per process to avoid SingletonLock conflicts
  // when multiple worker instances run (e.g. on Render); Chrome allows only one
  // browser per profile directory.
  //
  // Why we still use one shared browser per process: the original design used multiple
  // browser instances per process (each with chrome-profile-<timestamp>-<n>), which was
  // changed to a single shared browser + chrome-profile-shared to fix a deploy error (resource
  // use / stability). We keep that single-browser-per-process model; only the profile path
  // is now per-process so multiple processes (e.g. scaled workers) don't share one dir.
  //
  // Cleanup: BrowserCleanupService and scripts already target "chrome-profile-*", so
  // all per-process dirs are cleaned. On ephemeral systems (e.g. Render) the filesystem
  // is discarded on shutdown anyway.
  const userDataDir = path.resolve("./tmp", `chrome-profile-${process.pid}`);

  // Create user data dir with leak detection disabled
  await createUserDataDirWithLeakDetectionDisabled(userDataDir);

  const browser = await puppeteer.launch({
    headless,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-password-leak-detection", // Disable leak detection via command line
      "--disable-features=VizDisplayCompositor", // Additional stability
      "--disable-dev-shm-usage", // Prevent memory issues
      "--memory-pressure-off", // Reduce memory pressure
      "--max_old_space_size=2048", // Limit V8 heap to 2GB
      "--disable-background-timer-throttling", // Prevent throttling
      "--disable-backgrounding-occluded-windows", // Prevent backgrounding
      "--disable-renderer-backgrounding", // Keep renderer active
      ...args,
    ],
    userDataDir,
    protocolTimeout: 180_000, // 3 minutes — Puppeteer's default; 30s was too tight and caused unhandled ProtocolError rejections during post-save frame initialization on slow servers
  });

  // Handle browser disconnection
  browser.on("disconnected", () => {
    sharedBrowser = null;
    browserPromise = null;
    browserStartTime = 0;
  });

  return browser;
}

// Helper to create a user data dir with leak detection disabled
export async function createUserDataDirWithLeakDetectionDisabled(dir: string) {
  const preferencesPath = path.join(dir, "Default", "Preferences");
  await fsPromises.mkdir(path.dirname(preferencesPath), { recursive: true });
  await fsPromises.writeFile(
    preferencesPath,
    JSON.stringify({
      // Additional settings to prevent alerts
      credentials_enable_service: false,
      credentials_enable_autosignin: false,
      profile: {
        password_manager_enabled: false,
        password_manager_leak_detection: false,
      },
    }),
    { encoding: "utf8" }
  );
}

export async function waitForSelector(
  selector: string[] | string,
  frame: Page,
  timeout?: number,
  options: {
    visible?: boolean;
  } = {
    visible: false,
  }
) {
  if (selector instanceof Array) {
    let element: ElementHandle<Element> | null = null;
    for (const part of selector) {
      if (!element) {
        element = await frame.waitForSelector(part, {
          timeout,
          visible: options.visible,
        });
      } else {
        element = await element.$(part);
      }
      if (!element) {
        throw new Error("Could not find element: " + part);
      }
      element = (
        await element.evaluateHandle((el) => (el.shadowRoot ? el.shadowRoot : el))
      ).asElement() as ElementHandle<Element>;
    }
    if (!element) {
      throw new Error("Could not find element: " + selector.join("|"));
    }
    return element;
  }
  const element = await frame.waitForSelector(selector, { timeout });
  if (!element) {
    throw new Error("Could not find element: " + selector);
  }
  return element;
}

export async function querySelectorsAll(selectors: string[], frame: Page) {
  for (const selector of selectors) {
    const result = await querySelectorAll(selector, frame);
    if (result.length) {
      return result;
    }
  }
  return [];
}

export async function querySelectorAll(selector: string | string[], frame: Page) {
  let elements: ElementHandle<Element>[] = [];
  try {
    if (selector instanceof Array) {
      let i = 0;
      for (const part of selector) {
        if (i === 0) {
          elements = await frame.$$(part);
        } else {
          const tmpElements = elements;
          elements = [];
          for (const el of tmpElements) {
            elements.push(...(await el.$$(part)));
          }
        }
        if (elements.length === 0) {
          return [];
        }
        const tmpElements = [];
        for (const el of elements) {
          const newEl = (
            await el.evaluateHandle((el) => (el.shadowRoot ? el.shadowRoot : el))
          ).asElement() as ElementHandle<Element>;
          if (newEl) {
            tmpElements.push(newEl);
          }
        }
        elements = tmpElements;
        i++;
      }
    } else {
      elements = await frame.$$(selector);
    }
    return elements;
  } finally {
    // Clean up all element handles
    await Promise.all(elements.map((el) => el.dispose()));
  }
}

export async function waitForFunction(fn: () => unknown, timeout: number) {
  let isActive = true;
  setTimeout(() => {
    isActive = false; // This could be called after the function returns
  }, timeout);
  while (isActive) {
    const result = await fn();
    if (result) {
      return; // Function returns but setTimeout callback still executes
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out");
}

export async function waitForSelectors(selectors: string[][], frame: Page, timeout?: number) {
  const errors: Error[] = [];

  for (const selector of selectors) {
    try {
      return await waitForSelector(selector, frame, timeout);
    } catch (err) {
      errors.push(err as Error);
      // Don't log every attempt, just collect errors
    }
  }

  // This will always execute if no selector is found
  if (errors.length > 0) {
    console.error(
      "All selectors failed:",
      errors.map((e) => e.message)
    );
  }

  throw new Error("Could not find element for selectors: " + JSON.stringify(selectors));
}

// Add dispose methods for element handles
export async function disposeElement(element: ElementHandle<Element>) {
  if (element) {
    await element.dispose();
  }
}

// Cleanup function to manually restart browser
export async function restartBrowser(): Promise<void> {
  if (sharedBrowser) {
    await sharedBrowser.close();
    sharedBrowser = null;
    browserPromise = null;
    browserStartTime = 0;
  }
}

// Graceful restart function
async function gracefulRestart(): Promise<void> {
  if (sharedBrowser && isBrowserSafeToRestart()) {
    isRestarting = true;
    console.log("Performing graceful browser restart...");

    try {
      await sharedBrowser.close();
      sharedBrowser = null;
      browserPromise = null;
      browserStartTime = 0;
      console.log("Browser restart completed successfully");
    } catch (error: any) {
      console.log("Error during browser restart:", error?.message || error);
    } finally {
      isRestarting = false;
    }
  } else if (isRestarting) {
    console.log("Browser restart already in progress, skipping...");
  } else {
    console.log("Browser has active requests, skipping restart for now...");
  }
}

// Export the monitoring function for services to use
export function startBrowserHealthMonitoring(): () => void {
  const interval = setInterval(
    async () => {
      if (!sharedBrowser) {
        return; // No browser to check
      }

      try {
        const now = Date.now();
        const browserAge = now - browserStartTime;
        const inactiveTime = now - lastActivityTime;
        const pages = await sharedBrowser.pages();
        const pageCount = pages.length;

        // Only restart when safe: never close the browser while a job might still have a page.
        // Restart when: too many pages (memory), or (idle long enough AND no open pages).
        // If there are open pages we skip restart for age/inactivity to avoid killing active jobs
        // (which would leave them stuck and cause "job stalled more than maxStalledCount").
        const tooManyPages = pageCount > MAX_PAGES;
        const idleAndNoPages =
          pageCount === 0 &&
          (browserAge > MAX_AGE ||
            (inactiveTime > MAX_INACTIVE && isBrowserSafeToRestart()));
        const needsRestart = tooManyPages || idleAndNoPages;

        if (needsRestart) {
          console.log(
            `Browser restart needed: age=${browserAge}ms, pages=${pageCount}, inactive=${inactiveTime}ms, activeRequests=${activeRequestCount}`
          );
          await gracefulRestart();
        }
      } catch (error: any) {
        console.log("Error checking browser health, restarting...", error?.message || error);
        await gracefulRestart();
      }
    },
    15 * 60 * 1000
  ); // Check every 15 minutes

  // Return cleanup function
  return () => clearInterval(interval);
}
