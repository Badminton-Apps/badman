#!/usr/bin/env node
/**
 * Backend test-coverage report over ALL source files.
 *
 *   pnpm test:coverage:report                      # measure the current commit
 *   pnpm test:coverage:report --ref <commit>       # measure any commit
 *   pnpm test:coverage:report --json report.json   # also write the raw numbers
 *
 * Why not `pnpm test:coverage:all`: plain `jest --coverage` only counts files
 * that some test happens to import, and it skips packages without tests
 * entirely. Both make the number look better than it is. This script counts
 * every `src/**\/*.ts` file (minus specs, barrels and type declarations), so
 * untested code shows up as 0%. Use it for before/after comparisons.
 *
 * It runs in a throwaway git worktree at the given commit, so uncommitted
 * changes are NOT measured and your checkout is never touched. The worktree
 * is removed afterwards (pass --keep to keep it for inspection).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const PROBE = "src/__coverage_probe__.spec.ts";
const METRICS = ["lines", "statements", "branches", "functions"];

function parseArgs(argv) {
  const args = { ref: "HEAD", json: null, keep: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ref") args.ref = argv[++i];
    else if (argv[i] === "--json") args.json = resolve(argv[++i]);
    else if (argv[i] === "--keep") args.keep = true;
    else if (argv[i] !== "--") throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

function run(cmd, args, cwd, stdio = "pipe") {
  return execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 28, stdio });
}

function emptyMetrics() {
  return Object.fromEntries(METRICS.map((m) => [m, { covered: 0, total: 0 }]));
}

/** Reads one package's jest coverage summary and test results. */
function readPackage(dir) {
  const pkg = {
    ...emptyMetrics(),
    files: 0,
    zeroFiles: 0,
    suites: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  const summaryFile = join(dir, "coverage-report", "coverage-summary.json");
  if (existsSync(summaryFile)) {
    const summary = JSON.parse(readFileSync(summaryFile, "utf8"));
    for (const m of METRICS)
      pkg[m] = { covered: summary.total[m].covered, total: summary.total[m].total };
    const files = Object.entries(summary).filter(([name]) => name !== "total");
    pkg.files = files.length;
    pkg.zeroFiles = files.filter(([, f]) => f.lines.total > 0 && f.lines.covered === 0).length;
  }

  const resultsFile = join(dir, "coverage-tests.json");
  if (existsSync(resultsFile)) {
    const results = JSON.parse(readFileSync(resultsFile, "utf8"));
    for (const suite of results.testResults) {
      if (suite.name.endsWith("__coverage_probe__.spec.ts")) continue;
      // Older commits ran spec copies from dist/ too (fixed in jest.preset.js);
      // skip them so counts from before and after that fix compare fairly.
      if (suite.name.includes("/dist/")) continue;
      pkg.suites += 1;
      for (const test of suite.assertionResults) {
        if (test.status === "passed") pkg.passed += 1;
        else if (test.status === "failed") pkg.failed += 1;
        else pkg.skipped += 1;
      }
    }
  }
  return pkg;
}

function sumPackages(pkgs) {
  const total = {
    ...emptyMetrics(),
    files: 0,
    zeroFiles: 0,
    suites: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  for (const pkg of Object.values(pkgs)) {
    for (const m of METRICS) {
      total[m].covered += pkg[m].covered;
      total[m].total += pkg[m].total;
    }
    for (const k of ["files", "zeroFiles", "suites", "passed", "failed", "skipped"])
      total[k] += pkg[k];
  }
  return total;
}

const pct = (m) => (m.total ? `${((100 * m.covered) / m.total).toFixed(1)}%` : "–");

function printReport(commit, pkgs, total) {
  const row = (name, p) =>
    `| ${name} | ${pct(p.lines)} | ${p.lines.covered} / ${p.lines.total} | ${pct(p.branches)} | ${pct(p.functions)} | ${p.zeroFiles} / ${p.files} | ${p.passed} |`;
  const lines = [
    `## Backend test coverage @ ${commit}`,
    "",
    "| Package | Lines | Covered / total lines | Branches | Functions | Untested files | Tests |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...Object.entries(pkgs)
      .filter(([, p]) => p.lines.total > 0)
      .sort(([, a], [, b]) => b.lines.total - a.lines.total)
      .map(([name, p]) => row(name, p)),
    row("**Total**", total),
    "",
    `Tests: ${total.passed} passed, ${total.failed} failed, ${total.skipped} skipped (${total.suites} suites).`,
  ];
  console.log(lines.join("\n"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = run("git", ["rev-parse", "--show-toplevel"]).trim();
  const commit = run("git", ["rev-parse", "--short", args.ref], repo).trim();
  const worktree = mkdtempSync(join(tmpdir(), "badman-coverage-"));

  // Ctrl-C reaches the child process too; keeping node alive lets `finally`
  // remove the worktree instead of leaving it registered in .git.
  process.on("SIGINT", () => {});

  try {
    console.error(`> worktree for ${commit} in ${worktree}`);
    run("git", ["worktree", "add", "--detach", worktree, commit], repo);
    console.error("> installing dependencies");
    run("pnpm", ["install", "--frozen-lockfile"], worktree);

    const pkgDirs = run("git", ["ls-files", "*jest.config.ts"], worktree)
      .split("\n")
      .filter(Boolean)
      .map(dirname);

    // Jest reports no coverage at all for a package without tests, which
    // would silently drop its files from the total. A no-op probe spec makes
    // jest report them (at 0%); probe results are ignored in readPackage().
    for (const dir of pkgDirs) {
      if (existsSync(join(worktree, dir, "src"))) {
        writeFileSync(join(worktree, dir, PROBE), 'it("coverage probe", () => undefined);\n');
      }
    }

    console.error("> running every package's tests with coverage");
    try {
      run(
        "pnpm",
        [
          "turbo",
          "run",
          "test",
          "--force",
          "--continue",
          "--output-logs=errors-only",
          "--",
          "--coverage",
          "--collectCoverageFrom=src/**/*.ts",
          "--collectCoverageFrom=!src/**/*.spec.ts",
          "--collectCoverageFrom=!src/**/*.d.ts",
          "--collectCoverageFrom=!src/**/index.ts",
          "--collectCoverageFrom=!src/**/__tests__/**",
          "--coverageThreshold={}",
          "--coverageDirectory=coverage-report",
          "--coverageReporters=json-summary",
          "--json",
          "--outputFile=coverage-tests.json",
        ],
        worktree,
        "inherit"
      );
    } catch (err) {
      // execFileSync blocks the event loop, so a SIGINT listener can't flag the
      // interrupt in time; the child's exit signal can.
      if (err.signal === "SIGINT") {
        console.error("> interrupted");
        process.exitCode = 130;
        return; // `finally` still removes the worktree
      }
      console.error("> some test tasks failed; the report below includes what ran");
    }

    const pkgs = Object.fromEntries(pkgDirs.map((dir) => [dir, readPackage(join(worktree, dir))]));
    const total = sumPackages(pkgs);
    printReport(commit, pkgs, total);
    if (args.json)
      writeFileSync(args.json, JSON.stringify({ commit, total, packages: pkgs }, null, 2) + "\n");
  } finally {
    if (args.keep) {
      console.error(
        `> kept worktree: ${worktree} (remove with: git worktree remove --force ${worktree})`
      );
    } else {
      try {
        run("git", ["worktree", "remove", "--force", worktree], repo);
      } catch {
        rmSync(worktree, { recursive: true, force: true });
        run("git", ["worktree", "prune"], repo);
      }
    }
  }
}

main();
