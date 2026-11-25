#!/usr/bin/env node
/**
 * debug-toernooi-login.js
 *
 * Standalone diagnostic: steps through the exact toernooi.nl sign-in flow used
 * by the enter-scores worker, measuring timing and page state at each step.
 * Runs a VISIBLE browser so you can see exactly what the site shows.
 *
 * Usage:
 *   VR_API_USER=<username> VR_API_PASS=<password> node scripts/debug-toernooi-login.js
 *
 * Optional env vars:
 *   HEADLESS=true          Run headless (default: false = visible browser)
 *   STEP_TIMEOUT=20000     Timeout per navigation step in ms (default: 20000)
 *   SCREENSHOT_DIR=./tmp   Where to save screenshots (default: ./tmp/toernooi-debug)
 */

const path = require("path");
const fs = require("fs");

// Load .env files
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
} catch (_e) {
  // dotenv optional
}
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch (_e) {
  // dotenv optional
}

const puppeteer = require("puppeteer");

const USERNAME = process.env.VR_API_USER;
const PASSWORD = process.env.VR_API_PASS;
const HEADLESS = process.env.HEADLESS === "true";
const STEP_TIMEOUT = parseInt(process.env.STEP_TIMEOUT || "20000", 10);
const SCREENSHOT_DIR =
  process.env.SCREENSHOT_DIR || path.resolve(__dirname, "../tmp/toernooi-debug");

if (!USERNAME || !PASSWORD) {
  console.error("ERROR: VR_API_USER and VR_API_PASS must be set");
  process.exit(1);
}

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let stepIndex = 0;

async function screenshot(page, label) {
  const file = path.join(SCREENSHOT_DIR, `${String(++stepIndex).padStart(2, "0")}-${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  [screenshot] ${file}`);
  } catch (e) {
    console.log(`  [screenshot failed] ${e.message}`);
  }
}

function elapsed(start) {
  return `${((Date.now() - start) / 1000).toFixed(2)}s`;
}

async function checkSelector(page, selector, timeout = 2000) {
  try {
    const el = await page.waitForSelector(selector, { timeout });
    return !!el;
  } catch {
    return false;
  }
}

async function run() {
  console.log("=".repeat(70));
  console.log("toernooi.nl sign-in diagnostic");
  console.log(`  username:       ${USERNAME}`);
  console.log(`  headless:       ${HEADLESS}`);
  console.log(`  step timeout:   ${STEP_TIMEOUT}ms`);
  console.log(`  screenshots:    ${SCREENSHOT_DIR}`);
  console.log("=".repeat(70));

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-features=PasswordManagerEnabled,AutofillKeyBoardAccessoryView",
      "--disable-save-password-bubble",
    ],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(STEP_TIMEOUT);
  await page.setViewport({ width: 1280, height: 900 });

  // Capture console errors from the page
  page.on("pageerror", (err) => console.log(`  [page error] ${err.message}`));
  page.on("requestfailed", (req) => {
    const failure = req.failure();
    if (failure) {
      console.log(`  [request failed] ${req.url().slice(0, 80)} — ${failure.errorText}`);
    }
  });

  try {
    // ── STEP 1: Navigate to cookiewall ──────────────────────────────────────
    console.log("\n[1] Navigating to cookiewall...");
    let t = Date.now();
    try {
      await page.goto("https://www.toernooi.nl/cookiewall/", {
        waitUntil: "domcontentloaded",
        timeout: STEP_TIMEOUT * 3,
      });
      console.log(`    OK (${elapsed(t)}) — URL: ${page.url()}`);
    } catch (err) {
      console.log(`    FAILED (${elapsed(t)}): ${err.message}`);
      await screenshot(page, "cookiewall-failed");
      throw err;
    }
    await screenshot(page, "cookiewall-loaded");

    // ── STEP 2: Accept cookies ───────────────────────────────────────────────
    console.log("\n[2] Looking for cookie accept button...");
    t = Date.now();
    const cookieBtn = await page.$(
      'button[type="submit"], button.btn.btn--success.js-accept-basic'
    );
    if (cookieBtn) {
      console.log(`    Found cookie button (${elapsed(t)}), clicking...`);
      await cookieBtn.click();
      try {
        await Promise.race([
          page.waitForNavigation({ timeout: STEP_TIMEOUT }),
          page.waitForNetworkIdle({ idleTime: 500, timeout: STEP_TIMEOUT }).catch(() => null),
        ]);
      } catch {
        console.log("    Navigation after cookie click timed out (continuing)");
      }
      console.log(`    Done (${elapsed(t)}) — URL: ${page.url()}`);
    } else {
      console.log(`    No cookie button found (${elapsed(t)}) — already accepted or not shown`);
    }
    await screenshot(page, "after-cookies");

    // ── STEP 3: Audit page state after cookies ───────────────────────────────
    console.log("\n[3] Auditing page state after cookie acceptance...");
    console.log(`    URL: ${page.url()}`);

    // Check for old vs new UI
    const hasOldMasthead = await checkSelector(page, "div.masthead.masthead--fixed", 1000);
    const hasNewSidebar = await checkSelector(
      page,
      "nav.sidebar, aside.sidebar, [class*='sidebar']",
      1000
    );
    console.log(`    Old masthead UI:  ${hasOldMasthead}`);
    console.log(`    New sidebar UI:   ${hasNewSidebar}`);

    // Check for consent dialogs
    const hasConsentModal = await checkSelector(
      page,
      "[class*='consent'], [class*='cookie'], [id*='consent'], [id*='cookie']",
      1000
    );
    const hasConsentIframe = await page.$(
      'iframe[src*="nojazz"], iframe[src*="consentui"], iframe[src*="cmp"]'
    );
    console.log(`    Consent modal:    ${hasConsentModal}`);
    console.log(`    Consent iframe:   ${!!hasConsentIframe}`);

    if (hasConsentIframe) {
      const iframeSrc = await hasConsentIframe.evaluate((el) => el.src);
      console.log(`    Consent iframe src: ${iframeSrc}`);
    }

    // Dump all iframes on the page
    const iframes = await page.$$eval("iframe", (els) =>
      els.map((el) => `${el.src} (id=${el.id})`)
    );
    if (iframes.length) {
      console.log(`    Iframes on page:\n      ${iframes.join("\n      ")}`);
    } else {
      console.log(`    No iframes on page`);
    }

    // Dump visible overlays/modals
    const overlays = await page.$$eval(
      "[class*='modal'], [class*='overlay'], [class*='dialog'], [class*='popup'], [class*='cookie'], [class*='consent'], [class*='gdpr']",
      (els) =>
        els
          .filter((el) => {
            const s = globalThis.getComputedStyle(el);
            return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
          })
          .map(
            (el) =>
              `${el.tagName.toLowerCase()}[class="${el.className.slice(0, 80)}"] id="${el.id}"`
          )
    );
    if (overlays.length) {
      console.log(`    Visible overlays/modals:\n      ${overlays.join("\n      ")}`);
    } else {
      console.log(`    No visible overlays/modals detected`);
    }

    // Check for login-related selectors (old vs new)
    const oldLoginBtn = await checkSelector(
      page,
      "body > div.content > div.masthead.masthead--fixed > div.masthead__user > a",
      1000
    );
    const ariaLoginBtn = await checkSelector(
      page,
      "a[aria-label='Log in'], a[href*='login' i], a[href*='user' i]",
      1000
    );
    const profileMenu = await checkSelector(page, "#profileMenu", 1000);
    console.log(`    Old login selector:  ${oldLoginBtn}`);
    console.log(`    Aria/href login btn: ${ariaLoginBtn}`);
    console.log(`    #profileMenu:        ${profileMenu}`);

    if (profileMenu) {
      console.log("    Already signed in — no login needed");
      await screenshot(page, "already-logged-in");
      return;
    }

    // ── STEP 3b: Dismiss CMP consent iframe if present ───────────────────────
    console.log("\n[3b] Handling CMP consent iframe...");
    const cmpIframe = await page.$('iframe[src*="nojazz.eu/nl/cmp/"]');
    if (cmpIframe) {
      const cmpSrc = await cmpIframe.evaluate((el) => el.src);
      console.log(`    CMP iframe found: ${cmpSrc}`);
      const frame = await cmpIframe.contentFrame();
      if (frame) {
        // Dump all buttons inside the iframe
        try {
          const buttons = await frame.$$eval("button, a.btn, .btn", (els) =>
            els.map(
              (el) =>
                `${el.tagName.toLowerCase()}[class="${el.className.slice(0, 60)}"] text="${el.textContent?.trim().slice(0, 40)}"`
            )
          );
          console.log(`    Buttons in CMP iframe:\n      ${buttons.join("\n      ") || "(none)"}`);
        } catch (e) {
          console.log(`    Could not enumerate iframe buttons: ${e.message}`);
        }

        // Try old selector first, then broader fallbacks
        const selectors = [
          "#consentui .btn.green",
          ".btn.green",
          "button.green",
          "[class*='accept']",
          "[class*='agree']",
          "button[type='submit']",
        ];
        let dismissed = false;
        for (const sel of selectors) {
          try {
            const btn = await frame.waitForSelector(sel, { timeout: 1500 });
            if (btn) {
              console.log(`    Clicking CMP button via selector: ${sel}`);
              await btn.click();
              await page.waitForNavigation({ timeout: 5000 }).catch(() => null);
              dismissed = true;
              console.log(`    CMP dismissed (${sel})`);
              break;
            }
          } catch {
            /* try next */
          }
        }
        if (!dismissed) {
          console.log(
            "    WARNING: Could not find dismiss button in CMP iframe — login may be blocked"
          );
        }
      }
    } else {
      console.log("    No CMP iframe found");
    }
    await screenshot(page, "after-cmp-dismiss");

    // ── STEP 4: Find and click "Log in" button ───────────────────────────────
    console.log("\n[4] Looking for Log in button...");
    t = Date.now();

    const loginLinkSelector =
      "body > div.content > div.masthead.masthead--fixed > div.masthead__user > a";
    let loginBtn = await page.$(loginLinkSelector);
    if (!loginBtn) {
      // try ARIA fallback
      loginBtn = await page.$("a[href*='login'], a[href*='Login']");
    }

    console.log(`    Login button found: ${!!loginBtn}`);
    if (loginBtn) {
      const href = await loginBtn.evaluate((el) => el.href || el.textContent?.trim());
      console.log(`    Button href/text: ${href}`);
    } else {
      // Dump all links on the page for diagnosis
      const links = await page.$$eval("a", (els) =>
        els.slice(0, 20).map((el) => `${el.href} (${el.textContent?.trim().slice(0, 30)})`)
      );
      console.log(`    All links on page:\n      ${links.join("\n      ")}`);
      await screenshot(page, "no-login-button");
      throw new Error("Login button not found on page — selectors may have changed");
    }

    // Set up navigation listener BEFORE clicking
    const WAIT_UNTIL = process.env.WAIT_UNTIL || "networkidle0";
    console.log(
      `    Clicking Log in and waiting for navigation (waitUntil: ${WAIT_UNTIL}, timeout: ${STEP_TIMEOUT}ms)...`
    );
    t = Date.now();

    const navPromise = page
      .waitForNavigation({ waitUntil: WAIT_UNTIL, timeout: STEP_TIMEOUT })
      .then(() => ({ result: `${WAIT_UNTIL}-ok`, elapsed: elapsed(t) }))
      .catch((err) => ({
        result: `${WAIT_UNTIL}-timeout`,
        elapsed: elapsed(t),
        error: err.message,
      }));

    await loginBtn.click();

    const navResult = await navPromise;
    console.log(
      `    Navigation result (${WAIT_UNTIL}): ${navResult.result} (${navResult.elapsed})`
    );
    if (navResult.error) {
      console.log(`    Navigation error: ${navResult.error}`);
    }

    console.log(`    URL after click: ${page.url()}`);
    await screenshot(page, "after-login-click");

    // ── STEP 5: Check if we're on the login form ─────────────────────────────
    console.log("\n[5] Checking login form...");
    const loginInput = await checkSelector(page, "#Login", 3000);
    const passwordInput = await checkSelector(page, "#Password", 3000);
    const submitBtn = await checkSelector(page, "#btnLogin", 3000);
    console.log(`    #Login input:    ${loginInput}`);
    console.log(`    #Password input: ${passwordInput}`);
    console.log(`    #btnLogin:       ${submitBtn}`);
    console.log(`    URL:             ${page.url()}`);

    if (!loginInput || !passwordInput || !submitBtn) {
      await screenshot(page, "login-form-not-found");
      throw new Error(
        `Login form elements missing — login:${loginInput} pw:${passwordInput} btn:${submitBtn}`
      );
    }

    // ── STEP 6: Enter credentials ─────────────────────────────────────────────
    console.log("\n[6] Entering credentials...");
    t = Date.now();
    await page.type("#Login", USERNAME);
    await page.type("#Password", PASSWORD);
    console.log(`    Typed (${elapsed(t)})`);
    await screenshot(page, "credentials-entered");

    // ── STEP 7: Submit and wait for navigation ────────────────────────────────
    console.log(
      `\n[7] Clicking INLOGGEN and waiting (waitUntil: ${WAIT_UNTIL}, timeout: ${STEP_TIMEOUT}ms)...`
    );
    t = Date.now();

    const submitNavPromise = page
      .waitForNavigation({ waitUntil: WAIT_UNTIL, timeout: STEP_TIMEOUT })
      .then(() => ({ result: `${WAIT_UNTIL}-ok`, elapsed: elapsed(t) }))
      .catch((err) => ({
        result: `${WAIT_UNTIL}-timeout`,
        elapsed: elapsed(t),
        error: err.message,
      }));

    const submitBtn2 = await page.$("#btnLogin");
    if (submitBtn2) {
      await submitBtn2.click();
    } else {
      throw new Error("#btnLogin disappeared before click");
    }

    const submitNavResult = await submitNavPromise;
    console.log(
      `    Navigation result (${WAIT_UNTIL}): ${submitNavResult.result} (${submitNavResult.elapsed})`
    );
    if (submitNavResult.error) {
      console.log(`    Navigation error: ${submitNavResult.error}`);
    }

    console.log(`    URL after submit: ${page.url()}`);
    await screenshot(page, "after-login-submit");

    // ── STEP 8: Check if we're logged in ─────────────────────────────────────
    console.log("\n[8] Checking post-login state...");
    const postLoginProfileMenu = await checkSelector(page, "#profileMenu", 5000);
    const loginError = await checkSelector(
      page,
      ".validation-summary-errors, .field-validation-error",
      2000
    );
    console.log(`    #profileMenu (logged in): ${postLoginProfileMenu}`);
    console.log(`    Login error shown:        ${loginError}`);
    console.log(`    Final URL:                ${page.url()}`);

    if (loginError) {
      const errorText = await page
        .$eval(".validation-summary-errors, .field-validation-error", (el) =>
          el.textContent?.trim()
        )
        .catch(() => "(could not read error text)");
      console.log(`    Error message: ${errorText}`);
    }

    await screenshot(page, "final-state");

    if (postLoginProfileMenu) {
      console.log("\nRESULT: Login SUCCEEDED");
    } else {
      console.log("\nRESULT: Login FAILED — #profileMenu not found after submit");
    }
  } catch (err) {
    console.log(`\nFATAL ERROR: ${err.message}`);
    try {
      await screenshot(page, "fatal-error");
    } catch (_e) {
      // screenshot may fail if page is already closed
    }
    console.log(`\nRESULT: Diagnostic failed with error`);
  } finally {
    console.log("\n" + "=".repeat(70));
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    if (!HEADLESS) {
      console.log("Browser left open for 10s for manual inspection...");
      await new Promise((r) => setTimeout(r, 10000));
    }
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
