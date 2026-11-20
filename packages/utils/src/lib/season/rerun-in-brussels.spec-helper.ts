import { execFileSync } from "child_process";

const RERUN_FLAG = "BADMAN_SEASON_SPEC_BRUSSELS";

/**
 * Re-runs a spec file once in Europe/Brussels, so a suite proves it gives the
 * same results there as in the default UTC run (jest.global-setup.js).
 *
 * Jest gives each test file a copy of process.env, so TZ cannot change inside a
 * run. Call this at the bottom of the spec with `__filename`: it adds one test
 * that runs the file again in a child jest process with TZ=Europe/Brussels. In
 * that child, or when the run already uses Brussels, it does nothing.
 */
export function rerunInBrussels(specFile: string): void {
  if (process.env["TZ"] === "Europe/Brussels" || process.env[RERUN_FLAG]) {
    return;
  }

  describe("in Europe/Brussels", () => {
    it("passes the same suite", () => {
      const jestBin = require.resolve("jest/bin/jest");
      try {
        execFileSync(
          process.execPath,
          [jestBin, "--runTestsByPath", specFile, "--coverage=false", "--ci"],
          {
            cwd: process.cwd(),
            env: { ...process.env, TZ: "Europe/Brussels", [RERUN_FLAG]: "1" },
            stdio: "pipe",
          }
        );
      } catch (error) {
        const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
        throw new Error(`Europe/Brussels run failed:\n${stderr ?? ""}${stdout ?? ""}`);
      }
    });
  });
}
