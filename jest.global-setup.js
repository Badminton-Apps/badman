// Runs once per jest run, before the workers start, so they inherit TZ.
//
// Pins the timezone for every test run: date tests then give the same result
// locally (usually Europe/Brussels) as in CI (ubuntu runners use UTC). Set TZ
// yourself to run a suite in another timezone, e.g. `TZ=Europe/Brussels pnpm test`.
module.exports = async () => {
  process.env.TZ = process.env.TZ || "UTC";
};
