#!/usr/bin/env node
// Prints a comma-separated list of project names tagged "scope:legacy".
// Consumed by GitHub workflows as --exclude argument to `nx affected`.
//
// Tagging convention: legacy Angular frontend and the Cypress e2e harness
// are NOT part of new development per Constitution V. They live in this repo
// only as reference; PR/build/deploy workflows skip them.

const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "project.json") out.push(full);
  }
  return out;
}

const legacy = [];
for (const root of ["apps", "libs"]) {
  if (!fs.existsSync(root)) continue;
  for (const p of walk(root)) {
    try {
      const d = JSON.parse(fs.readFileSync(p, "utf8"));
      if ((d.tags || []).includes("scope:legacy") && d.name) legacy.push(d.name);
    } catch {
      /* skip unreadable / malformed */
    }
  }
}

process.stdout.write(legacy.join(","));
