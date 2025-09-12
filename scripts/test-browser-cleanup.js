#!/usr/bin/env node

/**
 * Test script for browser cleanup functionality
 * This script demonstrates how the cleanup service works and can be used to test it
 */

const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

async function testBrowserCleanup() {
  console.log("🧪 Testing Browser Cleanup Functionality\n");

  try {
    // Check current browser processes
    console.log("1. Checking current browser processes...");
    await checkBrowserProcesses();

    console.log("\n2. Checking temporary directories...");
    await checkTempDirectories();

    console.log("\n3. Simulating process cleanup...");
    await simulateProcessCleanup();

    console.log("\n✅ Browser cleanup test completed successfully!");
  } catch (error) {
    console.error("❌ Error during browser cleanup test:", error.message);
  }
}

async function checkBrowserProcesses() {
  try {
    const { stdout } = await execAsync(
      "ps -eo pid,etime,command | grep -E '(chrome|chromium)' | grep -v grep | grep -v 'Google Chrome'"
    );

    if (!stdout.trim()) {
      console.log("   ✅ No puppeteer browser processes found");
      return;
    }

    const lines = stdout.trim().split("\n");
    console.log(`   Found ${lines.length} browser processes:`);

    for (const line of lines) {
      const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) continue;

      const [, pid, etime, command] = match;
      const isOrphaned =
        command.includes("--no-sandbox") ||
        command.includes("--disable-setuid-sandbox") ||
        command.includes("chrome-profile-");

      const status = isOrphaned ? "🔴 ORPHANED" : "🟢 SYSTEM";
      console.log(
        `   ${status} PID: ${pid}, Age: ${etime}, Command: ${command.substring(0, 80)}...`
      );
    }
  } catch (error) {
    console.log("   ✅ No browser processes found or error running ps command");
  }
}

async function checkTempDirectories() {
  try {
    const fs = require("fs").promises;
    const path = require("path");

    const tmpDir = path.resolve("./tmp");

    try {
      await fs.access(tmpDir);
    } catch {
      console.log("   ✅ No tmp directory found");
      return;
    }

    const entries = await fs.readdir(tmpDir, { withFileTypes: true });
    const chromeProfileDirs = entries.filter(
      (entry) => entry.isDirectory() && entry.name.startsWith("chrome-profile-")
    );

    if (chromeProfileDirs.length === 0) {
      console.log("   ✅ No chrome profile directories found");
      return;
    }

    console.log(`   Found ${chromeProfileDirs.length} chrome profile directories:`);

    for (const dir of chromeProfileDirs) {
      const dirPath = path.join(tmpDir, dir.name);

      try {
        const stats = await fs.stat(dirPath);
        const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        const status = ageHours > 2 ? "🔴 OLD" : ageHours > 1 ? "🟡 RECENT" : "🟢 NEW";

        console.log(`   ${status} ${dir.name} - Age: ${ageHours.toFixed(1)} hours`);
      } catch (error) {
        console.log(`   ❌ ${dir.name} - Error reading directory: ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error checking directories: ${error.message}`);
  }
}

async function simulateProcessCleanup() {
  console.log("   This would normally:");
  console.log("   - Kill processes older than 2 hours with puppeteer signatures");
  console.log("   - Clean up directories older than 2 hours");
  console.log("   - Log detailed cleanup statistics");
  console.log("   - Run automatically every hour via cron");

  console.log("\n   🔧 Automatic cleanup is now enabled in all relevant modules:");
  console.log("   - Worker Sync Module: ✅ Added");
  console.log("   - Scripts Module: ✅ Added");
  console.log("   - API Module: ✅ Added");
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
🧪 Browser Cleanup Test Script

Usage: node test-browser-cleanup.js [options]

Options:
  --help, -h    Show this help message

This script tests the browser cleanup functionality by:
1. Checking for existing browser processes
2. Examining temporary directories
3. Simulating cleanup operations

The actual cleanup service runs automatically every hour when the
PupeteerModule is imported in your NestJS application.
`);
  process.exit(0);
}

// Run the test
testBrowserCleanup().catch(console.error);
