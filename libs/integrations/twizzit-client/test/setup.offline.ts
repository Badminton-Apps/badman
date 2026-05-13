/**
 * Offline test guard (FR-016/SC-005 defence in depth).
 *
 * Unless RUN_TWIZZIT_LIVE_TESTS=1, replace globalThis.fetch with a sentinel
 * that throws immediately if any test accidentally reaches the real network.
 * Tests MUST mock the client's internal axios instance via axios-mock-adapter
 * — see test/client.auth.spec.ts for the pattern.
 *
 * Note: axios uses Node's http/https modules under the hood, not fetch, so the
 * fetch guard alone does not stop real axios requests. axios-mock-adapter
 * replaces the adapter on the SPECIFIC axios instance the test attaches to,
 * which prevents any real call from going out for THAT instance. Any axios
 * call not routed through a mock would still surface as a network error
 * (Twizzit URLs don't resolve from CI), so the lack of mock = test failure.
 */
if (process.env["RUN_TWIZZIT_LIVE_TESTS"] !== "1") {
  globalThis.fetch = (): never => {
    throw new Error(
      "Real fetch attempted in offline test — the lib uses axios; tests must attach axios-mock-adapter to the client's internal axios instance"
    );
  };
}
