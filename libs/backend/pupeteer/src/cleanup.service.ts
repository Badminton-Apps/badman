import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { promises as fsPromises } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

@Injectable()
export class BrowserCleanupService {
  private readonly logger = new Logger(BrowserCleanupService.name);
  private readonly tmpDir = path.resolve("./tmp");
  private readonly chromeProfilePrefix = "chrome-profile-";
  private readonly maxAgeHours = 2; // Clean up directories older than 2 hours

  /**
   * Cleanup orphaned browser profile directories and processes
   * Runs every hour to clean up any directories that weren't properly cleaned up
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOrphanedDirectories(): Promise<void> {
    this.logger.log("Starting cleanup of orphaned browser profile directories");

    try {
      // Check if tmp directory exists
      try {
        await fsPromises.access(this.tmpDir);
      } catch {
        // tmp directory doesn't exist, nothing to clean up
        this.logger.debug("tmp directory does not exist, skipping cleanup");
        return;
      }

      const entries = await fsPromises.readdir(this.tmpDir, { withFileTypes: true });
      const chromeProfileDirs = entries.filter(
        (entry) => entry.isDirectory() && entry.name.startsWith(this.chromeProfilePrefix)
      );

      if (chromeProfileDirs.length === 0) {
        this.logger.debug("No chrome profile directories found for cleanup");
        return;
      }

      this.logger.log(`Found ${chromeProfileDirs.length} chrome profile directories`);

      let cleanedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const dir of chromeProfileDirs) {
        const dirPath = path.join(this.tmpDir, dir.name);

        try {
          const stats = await fsPromises.stat(dirPath);
          const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

          if (ageHours > this.maxAgeHours) {
            this.logger.debug(
              `Cleaning up old directory: ${dir.name} (age: ${ageHours.toFixed(1)} hours)`
            );
            await fsPromises.rm(dirPath, { recursive: true, force: true });
            cleanedCount++;
          } else {
            this.logger.debug(
              `Skipping recent directory: ${dir.name} (age: ${ageHours.toFixed(1)} hours)`
            );
            skippedCount++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to clean up directory ${dir.name}:`,
            (error as Error)?.message || error
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Cleanup completed: ${cleanedCount} directories cleaned, ${skippedCount} skipped (too recent), ${errorCount} errors`
      );

      // Also cleanup orphaned browser processes
      await this.cleanupOrphanedProcesses();
    } catch (error) {
      this.logger.error(
        "Error during orphaned directory cleanup:",
        (error as Error)?.message || error
      );
    }
  }

  /**
   * Force cleanup all chrome profile directories (useful for manual cleanup)
   */
  async forceCleanupAll(): Promise<void> {
    this.logger.warn("Force cleaning up ALL chrome profile directories");

    try {
      // Check if tmp directory exists
      try {
        await fsPromises.access(this.tmpDir);
      } catch {
        this.logger.debug("tmp directory does not exist, nothing to clean up");
        return;
      }

      const entries = await fsPromises.readdir(this.tmpDir, { withFileTypes: true });
      const chromeProfileDirs = entries.filter(
        (entry) => entry.isDirectory() && entry.name.startsWith(this.chromeProfilePrefix)
      );

      if (chromeProfileDirs.length === 0) {
        this.logger.debug("No chrome profile directories found for cleanup");
        return;
      }

      let cleanedCount = 0;
      let errorCount = 0;

      for (const dir of chromeProfileDirs) {
        const dirPath = path.join(this.tmpDir, dir.name);

        try {
          await fsPromises.rm(dirPath, { recursive: true, force: true });
          cleanedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to clean up directory ${dir.name}:`,
            (error as Error)?.message || error
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Force cleanup completed: ${cleanedCount} directories cleaned, ${errorCount} errors`
      );
    } catch (error) {
      this.logger.error("Error during force cleanup:", (error as Error)?.message || error);
    }
  }

  /**
   * Get statistics about current chrome profile directories
   */
  async getCleanupStats(): Promise<{
    totalDirectories: number;
    oldDirectories: number;
    recentDirectories: number;
    totalSizeMB: number;
  }> {
    try {
      // Check if tmp directory exists
      try {
        await fsPromises.access(this.tmpDir);
      } catch {
        return { totalDirectories: 0, oldDirectories: 0, recentDirectories: 0, totalSizeMB: 0 };
      }

      const entries = await fsPromises.readdir(this.tmpDir, { withFileTypes: true });
      const chromeProfileDirs = entries.filter(
        (entry) => entry.isDirectory() && entry.name.startsWith(this.chromeProfilePrefix)
      );

      let oldDirectories = 0;
      let recentDirectories = 0;
      let totalSizeMB = 0;

      for (const dir of chromeProfileDirs) {
        const dirPath = path.join(this.tmpDir, dir.name);

        try {
          const stats = await fsPromises.stat(dirPath);
          const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);

          if (ageHours > this.maxAgeHours) {
            oldDirectories++;
          } else {
            recentDirectories++;
          }

          // Estimate directory size (this is a rough estimate)
          totalSizeMB += await this.getDirectorySize(dirPath);
        } catch (error) {
          // Ignore errors for individual directories
        }
      }

      return {
        totalDirectories: chromeProfileDirs.length,
        oldDirectories,
        recentDirectories,
        totalSizeMB: Math.round(totalSizeMB * 100) / 100,
      };
    } catch (error) {
      this.logger.error("Error getting cleanup stats:", (error as Error)?.message || error);
      return { totalDirectories: 0, oldDirectories: 0, recentDirectories: 0, totalSizeMB: 0 };
    }
  }

  /**
   * Cleanup orphaned browser processes
   * Detects Chrome/Chromium processes that may be running without proper cleanup
   */
  async cleanupOrphanedProcesses(): Promise<void> {
    this.logger.log("Starting cleanup of orphaned browser processes");

    try {
      const processes = await this.getOrphanedBrowserProcesses();

      if (processes.length === 0) {
        this.logger.debug("No orphaned browser processes found");
        return;
      }

      this.logger.log(`Found ${processes.length} potentially orphaned browser processes`);

      let killedCount = 0;
      let errorCount = 0;

      for (const process of processes) {
        try {
          this.logger.debug(
            `Terminating orphaned browser process: PID ${process.pid} (${process.command})`
          );

          // First try graceful termination
          await execAsync(`kill -TERM ${process.pid}`);

          // Wait a moment for graceful shutdown
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // Check if process is still running and force kill if necessary
          try {
            await execAsync(`kill -0 ${process.pid}`);
            // Process still exists, force kill
            await execAsync(`kill -KILL ${process.pid}`);
            this.logger.debug(`Force killed process ${process.pid}`);
          } catch {
            // Process already terminated gracefully
            this.logger.debug(`Process ${process.pid} terminated gracefully`);
          }

          killedCount++;
        } catch (error) {
          this.logger.warn(
            `Failed to terminate process ${process.pid}:`,
            (error as Error)?.message || error
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Process cleanup completed: ${killedCount} processes terminated, ${errorCount} errors`
      );
    } catch (error) {
      this.logger.error(
        "Error during orphaned process cleanup:",
        (error as Error)?.message || error
      );
    }
  }

  /**
   * Get list of potentially orphaned browser processes
   * Returns processes that appear to be Chrome/Chromium instances that might be orphaned
   */
  private async getOrphanedBrowserProcesses(): Promise<
    Array<{ pid: number; command: string; age: number }>
  > {
    try {
      // Use ps to get Chrome/Chromium processes with their start time
      // This command gets processes containing 'chrome' or 'chromium' with detailed info
      const { stdout } = await execAsync(
        "ps -eo pid,etime,command | grep -E '(chrome|chromium)' | grep -v grep | grep -v 'Google Chrome'"
      );

      if (!stdout.trim()) {
        return [];
      }

      const processes = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
        if (!match) continue;

        const [, pidStr, etimeStr, command] = match;
        const pid = parseInt(pidStr, 10);

        // Skip if this looks like a system Chrome process or our own process
        if (
          command.includes("/Applications/") ||
          command.includes("Google Chrome") ||
          pid === process.pid
        ) {
          continue;
        }

        // Check if this is likely a puppeteer-launched Chrome process
        if (
          command.includes("--no-sandbox") ||
          command.includes("--disable-setuid-sandbox") ||
          command.includes("chrome-profile-")
        ) {
          // Parse etime to get age in seconds
          const age = this.parseElapsedTime(etimeStr);

          // Consider processes older than 2 hours as potentially orphaned
          if (age > this.maxAgeHours * 3600) {
            processes.push({ pid, command: command.substring(0, 100), age });
          }
        }
      }

      return processes;
    } catch (error) {
      // If ps command fails or no processes found, return empty array
      this.logger.debug("No browser processes found or error running ps command");
      return [];
    }
  }

  /**
   * Parse elapsed time string from ps command (e.g., "02:30:45" or "1-02:30:45")
   * Returns age in seconds
   */
  private parseElapsedTime(etimeStr: string): number {
    try {
      // Handle format like "1-02:30:45" (days-hours:minutes:seconds)
      if (etimeStr.includes("-")) {
        const [days, time] = etimeStr.split("-");
        const [hours, minutes, seconds] = time.split(":").map(Number);
        return parseInt(days) * 86400 + hours * 3600 + minutes * 60 + seconds;
      }

      // Handle format like "02:30:45" (hours:minutes:seconds)
      if (etimeStr.split(":").length === 3) {
        const [hours, minutes, seconds] = etimeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
      }

      // Handle format like "30:45" (minutes:seconds)
      if (etimeStr.split(":").length === 2) {
        const [minutes, seconds] = etimeStr.split(":").map(Number);
        return minutes * 60 + seconds;
      }

      // Handle format like "45" (seconds)
      return parseInt(etimeStr);
    } catch {
      return 0;
    }
  }

  /**
   * Get statistics about current browser processes
   */
  async getProcessStats(): Promise<{
    totalBrowserProcesses: number;
    orphanedProcesses: number;
    oldestProcessAge: number;
  }> {
    try {
      const allProcesses = await this.getAllBrowserProcesses();
      const orphanedProcesses = await this.getOrphanedBrowserProcesses();

      const oldestAge = allProcesses.reduce((max, proc) => Math.max(max, proc.age), 0);

      return {
        totalBrowserProcesses: allProcesses.length,
        orphanedProcesses: orphanedProcesses.length,
        oldestProcessAge: Math.round((oldestAge / 3600) * 10) / 10, // Convert to hours with 1 decimal
      };
    } catch (error) {
      this.logger.error("Error getting process stats:", (error as Error)?.message || error);
      return { totalBrowserProcesses: 0, orphanedProcesses: 0, oldestProcessAge: 0 };
    }
  }

  /**
   * Get all browser processes (not just orphaned ones)
   */
  private async getAllBrowserProcesses(): Promise<
    Array<{ pid: number; command: string; age: number }>
  > {
    try {
      const { stdout } = await execAsync(
        "ps -eo pid,etime,command | grep -E '(chrome|chromium)' | grep -v grep | grep -v 'Google Chrome'"
      );

      if (!stdout.trim()) {
        return [];
      }

      const processes = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const match = line.trim().match(/^(\d+)\s+(\S+)\s+(.+)$/);
        if (!match) continue;

        const [, pidStr, etimeStr, command] = match;
        const pid = parseInt(pidStr, 10);

        // Skip system Chrome processes but include all puppeteer processes
        if (command.includes("/Applications/") || command.includes("Google Chrome")) {
          continue;
        }

        if (
          command.includes("--no-sandbox") ||
          command.includes("--disable-setuid-sandbox") ||
          command.includes("chrome-profile-")
        ) {
          const age = this.parseElapsedTime(etimeStr);
          processes.push({ pid, command: command.substring(0, 100), age });
        }
      }

      return processes;
    } catch (error) {
      return [];
    }
  }

  /**
   * Recursively calculate directory size in MB
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
      let size = 0;

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          size += await this.getDirectorySize(entryPath);
        } else {
          try {
            const stats = await fsPromises.stat(entryPath);
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
}
