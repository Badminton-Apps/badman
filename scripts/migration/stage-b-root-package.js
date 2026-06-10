// @ts-check
// Stage B (feature 036): overhaul the root package.json.
//  - scripts delegate to turbo (no task logic at root)
//  - remove npm "workspaces" (pnpm-workspace.yaml takes over)
//  - prune frontend(Angular)/Nx dependencies — each candidate is only removed
//    if a grep across remaining source finds no usage. Anything still used is
//    kept and reported.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..", "..");
const pkgPath = path.join(REPO, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

// ---------- scripts
pkg.scripts = {
  prepare: "lefthook install || true",
  // task delegation (root has no task logic — Turborepo runs package scripts)
  build: "turbo run build",
  test: "turbo run test",
  "test:affected": "turbo run test --affected",
  "test:coverage": "turbo run test --filter=worker-sync -- --coverage",
  "test:coverage:all": "turbo run test -- --coverage",
  lint: "turbo run lint",
  dev: "turbo run dev",
  "start:server": "turbo run dev --filter=api --filter=worker-sync",
  "start:ranking":
    "turbo run dev --filter=worker-ranking --filter=worker-belgium-flanders-places --filter=worker-belgium-flanders-points",
  // production process entrypoints (Render start commands)
  "start:prod": "node -r dotenv/config --max-old-space-size=1536 apps/api/dist/main.js",
  "run:worker": "node ./apps/worker/ranking/dist/main.js",
  "run:belgium-flanders-places": "node ./apps/worker/belgium/flanders/places/dist/main.js",
  "run:belgium-flanders-points": "node ./apps/worker/belgium/flanders/points/dist/main.js",
  "run:ranking":
    'concurrently "npm run run:worker" "npm run run:belgium-flanders-places" "npm run run:belgium-flanders-points"',
  // local infra + db tooling (unchanged)
  "docker:up": "docker compose -f docker-compose.dev.yml up -d",
  "seed:build-utils": "tsc --project database/seeders/utils/tsconfig.json",
  "seed:test-data":
    "npm run seed:build-utils && npx sequelize-cli db:seed --seed 20250101000000-seed-test-data.js",
  "seed:test-data:undo": "npx sequelize-cli db:seed:undo --seed 20250101000000-seed-test-data.js",
  "seed:admin":
    "npm run seed:build-utils && npx sequelize-cli db:seed --seed 20250101000001-seed-admin-user.js",
  "seed:admin:undo": "npx sequelize-cli db:seed:undo --seed 20250101000001-seed-admin-user.js",
  "seed:all": "npx sequelize-cli db:seed:all",
  "seed:undo:all": "npx sequelize-cli db:seed:undo:all",
  format: "prettier --write .",
  "format:check": "prettier --check .",
};

// ---------- workspaces handled by pnpm-workspace.yaml
delete pkg.workspaces;

// ---------- dependency pruning (grep-verified)
const PRUNE_PATTERNS = [
  /^@angular(\/|-)/, // @angular/*, @angular-devkit/*, @angular-eslint/*
  /^@nx\//,
  /^nx$/,
  /^@schematics\//,
  /^ng-packagr$/,
  /^jest-preset-angular$/,
  /^typescript-transform-paths$/,
  /^@auth0\/auth0-angular$/,
  /^@fontsource\//,
  /^@googlemaps\//,
  /^@ng-maps\//,
  /^@ng-matero\//,
  /^@ngx-translate\//,
  /^apexcharts$/,
  /^ng-apexcharts$/,
  /^apollo-angular$/,
  /^@apollo\/client$/,
  /^material-icons$/,
  /^ngx-/,
  /^web-vitals$/,
  /^zone\.js$/,
  /^xng-breadcrumb$/,
  /^quill$/,
  /^file-saver$/,
  /^@types\/file-saver$/,
  /^canvg$/,
  /^seed-to-color$/,
  /^ng-process-env$/,
  /^@playwright\//,
  /^playwright$/,
  /^cypress/,
  /^autoprefixer$/,
  /^postcss$/,
  /^tailwindcss$/,
  /^@swc-node\/register$/, // was only used by Nx to load TS configs
];

// grep helper: is the module imported anywhere in remaining source/config?
function used(name) {
  const out = execSync(
    `grep -rl --include='*.ts' --include='*.js' --include='*.mjs' --include='*.cjs' --include='*.json' -e '"${name}' -e "'${name}" apps packages database scripts tools 2>/dev/null | grep -v node_modules | grep -v migration || true`,
    { cwd: REPO, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] }
  ).trim();
  return out.length > 0;
}

const removed = [];
const kept = [];
for (const section of ["dependencies", "devDependencies"]) {
  const deps = pkg[section] || {};
  for (const name of Object.keys(deps)) {
    if (!PRUNE_PATTERNS.some((re) => re.test(name))) continue;
    if (used(name)) {
      kept.push(`${name} (${section}) — still referenced`);
      continue;
    }
    delete deps[name];
    removed.push(name);
  }
}

// pnpm needs these linked at root (previously transitive)
pkg.devDependencies["@eslint/js"] = pkg.devDependencies["@eslint/js"] || "^9.20.0";

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`removed ${removed.length} deps:\n  ` + removed.join("\n  "));
if (kept.length) console.log(`\nKEPT (still referenced — review):\n  ` + kept.join("\n  "));
