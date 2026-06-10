import { DatabaseModule } from "@badman/backend-database";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CompileModule } from "@badman/backend-compile";
import { MailingService } from "./services";
import { join } from "path";
import { ConfigType } from "@badman/utils";
import { MAIL_TRANSPORT_TOKEN, IMailTransport } from "./providers";
import { SmtpProvider } from "./providers/smtp.provider";
import { ResendProvider } from "./providers/resend.provider";

const logger = new Logger("MailingModule");

@Module({
  imports: [
    CompileModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService<ConfigType>) => ({
        view: {
          root: join(__dirname, "compile", "libs", "mailing"),
          engine: "pug",
        },
        debug: configService.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    ConfigModule,
  ],
  providers: [
    MailingService,
    {
      provide: MAIL_TRANSPORT_TOKEN,
      useFactory: (configService: ConfigService<ConfigType>): IMailTransport | null => {
        if (!(configService.get<boolean>("MAIL_ENABLED") ?? false)) return null;

        const provider = configService.get<string>("MAIL_PROVIDER") ?? "smtp";

        if (provider === "resend") return new ResendProvider(configService);

        if (provider !== "smtp") {
          logger.warn(`Unknown MAIL_PROVIDER "${provider}"; falling back to smtp`);
        }

        return new SmtpProvider(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [MailingService],
})
export class MailingModule {}
