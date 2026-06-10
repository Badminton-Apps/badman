// @ts-check
// Stage B follow-up: jest transform was "^.+\\.[tj]s$" (Nx-era), which now
// pulls dependencies' compiled dist/*.js through ts-jest (allowJs warnings +
// wasted compile time) because cross-package imports resolve to dist instead
// of src. Restrict ts-jest to .ts; plain CJS .js needs no transform.
const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "node_modules" || e.name === "dist") continue;
    const f = path.join(dir, e.name);
    const j = path.join(f, "jest.config.ts");
    if (fs.existsSync(j)) out.push(j);
    walk(f, out);
  }
  return out;
}

let n = 0;
for (const f of [...walk("packages"), ...walk("apps")]) {
  const s = fs.readFileSync(f, "utf8");
  const t = s.split("^.+\\\\.[tj]s$").join("^.+\\\\.ts$");
  if (t !== s) {
    fs.writeFileSync(f, t);
    n++;
  }
}
console.log("jest transforms tightened:", n);
