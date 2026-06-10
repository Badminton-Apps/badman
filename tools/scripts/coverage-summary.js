#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const coverageDir = path.join(__dirname, "../../coverage");

function parseLineCoverage(file) {
  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  let linesFound = 0;
  let linesHit = 0;

  for (const line of lines) {
    if (line.startsWith("LF:")) linesFound += parseInt(line.slice(3));
    if (line.startsWith("LH:")) linesHit += parseInt(line.slice(3));
  }

  return linesFound > 0 ? Math.round((linesHit / linesFound) * 100) : 0;
}

function findLcovFiles(dir) {
  const files = [];
  const dirs = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of dirs) {
    if (file.isDirectory()) {
      const nested = findLcovFiles(path.join(dir, file.name));
      files.push(...nested);
    } else if (file.name === "lcov.info") {
      files.push(path.join(dir, file.name));
    }
  }

  return files;
}

const lcovFiles = findLcovFiles(coverageDir);

if (lcovFiles.length === 0) {
  console.log("No lcov.info files found. Run: npm run test:coverage:all");
  process.exit(1);
}

console.log("\n📊 Coverage Summary\n");

const results = lcovFiles
  .map((file) => {
    const libName = file.match(/coverage\/libs\/(backend|apps)\/([^/]+)\//)?.[2] || "unknown";
    const coverage = parseLineCoverage(file);
    console.log(`  ${libName.padEnd(30)} ${coverage.toString().padStart(3)}%`);
    return coverage;
  })
  .filter((c) => c > 0);

const avg =
  results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
console.log(`\n  ${"Average".padEnd(30)} ${avg.toString().padStart(3)}%`);
console.log(`\n  lcov.info files: ${lcovFiles.length}`);
console.log(`\nFull coverage reports at: coverage/libs/\n`);
