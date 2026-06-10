// @ts-check
// Stage B follow-up: workers' ConfigModule.forRoot had no envFilePath, so the
// root .env was found via process.cwd(). Nx served from the workspace root;
// `turbo run dev` runs each app with its package dir as cwd, so the .env was
// silently missed (api was already fixed via an absolute path — same pattern
// here). The compiled module lives at <app>/dist/app/app.module.js; ups below
// reach the workspace root from there.
const fs = require("fs");

const APPS = {
  "apps/worker/sync/src/app/app.module.ts": 5,
  "apps/worker/ranking/src/app/app.module.ts": 5,
  "apps/worker/belgium/flanders/places/src/app/app.module.ts": 7,
  "apps/worker/belgium/flanders/points/src/app/app.module.ts": 7,
  "apps/scripts/src/app/app.module.ts": 4,
};

for (const [file, ups] of Object.entries(APPS)) {
  let s = fs.readFileSync(file, "utf8");

  // ensure join is imported
  if (!/from "path"/.test(s)) {
    s = s.replace(/(^import .*$)/m, 'import { join } from "path";\n$1');
  } else if (!/\bjoin\b.*from "path"/.test(s)) {
    s = s.replace(/import \{([^}]*)\} from "path"/, 'import { join,$1} from "path"');
  }

  const dots = Array(ups).fill('".."').join(", ");
  const block = `ConfigModule.forRoot({
      cache: true,
      // Resolve .env at the workspace root via an absolute path: this file
      // compiles to <app>/dist/app/, and \`turbo run dev\` runs apps with the
      // package dir (not the workspace root) as cwd, so the default
      // cwd-relative lookup misses the root .env.
      envFilePath: join(__dirname, ${dots}, ".env"),
      validationSchema: configSchema,
      load: [load],
    })`;

  s = s.replace(
    /ConfigModule\.forRoot\(\{\s*cache: true,\s*validationSchema: configSchema,\s*load: \[load\],\s*\}\)/,
    block
  );
  fs.writeFileSync(file, s);
  console.log("fixed", file, `(${ups} ups)`);
}
