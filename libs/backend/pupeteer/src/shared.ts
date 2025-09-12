import path from "path";
import { ElementHandle, Page, Browser } from "puppeteer";
import { promises as fsPromises } from "fs";
import { v4 as uuidv4 } from "uuid";

// Track active browser instances for cleanup
const activeBrowsers = new Map<string, { browser: Browser; directoryId: string }>();
let instanceCounter = 0;

// Browser instance interface with cleanup function
export interface BrowserInstance {
  browser: Browser;
  instanceId: string;
  cleanup: () => Promise<void>;
  isCleanedUp: boolean;
}

// Page instance interface with cleanup function
export interface PageInstance {
  page: Page;
  instanceId: string;
  cleanup: () => Promise<void>;
  isCleanedUp: boolean;
}

/**
 * Create a unique user data directory with leak detection disabled
 */
async function createUserDataDirWithLeakDetectionDisabled(userDataDir: string): Promise<void> {
  try {
    await fsPromises.mkdir(userDataDir, { recursive: true });

    // Create preferences file to disable password leak detection
    const prefsDir = path.join(userDataDir, "Default");
    await fsPromises.mkdir(prefsDir, { recursive: true });

    const preferences = {
      profile: {
        password_manager_leak_detection: false,
      },
    };

    await fsPromises.writeFile(
      path.join(prefsDir, "Preferences"),
      JSON.stringify(preferences, null, 2)
    );
  } catch (error) {
    console.warn("Failed to create user data directory with disabled leak detection:", error);
  }
}

/**
 * Create a new browser instance with unique user data directory
 */
async function createBrowserInstance(
  headless = true,
  args: string[] = []
): Promise<{ browser: Browser; directoryId: string }> {
  const puppeteer = await import("puppeteer");

  // Create unique instance ID and user data directory
  const directoryId = `${Date.now()}-${++instanceCounter}`;
  const userDataDir = path.resolve(`./tmp/chrome-profile-${directoryId}`);

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
      "--max_old_space_size=512", // Limit V8 heap to 512MB for individual instances
      "--disable-background-timer-throttling", // Prevent throttling
      "--disable-backgrounding-occluded-windows", // Prevent backgrounding
      "--disable-renderer-backgrounding", // Keep renderer active
      // Additional memory optimization flags
      "--disable-extensions",
      "--disable-plugins",
      "--disable-images", // Disable image loading for faster PDF generation
      "--disable-javascript", // Disable JS execution after page load
      "--disable-web-security",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
      "--disable-default-apps",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-features=AudioServiceOutOfProcess",
      "--disable-features=VizServiceBase",
      "--single-process", // Use single process for lower memory usage
      "--memory-pressure-off",
      "--max-memory-usage=256", // Limit total memory usage per instance
      ...args,
    ],
    userDataDir,
  });

  return { browser, directoryId };
}

/**
 * Clean up browser instance and its user data directory
 */
async function cleanupBrowserInstance(instanceId: string): Promise<void> {
  console.log(`Starting cleanup for browser instance: ${instanceId}`);

  const browserData = activeBrowsers.get(instanceId);
  if (!browserData) {
    console.log(
      `Browser instance ${instanceId} not found in active browsers map (likely already cleaned up)`
    );
    return;
  }

  const { browser, directoryId } = browserData;

  try {
    // Close all pages first
    const pages = await browser.pages();
    console.log(`Closing ${pages.length} pages for instance ${instanceId}`);
    await Promise.all(pages.map((page) => page.close().catch(() => {})));

    // Close browser
    console.log(`Closing browser for instance ${instanceId}`);
    await browser.close();

    // Remove from active browsers map
    activeBrowsers.delete(instanceId);

    // Clean up user data directory using the stored directoryId
    const userDataDir = path.resolve(`./tmp/chrome-profile-${directoryId}`);

    console.log(`Attempting to clean up directory: ${userDataDir}`);

    try {
      // Check if directory exists first
      await fsPromises.access(userDataDir);
      await fsPromises.rm(userDataDir, { recursive: true, force: true });
      console.log(`Successfully cleaned up directory: ${userDataDir}`);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log(`Directory already cleaned up or doesn't exist: ${userDataDir}`);
      } else {
        console.warn(`Failed to clean up user data directory ${userDataDir}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error during browser cleanup for instance ${instanceId}:`, error);
  }
}

/**
 * Get a new browser instance (creates a separate browser each time)
 * @param headless Whether to run browser in headless mode
 * @param args Additional browser arguments
 * @returns Browser instance with cleanup function
 */
export async function getBrowserWithCleanup(
  headless = true,
  args: string[] = []
): Promise<BrowserInstance> {
  const { browser, directoryId } = await createBrowserInstance(headless, args);
  const instanceId = `browser-${Date.now()}-${uuidv4()}`;

  // Track the browser instance with its directory ID
  activeBrowsers.set(instanceId, { browser, directoryId });

  // Handle browser disconnection
  browser.on("disconnected", () => {
    activeBrowsers.delete(instanceId);
  });

  let isCleanedUp = false;

  const cleanup = async () => {
    if (isCleanedUp) {
      console.log(`Browser instance ${instanceId} already cleaned up, skipping`);
      return;
    }
    isCleanedUp = true;
    await cleanupBrowserInstance(instanceId);
  };

  return {
    browser,
    instanceId,
    cleanup,
    isCleanedUp: false,
  };
}

/**
 * Get a new page with its own browser instance (creates a separate browser each time)
 * @param headless Whether to run browser in headless mode
 * @param args Additional browser arguments
 * @returns Page instance with cleanup function
 */
export async function getPageWithCleanup(
  headless = true,
  args: string[] = []
): Promise<PageInstance> {
  const browserInstance = await getBrowserWithCleanup(headless, args);
  const { browser, instanceId } = browserInstance;

  // Create a new page
  const page = await browser.newPage();

  // Set page-level optimizations
  await page.setViewport({ width: 1024, height: 768 }); // Consistent viewport
  await page.setDefaultTimeout(30000); // 30 second timeout

  // Disable images and other heavy resources for PDF generation
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const resourceType = request.resourceType();
    if (["image", "media", "font"].includes(resourceType)) {
      // Skip heavy resources that aren't needed for PDF
      request.abort();
    } else {
      request.continue();
    }
  });

  let isCleanedUp = false;

  const cleanup = async () => {
    if (isCleanedUp) {
      console.log(`Page instance ${instanceId} already cleaned up, skipping`);
      return;
    }

    console.log(`Starting page cleanup for instance ${instanceId}`);
    isCleanedUp = true;

    try {
      // Close the page first
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      console.warn("Error closing page:", error);
    }

    // Clean up the entire browser instance
    await browserInstance.cleanup();
  };

  return {
    page,
    instanceId,
    cleanup,
    isCleanedUp: false,
  };
}

/**
 * Get a new browser instance (backward compatibility - returns just the browser)
 * Each call creates a separate browser instance that should be manually cleaned up
 * @param headless Whether to run browser in headless mode
 * @param args Additional browser arguments
 * @returns Browser instance
 */
export async function getBrowser(headless = true, args: string[] = []): Promise<Browser> {
  const browserInstance = await getBrowserWithCleanup(headless, args);
  return browserInstance.browser;
}

/**
 * Get a new page with its own browser instance (backward compatibility - returns just the page)
 * Each call creates a separate browser instance that should be manually cleaned up
 * @param headless Whether to run browser in headless mode
 * @param args Additional browser arguments
 * @returns Page instance
 */
export async function getPage(headless = true, args: string[] = []): Promise<Page> {
  const pageInstance = await getPageWithCleanup(headless, args);
  return pageInstance.page;
}

/**
 * Get statistics about currently active browser instances
 */
export function getActiveBrowserStats(): {
  activeBrowserCount: number;
  instanceIds: string[];
} {
  return {
    activeBrowserCount: activeBrowsers.size,
    instanceIds: Array.from(activeBrowsers.keys()),
  };
}

/**
 * Force cleanup all active browser instances (useful for shutdown)
 */
export async function cleanupAllBrowsers(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  for (const instanceId of activeBrowsers.keys()) {
    cleanupPromises.push(cleanupBrowserInstance(instanceId));
  }

  await Promise.allSettled(cleanupPromises);
  activeBrowsers.clear();
}

// Functions are already exported above

// Utility functions for finding elements (keeping existing functionality)

export async function waitForSelector(
  selector: string | string[],
  page: Page,
  timeout = 5000
): Promise<ElementHandle<Element> | null> {
  const selectors = Array.isArray(selector) ? selector : [selector];

  for (const sel of selectors) {
    try {
      return await page.waitForSelector(sel, { timeout });
    } catch (error) {
      // Continue to next selector
    }
  }
  return null;
}

export async function clickSelector(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    const element = await waitForSelector(selector, page, timeout);
    if (element) {
      await element.click();
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export async function typeInSelector(
  page: Page,
  selector: string,
  text: string,
  timeout = 5000
): Promise<boolean> {
  try {
    const element = await waitForSelector(selector, page, timeout);
    if (element) {
      await element.type(text);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export async function waitForSelectors(selectors: string[][], frame: Page, timeout?: number) {
  const errors: Error[] = [];

  for (const selectorGroup of selectors) {
    for (const selector of selectorGroup) {
      try {
        return await waitForSelector(selector, frame, timeout);
      } catch (err) {
        errors.push(err as Error);
        // Don't log every attempt, just collect errors
      }
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
