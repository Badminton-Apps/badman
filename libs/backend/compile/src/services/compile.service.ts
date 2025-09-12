import { join } from "path";

import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import consolidate from "consolidate";
import juice from "juice";
import { Observable, asapScheduler, bindNodeCallback, from, of } from "rxjs";
import { mergeMap, take } from "rxjs/operators";

import { getPage } from "@badman/backend-pupeteer";
import { I18nTranslations } from "@badman/utils";
import { writeFile } from "fs/promises";
import momentTz from "moment-timezone";
import { I18nService } from "nestjs-i18n";
import { Readable } from "stream";
import { COMPILE_OPTIONS_TOKEN } from "../constants";
import { CompileInterface, CompileModuleOptions, CompileOptions, ViewOptions } from "../interfaces";

@Injectable()
export class CompileService implements CompileInterface, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompileService.name);
  private stopHealthMonitoring?: () => void;

  // Add concurrency control for PDF generation
  private activePdfGenerations = 0;
  private readonly maxConcurrentPdfs = 5; // Increased from 3 to 5 for better throughput
  private readonly maxQueueSize = 20; // Maximum queue size to prevent memory issues
  private readonly queueTimeoutMs = 60000; // 1 minute timeout for queued requests
  private readonly pdfQueue: Array<{
    resolve: (value: Buffer) => void;
    reject: (error: Error) => void;
    task: () => Promise<Buffer>;
    queuedAt: number; // Track when request was queued
  }> = [];

  // Add HTML content caching
  private htmlCache = new Map<string, { html: string; timestamp: number }>();
  private readonly htmlCacheTimeout = 300000; // 5 minutes cache for HTML templates

  // Add metrics tracking
  private pdfGenerationStats = {
    totalGenerated: 0,
    totalFailed: 0,
    averageGenerationTime: 0,
    queueRejections: 0,
  };

  constructor(
    @Inject(COMPILE_OPTIONS_TOKEN)
    private readonly moduleOptions: CompileModuleOptions,
    private readonly i18nService: I18nService<I18nTranslations>
  ) {}

  onModuleInit() {
    // Start browser health monitoring
    this.logger.debug(
      "CompileService initialized - using shared browser management with health monitoring"
    );
  }

  onModuleDestroy() {
    // Clean up health monitoring when service is destroyed
    if (this.stopHealthMonitoring) {
      this.stopHealthMonitoring();
      this.logger.debug("Browser health monitoring stopped");
    }

    // Clear caches
    this.htmlCache.clear();

    // Clear any pending PDF queue
    this.pdfQueue.forEach(({ reject }) => {
      reject(new Error("Service is shutting down"));
    });
    this.pdfQueue.length = 0;
  }

  private async processPdfQueue(): Promise<void> {
    // Clean up expired queue items first
    this.cleanupExpiredQueueItems();

    if (this.pdfQueue.length === 0 || this.activePdfGenerations >= this.maxConcurrentPdfs) {
      return;
    }

    const queueItem = this.pdfQueue.shift();
    if (!queueItem) return;

    // Check if item has expired while in queue
    const queueTime = Date.now() - queueItem.queuedAt;
    if (queueTime > this.queueTimeoutMs) {
      this.pdfGenerationStats.queueRejections++;
      queueItem.reject(new Error(`PDF generation request timed out in queue after ${queueTime}ms`));
      // Process next item
      setImmediate(() => this.processPdfQueue());
      return;
    }

    this.activePdfGenerations++;
    const startTime = Date.now();

    try {
      const result = await queueItem.task();
      const generationTime = Date.now() - startTime;

      // Update stats
      this.pdfGenerationStats.totalGenerated++;
      this.updateAverageGenerationTime(generationTime);

      this.logger.debug(
        `PDF generated successfully in ${generationTime}ms (queue wait: ${queueTime}ms)`
      );
      queueItem.resolve(result);
    } catch (error) {
      this.pdfGenerationStats.totalFailed++;
      this.logger.error(`PDF generation failed after ${Date.now() - startTime}ms:`, error);
      queueItem.reject(error as Error);
    } finally {
      this.activePdfGenerations--;
      // Process next item in queue
      setImmediate(() => this.processPdfQueue());
    }
  }

  private cleanupExpiredQueueItems(): void {
    const now = Date.now();
    const originalLength = this.pdfQueue.length;

    // Remove expired items from queue
    for (let i = this.pdfQueue.length - 1; i >= 0; i--) {
      const item = this.pdfQueue[i];
      if (now - item.queuedAt > this.queueTimeoutMs) {
        const expiredItem = this.pdfQueue.splice(i, 1)[0];
        this.pdfGenerationStats.queueRejections++;
        expiredItem.reject(new Error("PDF generation request expired in queue"));
      }
    }

    if (originalLength !== this.pdfQueue.length) {
      this.logger.warn(
        `Removed ${originalLength - this.pdfQueue.length} expired items from PDF queue`
      );
    }
  }

  private updateAverageGenerationTime(newTime: number): void {
    const total = this.pdfGenerationStats.totalGenerated;
    const currentAvg = this.pdfGenerationStats.averageGenerationTime;
    this.pdfGenerationStats.averageGenerationTime = (currentAvg * (total - 1) + newTime) / total;
  }

  private queuePdfGeneration(task: () => Promise<Buffer>): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      // Check if queue is full
      if (this.pdfQueue.length >= this.maxQueueSize) {
        this.pdfGenerationStats.queueRejections++;
        this.logger.warn(`PDF queue is full (${this.maxQueueSize} items). Rejecting new request.`);
        reject(
          new Error(
            `PDF generation queue is full. Please try again later. (Queue size: ${this.pdfQueue.length})`
          )
        );
        return;
      }

      // Add request to queue with timestamp
      this.pdfQueue.push({
        resolve,
        reject,
        task,
        queuedAt: Date.now(),
      });

      this.logger.debug(
        `PDF request queued. Queue size: ${this.pdfQueue.length}, Active: ${this.activePdfGenerations}`
      );
      this.processPdfQueue();
    });
  }

  // Add method to get queue status (useful for monitoring)
  public getQueueStatus() {
    return {
      queueLength: this.pdfQueue.length,
      activeGenerations: this.activePdfGenerations,
      maxConcurrent: this.maxConcurrentPdfs,
      maxQueueSize: this.maxQueueSize,
      stats: this.pdfGenerationStats,
    };
  }

  private generateCacheKey(template: string, locals?: unknown): string {
    return JSON.stringify({ template, locals });
  }

  private getCachedHtml(cacheKey: string): string | null {
    const cached = this.htmlCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.htmlCacheTimeout) {
      return cached.html;
    }

    if (cached) {
      this.htmlCache.delete(cacheKey); // Remove expired cache
    }

    return null;
  }

  private setCachedHtml(cacheKey: string, html: string): void {
    // Cleanup old cache entries periodically
    if (this.htmlCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of this.htmlCache.entries()) {
        if (now - value.timestamp >= this.htmlCacheTimeout) {
          this.htmlCache.delete(key);
        }
      }
    }

    this.htmlCache.set(cacheKey, { html, timestamp: Date.now() });
  }

  toFile(template: string, options?: CompileOptions): Observable<string> {
    return this.toHtml(template, options);
  }

  toReadable(template: string, options?: CompileOptions): Observable<Readable> {
    return this.toHtml(template, options).pipe(
      mergeMap((html: string) => from(this.queuePdfGeneration(() => this.toPdf(html, options)))),
      mergeMap((pdf: Buffer) => of(Readable.from(pdf)))
    );
  }

  toBuffer(template: string, options?: CompileOptions): Observable<Buffer> {
    return this.toHtml(template, options).pipe(
      mergeMap((html: string) => from(this.queuePdfGeneration(() => this.toPdf(html, options))))
    );
  }

  toHtml(template: string, options?: CompileOptions): Observable<string> {
    this.logger.debug("Generating html from template");

    // Check cache first
    const cacheKey = this.generateCacheKey(template, options?.locals);
    const cachedHtml = this.getCachedHtml(cacheKey);

    if (cachedHtml) {
      this.logger.debug("Using cached HTML template");
      return of(cachedHtml);
    }

    const path = this.getTemplatePath(template, this.moduleOptions.view);

    return this.generateHtmlFromTemplate(path, this.moduleOptions.view, options?.locals).pipe(
      mergeMap((html: string) => {
        const preparedHtml = this.prepareHtmlTemplate(html);
        // Cache the prepared HTML
        this.setCachedHtml(cacheKey, preparedHtml);
        return of(preparedHtml);
      }),
      take(1)
    );
  }

  private async toPdf(html: string, options?: CompileOptions): Promise<Buffer> {
    const startTime = Date.now();
    this.logger.debug("Generating pdf from html");

    let page;
    let cleanup: (() => Promise<void>) | undefined;
    try {
      // Use shared browser management with timeout
      page = await Promise.race([
        getPage(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Browser page creation timeout")), 10000)
        ),
      ]);

      if (!page) {
        throw new Error("Page not available");
      }

      this.logger.debug("Page created");

      // Set a shorter timeout for content loading
      await Promise.race([
        page.setContent(html, {
          waitUntil: "networkidle0",
          timeout: 15000, // 15 second timeout
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Content loading timeout")), 20000)
        ),
      ]);

      this.logger.debug("Page content set");

      // Wait for tailwind with timeout
      try {
        await Promise.race([
          page.waitForFunction("window.tailwind", { timeout: 5000 }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Tailwind loading timeout")), 8000)
          ),
        ]);
      } catch (error) {
        this.logger.warn("Tailwind loading failed, continuing with PDF generation", error);
        // Continue anyway - tailwind might not be critical
      }

      this.logger.debug("Generating pdf");

      // Generate PDF with memory-efficient options
      const pdf = await page.pdf({
        format: options?.pdf?.format ?? "A4",
        landscape: options?.pdf?.landscape ?? false,
        printBackground: options?.pdf?.printBackground ?? true,
        scale: options?.pdf?.scale ?? 1,
        preferCSSPageSize: options?.pdf?.preferCSSPageSize ?? true,
        // Add memory optimization options
        omitBackground: false,
        timeout: 30000, // 30 second timeout for PDF generation
      });

      if ((this.moduleOptions.debug ?? false) === true) {
        // write file in original folder for debugging
        writeFile(join(this.moduleOptions.view.root, "generated.pdf"), pdf);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`Pdf generated successfully in ${duration}ms`);

      return Buffer.from(pdf);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`PDF generation failed after ${duration}ms:`, error);
      throw error;
    } finally {
      // Ensure page is always closed, even on error
      if (page) {
        try {
          await page.close();
          this.logger.debug("Page closed successfully");
        } catch (closeError) {
          this.logger.warn("Failed to close page:", closeError);
        }
      }
    }
  }

  private getTemplatePath(template: string, { root, extension, engine }: ViewOptions): string {
    return join(root, "templates", template, `html.${extension || engine}`);
  }

  private generateHtmlFromTemplate(
    template: string,
    { engine, engineOptions }: ViewOptions,
    locals?: unknown
  ): Observable<string> {
    const moment = momentTz;
    moment.tz.setDefault("Europe/Brussels");
    moment.locale("nl-be");

    const translate = this.i18nService.translate.bind(this.i18nService);

    return bindNodeCallback<[string, ViewOptions["engineOptions"] | undefined], [string]>(
      consolidate[engine],
      asapScheduler
    )(
      template,
      Object.assign(
        {
          moment,
          translate,
        },
        locals,
        engineOptions
      )
    );
  }

  private prepareHtmlTemplate(html: string): string {
    if ((this.moduleOptions.debug ?? false) === true) {
      const path = join(this.moduleOptions.view.root, "un_juiced.html");
      this.logger.debug(`Writing html to file ${path}`);
      // write file in original folder before juice so we can test
      writeFile(path, html);
    }

    const juiced = juice(html, this.moduleOptions.juice);

    if ((this.moduleOptions.debug ?? false) === true) {
      // write file in original folder after juice so we can test
      writeFile(join(this.moduleOptions.view.root, "juiced.html"), juiced);
    }

    return juiced;
  }
}
