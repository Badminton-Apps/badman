import { execFileSync } from "child_process";

const RERUN_FLAG = "BADMAN_ALSO_RUN_IN_TIMEZONE";

/**
 * Runs a spec file once more in another timezone, so a suite proves it gives
 * the same results there as in the default run (Europe/Brussels, see
 * jest.global-setup.js).
 *
 * Jest gives each test file a copy of process.env, so TZ cannot change inside a
 * run. Call this at the bottom of a spec with `__filename`: it adds one test
 * that runs the file again in a child jest process with the given TZ. In that
 * child, or when the run already uses that timezone, it does nothing.
 *
 *   alsoRunInTimezone(__filename, "UTC");
 *
 * Test-only: lives at the repo root, next to jest.preset.js, and is not part of
 * any package build.
 */
export function alsoRunInTimezone(specFile: string, timeZone: string): void {
  if (process.env["TZ"] === timeZone || process.env[RERUN_FLAG]) {
    return;
  }

  describe(`in ${timeZone}`, () => {
    it("passes the same suite", () => {
      const jestBin = require.resolve("jest/bin/jest");
      try {
        execFileSync(
          process.execPath,
          [jestBin, "--runTestsByPath", specFile, "--coverage=false", "--ci"],
          {
            cwd: process.cwd(),
            env: { ...process.env, TZ: timeZone, [RERUN_FLAG]: "1" },
            stdio: "pipe",
          }
        );
      } catch (error) {
        const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
        throw new Error(`${timeZone} run failed:\n${stderr ?? ""}${stdout ?? ""}`);
      }
    });
  });
}
