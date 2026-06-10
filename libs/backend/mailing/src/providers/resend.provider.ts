import { ConfigType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { IMailTransport, MailSendOptions } from "./mail-transport.interface";

@Injectable()
export class ResendProvider implements IMailTransport {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly _resend: Resend | null = null;

  constructor(configService: ConfigService<ConfigType>) {
    const apiKey = configService.get<string>("RESEND_API_KEY");
    if (!apiKey) {
      this.logger.error("RESEND_API_KEY not set; mailing via Resend disabled");
      return;
    }
    this._resend = new Resend(apiKey);
  }

  async send(options: MailSendOptions): Promise<void> {
    if (!this._resend) return;

    const { error } = await this._resend.emails.send({
      from: options.from,
      to: options.to,
      ...(options.cc !== undefined ? { cc: options.cc } : {}),
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      this.logger.error("Resend send failed", error);
    }
  }
}
