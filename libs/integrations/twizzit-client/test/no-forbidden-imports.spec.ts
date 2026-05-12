import * as fs from "fs";
import * as path from "path";

const SRC_DIR = path.resolve(__dirname, "../src");

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /from\s+['"]@badman\/backend-database['"]/,
    label: "@badman/backend-database",
  },
  {
    pattern: /from\s+['"]@badman\/backend-graphql['"]/,
    label: "@badman/backend-graphql",
  },
  {
    pattern: /from\s+['"]@badman\/backend-queue['"]/,
    label: "@badman/backend-queue",
  },
  {
    pattern: /from\s+['"]sequelize/,
    label: "sequelize",
  },
  {
    pattern: /from\s+['"]@nestjs\//,
    label: "@nestjs/*",
  },
  {
    pattern: /from\s+['"]bull['"]/,
    label: "bull",
  },
];

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("no-forbidden-imports (SC-008)", () => {
  const tsFiles = collectTsFiles(SRC_DIR);

  it("should have TypeScript source files to check", () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  it("no source file imports forbidden modules", () => {
    const violations: string[] = [];

    for (const file of tsFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { pattern, label } of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push(
              `${path.relative(SRC_DIR, file)}:${i + 1} — forbidden import: ${label}`
            );
          }
        }
      }
    }

    if (violations.length > 0) {
      fail(
        `Forbidden imports found in lib source:\n${violations.map((v) => `  ${v}`).join("\n")}`
      );
    }
    expect(violations).toHaveLength(0);
  });
});
