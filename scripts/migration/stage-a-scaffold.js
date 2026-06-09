// @ts-check
// Stage A scaffolder (feature 036): give every IN-SCOPE backend project a
// package.json whose build/test/lint(/dev) scripts WRAP the existing Nx
// builders, so Turborepo and Nx can run side-by-side (coexistence, FR-017
// Phase 1). Legacy frontend (scope:legacy) is excluded. Idempotent.
//
// Run: node scripts/migration/stage-a-scaffold.js
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const EXCLUDE_NAME = /^(badman$|badman-e2e|frontend-)/; // legacy
const ROOTS = ["apps", "libs/backend", "libs/utils"];

/** find all project.json under a root */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name === "project.json") out.push(full);
  }
  return out;
}

const inScope = [];
for (const root of ROOTS) {
  for (const pj of walk(path.join(REPO, root))) {
    const proj = JSON.parse(fs.readFileSync(pj, "utf8"));
    const name = proj.name;
    if (!name || EXCLUDE_NAME.test(name)) continue;
    const targets = Object.keys(proj.targets || {});
    inScope.push({ dir: path.dirname(pj), name, targets });
  }
}

const scriptFor = (name, targets) => {
  const s = {};
  if (targets.includes("build")) s.build = `nx build ${name}`;
  if (targets.includes("test")) s.test = `nx test ${name}`;
  if (targets.includes("lint")) s.lint = `nx lint ${name}`;
  if (targets.includes("serve")) s.dev = `nx serve ${name}`;
  return s;
};

const created = [];
const patched = [];
for (const { dir, name, targets } of inScope) {
  const pkgPath = path.join(dir, "package.json");
  let pkg;
  if (fs.existsSync(pkgPath)) {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    patched.push(name);
  } else {
    pkg = { name, version: "0.0.0", private: true, type: "commonjs" };
    created.push(name);
  }
  pkg.scripts = { ...(pkg.scripts || {}), ...scriptFor(name, targets) };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
}

console.log(`in-scope: ${inScope.length}`);
console.log(`created package.json (${created.length}): ${created.join(", ")}`);
console.log(`patched scripts (${patched.length}): ${patched.join(", ")}`);
