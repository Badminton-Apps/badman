// @ts-check
// Stage B (feature 036): convert the 6 apps from @nx/webpack to `nest build`.
//  - nest-cli.json (assets copied from src/assets into dist)
//  - tsconfig.app.json -> outDir ./dist, rootDir ./src
//  - package.json: real scripts (+deploy where a Render hook exists), runtime
//    dependencies derived from actual imports (internal -> workspace:*,
//    external -> root version range), drop the Stage A "nx" key
//  - eslint.config.js -> minimal extend-root; delete project.json + webpack.config.js
// Build tooling (typescript, jest, eslint, @nestjs/cli) stays in root devDeps
// and resolves via ancestor node_modules/.bin. Idempotent.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const root = JSON.parse(fs.readFileSync(path.join(REPO, "package.json"), "utf8"));
const rootRanges = { ...root.devDependencies, ...root.dependencies };

const APPS = {
  "apps/api": { deploy: "node ../../scripts/render.js --app=api" },
  "apps/scripts": {},
  "apps/worker/sync": { deploy: "node ../../../scripts/render.js --app=worker_sync" },
  "apps/worker/ranking": { deploy: "node ../../../scripts/render.js --app=worker_ranking" },
  "apps/worker/belgium/flanders/places": {},
  "apps/worker/belgium/flanders/points": {},
};

const BUILTINS = new Set(require("module").builtinModules);

/** collect bare import specifiers from all ts files under dir */
function scanImports(dir, out = new Set()) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) scanImports(full, out);
    else if (/\.ts$/.test(e.name) && !/\.spec\.ts$|\.test\.ts$/.test(e.name)) {
      const src = fs.readFileSync(full, "utf8");
      const re = /(?:from\s+|require\()\s*["']([^"'.][^"']*)["']/g;
      let m;
      while ((m = re.exec(src))) {
        let spec = m[1];
        if (spec.startsWith("node:")) continue;
        // reduce to package name (@scope/name or name)
        const parts = spec.split("/");
        spec = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
        if (!BUILTINS.has(spec)) out.add(spec);
      }
    }
  }
  return out;
}

const missing = new Set();
for (const [rel, cfg] of Object.entries(APPS)) {
  const dir = path.join(REPO, rel);
  const depth = rel.split("/").length;
  const rootRel = "../".repeat(depth);

  // ---- dependencies from imports
  const imports = [...scanImports(path.join(dir, "src"))].sort();
  const deps = { tslib: rootRanges["tslib"] || "^2.8.1" }; // importHelpers emit
  for (const spec of imports) {
    if (spec.startsWith("@badman/")) deps[spec] = "workspace:*";
    else if (rootRanges[spec]) deps[spec] = rootRanges[spec];
    else missing.add(`${rel}: ${spec}`);
  }

  // ---- package.json
  const pkgPath = path.join(dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.private = true;
  pkg.type = "commonjs";
  delete pkg.nx;
  pkg.scripts = {
    build: "nest build",
    dev: "nest start --watch",
    start: "node dist/main.js",
    test: "jest",
    lint: "eslint .",
    ...(cfg.deploy ? { deploy: cfg.deploy } : {}),
  };
  pkg.dependencies = deps;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // ---- nest-cli.json
  fs.writeFileSync(
    path.join(dir, "nest-cli.json"),
    JSON.stringify(
      {
        $schema: "https://json.schemastore.org/nest-cli",
        collection: "@nestjs/schematics",
        sourceRoot: "src",
        compilerOptions: {
          tsConfigPath: "tsconfig.app.json",
          deleteOutDir: true,
          assets: ["assets/**/*"],
          watchAssets: true,
        },
      },
      null,
      2
    ) + "\n"
  );

  // ---- tsconfig.app.json: emit into the package
  const tscPath = path.join(dir, "tsconfig.app.json");
  const tsc = JSON.parse(fs.readFileSync(tscPath, "utf8"));
  tsc.compilerOptions = {
    ...tsc.compilerOptions,
    outDir: "./dist",
    rootDir: "./src",
    resolveJsonModule: true,
    declaration: false,
  };
  fs.writeFileSync(tscPath, JSON.stringify(tsc, null, 2) + "\n");

  // ---- tsconfig.json: extends depth (apps did not move, but normalize)
  const baseTscPath = path.join(dir, "tsconfig.json");
  const baseTsc = JSON.parse(fs.readFileSync(baseTscPath, "utf8"));
  baseTsc.extends = rootRel + "tsconfig.base.json";
  fs.writeFileSync(baseTscPath, JSON.stringify(baseTsc, null, 2) + "\n");

  // ---- eslint minimal
  fs.writeFileSync(
    path.join(dir, "eslint.config.js"),
    `const baseConfig = require("${rootRel}eslint.config.js");\n\nmodule.exports = [...baseConfig];\n`
  );

  // ---- drop Nx artifacts
  for (const f of ["project.json", "webpack.config.js"]) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  console.log(`converted ${rel} (${imports.length} imports -> ${Object.keys(deps).length} deps)`);
}

if (missing.size) {
  console.log("\nWARN imports with no root version range (resolve manually):");
  for (const m of [...missing].sort()) console.log("  " + m);
}
