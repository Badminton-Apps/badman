import { acceptCookies, getPage, selectBadmninton, signIn } from '@badman/backend-pupeteer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
    const page = await getPage(false, ['--auto-open-devtools-for-tabs']);
    try {
      // Create browser

      page.setDefaultTimeout(10000);
      await page.setViewport({ width: 1691, height: 1337 });

      // Accept cookies
      await acceptCookies({ page }, {logger:this.logger});
      await selectBadmninton({ page });
      await signIn({ page }, {username: this._username, password: this._password, logger: this.logger});

      await page.goto(
        'https://www.toernooi.nl/sport/teammatch.aspx?id=0131343E-0198-48F4-A75B-4995C6B9095F&match=461',
      );

      // wait indefinitely
      await new Promise(() => ({}));
    } catch (error) {
      this.logger.error(error);
    } finally {
      // Close browser
      if (page) {
        page.close();
      }
    }
  }
}
