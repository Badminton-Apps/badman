import { accepCookies, getBrowser, selectBadmninton, signIn } from '@badman/backend-pupeteer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser } from 'puppeteer';
import { ConfigType } from '@badman/utils';

@Injectable()
export class OpenVisualService {
  private readonly logger = new Logger(OpenVisualService.name);
  private readonly _username?: string;
  private readonly _password?: string;

  constructor(configService: ConfigService<ConfigType>) {
    this._username = configService.get('VR_API_USER');
    this._password = configService.get('VR_API_PASS');
  }

  async start(): Promise<void> {
    let browser: Browser | undefined;

    try {
      // Create browser
      browser = await getBrowser(false, ['--auto-open-devtools-for-tabs']);

      const page = await browser.newPage();
      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await accepCookies({ page });
      await selectBadmninton({ page });
      await signIn({ page }, this._username, this._password);

      await page.goto(
        'https://www.toernooi.nl/sport/teammatch.aspx?id=0131343E-0198-48F4-A75B-4995C6B9095F&match=461',
      );

      // wait indefinitely
      await new Promise(() => ({}));
    } catch (error) {
      this.logger.error(error);
    } finally {
      // Close browser
      if (browser) {
        browser.close();
      }
    }
  }
}
