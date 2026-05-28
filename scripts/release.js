const core = require("@actions/core");
const { releaseChangelog, releaseVersion } = require("nx/release");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const runExec = require("./run-exec");

// GitHub release body hard cap. The API rejects bodies over 125000 characters
// with a 422 ("body is too long"), and nx then prompts to open a browser
// (which dead-locks in non-TTY CI). Stay safely under the limit.
const MAX_RELEASE_BODY = 120000;

// Walk through directory recursively
function walkDir(currentDir, newVersion) {
  fs.readdirSync(currentDir).forEach((file) => {
    const filePath = path.join(currentDir, file);

    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, newVersion);
    } else if (path.extname(filePath) === ".json" && file === "version.json") {
      updateVersion(filePath, newVersion);
    }
  });
}

// Function to update version.json file
function updateVersion(filePath, newVersion) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    let data = JSON.parse(content);
    data = { ...data, version: newVersion };
    const updatedContent = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Updated ${filePath} to version ${newVersion}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

// Extract the most recent version's section from CHANGELOG.md.
// nx writes new entries at the top; the latest section runs from the
// first `## ` heading to the next `## ` heading (or EOF).
function extractLatestChangelogEntry(changelogPath) {
  if (!fs.existsSync(changelogPath)) return "";
  const raw = fs.readFileSync(changelogPath, "utf8");
  // Split on `## ` headings; sections[0] is anything before the first heading
  // (usually empty/preamble), sections[1] is the most recent entry.
  const sections = raw.split(/^## /m);
  if (sections.length < 2) return "";
  return ("## " + sections[1]).trimEnd();
}

function truncateBody(body, repoSlug, tag) {
  if (body.length <= MAX_RELEASE_BODY) return body;
  const tail = `\n\n_… changelog truncated. See [CHANGELOG.md on the ${tag} tag](https://github.com/${repoSlug}/blob/${tag}/CHANGELOG.md) for the full list._\n`;
  return body.slice(0, MAX_RELEASE_BODY - tail.length) + tail;
}

(async () => {
  try {
    const options = yargs(hideBin(process.argv))
      .version(false)
      .option("version", {
        description: "Explicit version specifier to use, if overriding conventional commits",
        type: "string",
      })
      .option("dryRun", {
        alias: "d",
        description: "Whether or not to perform a dry-run of the release process, defaults to true",
        type: "boolean",
        default: true,
      })
      .option("verbose", {
        description: "Whether or not to enable verbose logging, defaults to false",
        type: "boolean",
        default: false,
      }).argv;

    const { workspaceVersion, projectsVersionData } = await releaseVersion({
      dryRun: options.dryRun,
      verbose: options.verbose,
      version: options.version,
    });

    console.log(`Workspace version: ${workspaceVersion}`);

    // nx returns null/undefined when conventional commits since the last tag
    // contain no `feat:` / `fix:` (or BREAKING CHANGE) entries — i.e. nothing
    // to bump. Don't fall through and create a `vnull` tag, write null into
    // version.json files, or call gh with no version. Exit cleanly so the
    // workflow can still deploy the existing build.
    if (workspaceVersion == null) {
      core.info(
        "No version bump detected from conventional commits since the last release tag — skipping changelog and GitHub release. Deploy will continue with the existing version."
      );
      core.setOutput("NEW_VERSION", "");
      return;
    }

    // update version.json files
    walkDir("./apps", workspaceVersion);

    // add version.json files to git
    await runExec("git add '**/**/version.json'");

    // Generate CHANGELOG.md + commit + tag + push, but DO NOT let nx create the
    // GitHub release. With ~6000+ commits in a release window the workspace
    // changelog can exceed GitHub's 125000-char body limit; nx posts the full
    // body, gets a 422, and then drops into an interactive "finish in browser?"
    // prompt that hangs CI. We do the release creation ourselves below, with
    // truncation, via the gh CLI.
    await releaseChangelog({
      versionData: projectsVersionData,
      version: workspaceVersion,
      dryRun: options.dryRun,
      verbose: options.verbose,
      createRelease: false,
    });

    const tag = `v${workspaceVersion}`;

    if (!options.dryRun) {
      const repoSlug = process.env.GITHUB_REPOSITORY;
      if (!repoSlug) {
        core.warning(
          "GITHUB_REPOSITORY is not set; skipping GitHub release creation. (Tag and changelog were still pushed by nx.)"
        );
      } else {
        const latest = extractLatestChangelogEntry(path.resolve("CHANGELOG.md"));
        if (!latest) {
          core.warning(
            "CHANGELOG.md has no version section to publish; skipping GitHub release creation."
          );
        } else {
          const body = truncateBody(latest, repoSlug, tag);
          const bodyFile = path.join(os.tmpdir(), `release-body-${tag}.md`);
          fs.writeFileSync(bodyFile, body);
          try {
            execFileSync(
              "gh",
              ["release", "create", tag, "--title", tag, "--notes-file", bodyFile, "--verify-tag"],
              { stdio: "inherit" }
            );
            core.info(`Created GitHub release ${tag} (${body.length} chars)`);
          } finally {
            fs.unlinkSync(bodyFile);
          }
        }
      }
    } else {
      core.info(`[dry-run] Would create GitHub release ${tag}`);
    }

    core.setOutput("NEW_VERSION", workspaceVersion);
    core.info(`New version: ${workspaceVersion}`);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
