import { ConfigType } from "@badman/utils";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { Transporter } from "nodemailer";
import { IMailTransport, MailSendOptions } from "./mail-transport.interface";

@Injectable()
export class SmtpProvider implements IMailTransport {
  private readonly logger = new Logger(SmtpProvider.name);
  private readonly _transporter: Transporter;
  private _verified: boolean | null = null;

  constructor(private readonly configService: ConfigService<ConfigType>) {
    this._transporter = nodemailer.createTransport({
      host: this.configService.get("MAIL_HOST"),
      port: 465,
      auth: {
        user: this.configService.get("MAIL_USER"),
        pass: this.configService.get("MAIL_PASS"),
      },
    });
  }

  async send(options: MailSendOptions): Promise<void> {
    if (this._verified === null) {
      try {
        this._verified = !!(await this._transporter.verify());
      } catch (e) {
        this._verified = false;
        this.logger.warn("SMTP verify failed; mailing disabled", e);
      }
      if (!this._verified) {
        this.logger.warn("SMTP verify returned false; mailing disabled");
        return;
      }
    }

    if (!this._verified) return;

    await this._transporter.sendMail(options);
  }
}
