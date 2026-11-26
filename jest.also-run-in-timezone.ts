import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { dirname, join } from "path";

const RERUN_FLAG = "BADMAN_ALSO_RUN_IN_TIMEZONE";

/**
 * The timezone production runs in (TZ on the Render services). Keep in sync
 * with the default in jest.global-setup.js.
 */
const PRODUCTION_TIME_ZONE = "Europe/Brussels";

const JEST_CONFIG_FILES = ["jest.config.ts", "jest.config.js"];

/**
 * Runs a spec file once more in another timezone, so a suite proves it gives
 * the same results there as in the default run (Europe/Brussels, see
 * jest.global-setup.js).
 *
 * Jest gives each test file a copy of process.env, so TZ cannot change inside a
 * run. Call this at the bottom of a spec with `__filename`: it adds one test
 * that runs the file again in a child jest process with the given TZ. In that
 * child it does nothing.
 *
 *   alsoRunInTimezone(__filename, "UTC");
 *
 * When the run already uses `timeZone` (because TZ was set by hand, or the
 * default in jest.global-setup.js changed), the extra run uses Europe/Brussels
 * instead (or UTC when `timeZone` is Europe/Brussels itself), so the suite
 * always runs in two different timezones, one of them production's.
 *
 * The child uses the jest config of the spec's own package, so this works from
 * the package folder, from the repo root and under turbo.
 *
 * Test-only: lives at the repo root, next to jest.preset.js, and is not part of
 * any package build.
 */
export function alsoRunInTimezone(specFile: string, timeZone: string): void {
  if (process.env[RERUN_FLAG]) {
    return;
  }
  const otherTimeZone =
    process.env["TZ"] !== timeZone
      ? timeZone
      : timeZone === PRODUCTION_TIME_ZONE
        ? "UTC"
        : PRODUCTION_TIME_ZONE;

  describe(`in ${otherTimeZone}`, () => {
    it("passes the same suite", () => {
      const jestBin = require.resolve("jest/bin/jest");
      const config = findJestConfig(specFile);
      try {
        execFileSync(
          process.execPath,
          [jestBin, "--config", config, "--runTestsByPath", specFile, "--coverage=false", "--ci"],
          {
            cwd: dirname(config),
            env: { ...process.env, TZ: otherTimeZone, [RERUN_FLAG]: "1" },
            stdio: "pipe",
          }
        );
      } catch (error) {
        const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
        throw new Error(`${otherTimeZone} run failed:\n${stderr ?? ""}${stdout ?? ""}`);
      }
    });
  });
}

/** The nearest jest config at or above the spec file's folder. */
function findJestConfig(specFile: string): string {
  let dir = dirname(specFile);
  for (;;) {
    for (const name of JEST_CONFIG_FILES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`No jest config found above ${specFile}`);
    }
    dir = parent;
  }
}
