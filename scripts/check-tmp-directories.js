#!/usr/bin/env node

const fs = require("fs").promises;
const path = require("path");

async function checkTmpDirectories() {
  const tmpDir = path.resolve("./tmp");
  const chromeProfilePrefix = "chrome-profile-";

  console.log("🔍 Checking temporary browser directories...\n");

  try {
    // Check if tmp directory exists
    try {
      await fs.access(tmpDir);
    } catch {
      console.log("✅ No tmp directory found - this is good!");
      return;
    }

    const entries = await fs.readdir(tmpDir, { withFileTypes: true });
    const chromeProfileDirs = entries.filter(
      (entry) => entry.isDirectory() && entry.name.startsWith(chromeProfilePrefix)
    );

    if (chromeProfileDirs.length === 0) {
      console.log("✅ No chrome profile directories found - cleanup is working properly!");
      return;
    }

    console.log(`⚠️  Found ${chromeProfileDirs.length} chrome profile directories:`);

    let totalSize = 0;
    const now = Date.now();

    for (const dir of chromeProfileDirs) {
      const dirPath = path.join(tmpDir, dir.name);

      try {
        const stats = await fs.stat(dirPath);
        const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
        const size = await getDirectorySize(dirPath);
        totalSize += size;

        const ageColor = ageHours > 2 ? "🔴" : ageHours > 1 ? "🟡" : "🟢";
        console.log(
          `  ${ageColor} ${dir.name} - Age: ${ageHours.toFixed(1)}h - Size: ${size.toFixed(1)}MB`
        );
      } catch (error) {
        console.log(`  ❌ ${dir.name} - Error reading directory: ${error.message}`);
      }
    }

    console.log(`\n📊 Total directories: ${chromeProfileDirs.length}`);
    console.log(`📊 Total size: ${totalSize.toFixed(1)}MB`);

    const oldDirs = chromeProfileDirs.filter(async (dir) => {
      try {
        const stats = await fs.stat(path.join(tmpDir, dir.name));
        const ageHours = (now - stats.mtime.getTime()) / (1000 * 60 * 60);
        return ageHours > 2;
      } catch {
        return false;
      }
    });

    if (chromeProfileDirs.length > 0) {
      console.log("\n💡 Recommendations:");
      console.log("   🟢 Green: Recent directories (< 1 hour old) - normal");
      console.log(
        "   🟡 Yellow: Older directories (1-2 hours) - may be from long-running processes"
      );
      console.log("   🔴 Red: Old directories (> 2 hours) - likely orphaned, should be cleaned up");

      console.log("\n🔧 To clean up old directories manually, you can:");
      console.log("   1. Stop all browser processes");
      console.log("   2. Run: rm -rf ./tmp/chrome-profile-*");
      console.log("   3. Or wait for the automatic cleanup service to run (runs every hour)");
    }
  } catch (error) {
    console.error("❌ Error checking tmp directories:", error.message);
  }
}

async function getDirectorySize(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let size = 0;

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        size += await getDirectorySize(entryPath);
      } else {
        try {
          const stats = await fs.stat(entryPath);
          size += stats.size;
        } catch {
          // Ignore errors for individual files
        }
      }
    }

    return size / (1024 * 1024); // Convert to MB
  } catch {
    return 0;
  }
}

// Run the check
checkTmpDirectories().catch(console.error);
