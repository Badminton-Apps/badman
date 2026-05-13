/**
 * T046 — Offline fetch guard (SC-005 / FR-016).
 *
 * Unless RUN_TWIZZIT_LIVE_TESTS=1, replace globalThis.fetch with a sentinel
 * that throws immediately if any test accidentally reaches the real network.
 * Every offline test MUST inject its own fetch via TwizzitClientConfig.fetch
 * or use a fixture-driven approach.
 */
if (process.env["RUN_TWIZZIT_LIVE_TESTS"] !== "1") {
  globalThis.fetch = (): never => {
    throw new Error(
      "Real fetch attempted in offline test — use injected fetch via TwizzitClient config or fixture-driven test"
    );
  };
}
