#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class APIMonitor {
  constructor() {
    this.apiProcess = null;
    this.restartCount = 0;
    this.maxRestarts = 10;
    this.restartDelay = 5000; // 5 seconds
    this.memoryThreshold = 1.5 * 1024 * 1024 * 1024; // 1.5GB
    this.checkInterval = 30000; // 30 seconds
  }

  start() {
    console.log('🚀 Starting API Monitor...');
    this.startAPI();
    this.startMemoryMonitoring();
  }

  startAPI() {
    if (this.apiProcess) {
      console.log('⚠️  API process already running, killing...');
      this.apiProcess.kill('SIGTERM');
    }

    console.log('🔄 Starting API server...');
    this.apiProcess = spawn(
      'node',
      [
        '--max-old-space-size=2048',
        '--optimize-for-size',
        '-r',
        'dotenv/config',
        'dist/apps/api/main.js',
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'production' },
      },
    );

    this.apiProcess.on('exit', (code, signal) => {
      console.log(`❌ API process exited with code ${code} and signal ${signal}`);

      if (this.restartCount < this.maxRestarts) {
        console.log(
          `🔄 Restarting API in ${this.restartDelay}ms... (${this.restartCount + 1}/${this.maxRestarts})`,
        );
        this.restartCount++;
        setTimeout(() => this.startAPI(), this.restartDelay);
      } else {
        console.log('💀 Max restarts reached, stopping monitor');
        process.exit(1);
      }
    });

    this.apiProcess.on('error', (error) => {
      console.error('❌ API process error:', error);
    });
  }

  startMemoryMonitoring() {
    setInterval(() => {
      const used = process.memoryUsage();
      const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);

      console.log(`📊 Memory: ${heapUsedMB}MB used / ${heapTotalMB}MB total`);

      if (used.heapUsed > this.memoryThreshold) {
        console.log(`⚠️  High memory usage detected: ${heapUsedMB}MB`);
        console.log('🔄 Forcing API restart due to memory pressure...');
        this.restartCount = 0; // Reset restart count for memory-triggered restarts
        this.startAPI();
      }
    }, this.checkInterval);
  }

  gracefulShutdown() {
    console.log('🛑 Shutting down monitor...');
    if (this.apiProcess) {
      this.apiProcess.kill('SIGTERM');
    }
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('Received SIGINT');
  monitor.gracefulShutdown();
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  monitor.gracefulShutdown();
});

const monitor = new APIMonitor();
monitor.start();
