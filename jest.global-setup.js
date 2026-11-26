// Runs once per jest run, before the workers start, so they inherit TZ.
//
// Pins the timezone for every test run to the one production uses: the API and
// the workers run with TZ=Europe/Brussels on Render. Date tests then give the
// same result locally, in CI (ubuntu runners use UTC) and in production. Set TZ
// yourself to run a suite in another timezone, e.g. `TZ=UTC pnpm test`, or use
// jest.also-run-in-timezone.ts to make a suite prove it does not depend on it.
// Keep the default in sync with PRODUCTION_TIME_ZONE in jest.also-run-in-timezone.ts.
module.exports = async () => {
  process.env.TZ = process.env.TZ || "Europe/Brussels";
};
