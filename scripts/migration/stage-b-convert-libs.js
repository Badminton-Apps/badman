// @ts-check
// Stage B (feature 036): convert every package under packages/** from an Nx
// project into a self-contained compiled workspace package:
//   - package.json: exports -> dist, real tool scripts (tsc/jest/eslint),
//     internal @badman/* deps -> workspace:*, drop the Stage A "nx" key
//   - tsconfig.build.json: emits ./dist with declarations + maps
//   - tsconfig.json: re-point "extends" at the root tsconfig.base.json
//   - jest.config.ts: fix preset/coverage relative depths
//   - eslint.config.js: minimal extend-root (drops @nx/dependency-checks)
//   - delete project.json (Nx is removed in this cutover)
// Run AFTER the git mv into packages/. Idempotent.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");

// per-package extra build steps (asset copies into dist)
const POSTBUILD = {
  "@badman/backend-translate": `node -e "fs.cpSync('assets','dist/assets',{recursive:true})"`,
  "@badman/backend-mailing": `node -e "fs.cpSync('src/compile','dist/compile/libs/mailing',{recursive:true})"`,
  "@badman/backend-assembly": `node -e "fs.cpSync('src/compile','dist/compile/libs/assembly',{recursive:true})"`,
};

/** find package dirs (contain package.json) under packages/ */
function findPkgs(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "node_modules" || e.name === "dist") continue;
    const full = path.join(dir, e.name);
    if (fs.existsSync(path.join(full, "package.json"))) out.push(full);
    else findPkgs(full, out);
  }
  return out;
}

const pkgs = findPkgs(path.join(REPO, "packages"));
console.log(`packages found: ${pkgs.length}`);

for (const dir of pkgs) {
  const rel = path.relative(REPO, dir); // e.g. packages/backend-cache
  const depth = rel.split(path.sep).length;
  const rootRel = "../".repeat(depth); // e.g. ../../

  // ---- package.json
  const pkgPath = path.join(dir, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const name = pkg.name;
  pkg.private = true;
  pkg.type = "commonjs";
  pkg.main = "./dist/index.js";
  pkg.types = "./dist/index.d.ts";
  pkg.exports = { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } };
  delete pkg.typings;
  delete pkg.nx;
  const build = ["tsc -p tsconfig.build.json", POSTBUILD[name]].filter(Boolean).join(" && ");
  pkg.scripts = { build, test: "jest", lint: "eslint ." };
  for (const k of Object.keys(pkg.dependencies || {})) {
    if (k.startsWith("@badman/")) pkg.dependencies[k] = "workspace:*";
  }
  if (pkg.devDependencies && Object.keys(pkg.devDependencies).length === 0)
    delete pkg.devDependencies;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  // ---- tsconfig.json: fix extends depth
  const tscPath = path.join(dir, "tsconfig.json");
  const tsc = JSON.parse(fs.readFileSync(tscPath, "utf8"));
  tsc.extends = rootRel + "tsconfig.base.json";
  fs.writeFileSync(tscPath, JSON.stringify(tsc, null, 2) + "\n");

  // ---- tsconfig.build.json
  fs.writeFileSync(
    path.join(dir, "tsconfig.build.json"),
    JSON.stringify(
      {
        extends: "./tsconfig.lib.json",
        compilerOptions: {
          outDir: "./dist",
          rootDir: "./src",
          declaration: true,
          declarationMap: true,
          tsBuildInfoFile: "./dist/.tsbuildinfo",
        },
      },
      null,
      2
    ) + "\n"
  );

  // ---- jest.config.ts: preset + coverageDirectory depths
  const jestPath = path.join(dir, "jest.config.ts");
  if (fs.existsSync(jestPath)) {
    let j = fs.readFileSync(jestPath, "utf8");
    j = j.replace(
      /preset:\s*["'](?:\.\.\/)+jest\.preset\.js["']/,
      `preset: "${rootRel}jest.preset.js"`
    );
    j = j.replace(
      /coverageDirectory:\s*["'](?:\.\.\/)+coverage\/[^"']+["']/,
      `coverageDirectory: "${rootRel}coverage/${rel.split(path.sep).join("/")}"`
    );
    fs.writeFileSync(jestPath, j);
  }

  // ---- eslint.config.js: minimal, extend root (drops @nx/dependency-checks)
  fs.writeFileSync(
    path.join(dir, "eslint.config.js"),
    `const baseConfig = require("${rootRel}eslint.config.js");\n\nmodule.exports = [...baseConfig];\n`
  );

  // ---- drop project.json
  const projPath = path.join(dir, "project.json");
  if (fs.existsSync(projPath)) fs.unlinkSync(projPath);

  console.log(`converted ${name}  (${rel}, depth ${depth})`);
}
