import { join } from 'path';

import { Inject, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import consolidate from 'consolidate';
import juice from 'juice';
import { Observable, asapScheduler, bindNodeCallback, from, of } from 'rxjs';
import {
  mergeMap,
  take,
} from 'rxjs/operators';

import { getPage, startBrowserHealthMonitoring } from '@badman/backend-pupeteer';
import { I18nTranslations } from '@badman/utils';
import { writeFile } from 'fs/promises';
import momentTz from 'moment-timezone';
import { I18nService } from 'nestjs-i18n';
import { Readable } from 'stream';
import { COMPILE_OPTIONS_TOKEN } from '../constants';
import { CompileInterface, CompileModuleOptions, CompileOptions, ViewOptions } from '../interfaces';

@Injectable()
export class CompileService implements CompileInterface, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CompileService.name);
  private stopHealthMonitoring?: () => void;

  constructor(
    @Inject(COMPILE_OPTIONS_TOKEN)
    private readonly moduleOptions: CompileModuleOptions,
    private readonly i18nService: I18nService<I18nTranslations>,
  ) {}

  onModuleInit() {
    // Start browser health monitoring
    this.stopHealthMonitoring = startBrowserHealthMonitoring();
    this.logger.debug('CompileService initialized - using shared browser management with health monitoring');
  }

  onModuleDestroy() {
    // Clean up health monitoring when service is destroyed
    if (this.stopHealthMonitoring) {
      this.stopHealthMonitoring();
      this.logger.debug('Browser health monitoring stopped');
    }
  }

  toFile(template: string, options?: CompileOptions): Observable<string> {
    return this.toHtml(template, options);
  }

  toReadable(template: string, options?: CompileOptions): Observable<Readable> {
    return this.toHtml(template, options).pipe(
      mergeMap((html: string) => from(this.toPdf(html, options))),
      mergeMap((pdf: Buffer) => of(Readable.from(pdf))),
    );
  }

  toBuffer(template: string, options?: CompileOptions): Observable<Buffer> {
    return this.toHtml(template, options).pipe(
      mergeMap((html: string) => from(this.toPdf(html, options))),
    );
  }

  toHtml(template: string, options?: CompileOptions): Observable<string> {
    this.logger.debug('Generating html from template');

    const path = this.getTemplatePath(template, this.moduleOptions.view);

    return this.generateHtmlFromTemplate(path, this.moduleOptions.view, options?.locals).pipe(
      mergeMap((html: string) => of(this.prepareHtmlTemplate(html))),
      take(1),
    );
  }

  private async toPdf(html: string, options?: CompileOptions): Promise<Buffer> {
    this.logger.debug('Generating pdf from html');
    
    // Use shared browser management
    const page = await getPage();

    if (!page) {
      throw new Error('Page not available');
    }

    this.logger.debug('Page created');

    /* Wait for the page to load before generating the pdf*/
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });

    this.logger.debug('Page content set');

    /* Wait for the page to load before generating the pdf*/
    await page.waitForFunction('window.tailwind');

    this.logger.debug('Generating pdf');

    const pdf = await page.pdf({
      format: options?.pdf?.format ?? 'A4',
      landscape: options?.pdf?.landscape ?? false,
      printBackground: options?.pdf?.printBackground ?? true,
      scale: options?.pdf?.scale ?? 1,
      preferCSSPageSize: options?.pdf?.preferCSSPageSize ?? true,
    });

    if ((this.moduleOptions.debug ?? false) === true) {
      // write file in original folder before juice so we can test
      writeFile(join(this.moduleOptions.view.root, 'generated.pdf'), pdf);
    }

    this.logger.debug('Pdf generated');

    await page.close();

    return Buffer.from(pdf);
  }

  private getTemplatePath(template: string, { root, extension, engine }: ViewOptions): string {
    return join(root, 'templates', template, `html.${extension || engine}`);
  }

  private generateHtmlFromTemplate(
    template: string,
    { engine, engineOptions }: ViewOptions,
    locals?: unknown,
  ): Observable<string> {
    const moment = momentTz;
    moment.tz.setDefault('Europe/Brussels');
    moment.locale('nl-be');

    const translate = this.i18nService.translate.bind(this.i18nService);

    return bindNodeCallback<[string, ViewOptions['engineOptions'] | undefined], [string]>(
      consolidate[engine],
      asapScheduler,
    )(
      template,
      Object.assign(
        {
          moment,
          translate,
        },
        locals,
        engineOptions,
      ),
    );
  }

  private prepareHtmlTemplate(html: string): string {
    if ((this.moduleOptions.debug ?? false) === true) {
      const path = join(this.moduleOptions.view.root, 'un_juiced.html');
      this.logger.debug(`Writing html to file ${path}`);
      // write file in original folder before juice so we can test
      writeFile(path, html);
    }

    const juiced = juice(html, this.moduleOptions.juice);

    if ((this.moduleOptions.debug ?? false) === true) {
      // write file in original folder after juice so we can test
      writeFile(join(this.moduleOptions.view.root, 'juiced.html'), juiced);
    }

    return juiced;
  }
}
