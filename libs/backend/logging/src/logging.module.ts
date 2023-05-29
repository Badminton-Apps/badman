import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  utilities as nestWinstonModuleUtilities,
  WinstonModule,
} from 'nest-winston';
import { format, transports } from 'winston';
import { ILoggingConfig } from './interfaces/logging.config';

const { combine, timestamp, errors, ms, json } = format;

@Module({
  imports: [],
})
export class LoggingModule {
  // create a for root async method
  static forRoot(config?: ILoggingConfig) {
    const addAppNameFormat = format((info) => {
      info.appname = config?.name || 'Badman';
      return info;
    });

    const addVersionNumberFormat = format((info) => {
      info.version = config?.version || '0.0.0';
      return info;
    });

    const logFileFormat = format.printf(
      ({ level, message, timestamp, stack }) => {
        let resultMessage = `${timestamp} ${level}: ${message}`;

        if (stack) {
          resultMessage += `${JSON.stringify(stack)}`;
        }

        return resultMessage;
      }
    );

    return {
      module: LoggingModule,
      imports: [
        WinstonModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            console.log(configService.get('NODE_ENV'));

            if (configService.get('NODE_ENV') === 'production') {
              const logtail = new Logtail(configService.get('LOGTAIL_TOKEN'), {
                endpoint: 'https://in.logtail.com',
              });
              return {
                level: 'debug',
                format: combine(
                  addAppNameFormat(),
                  addVersionNumberFormat(),
                  errors({ stack: true }),
                  timestamp(),
                  ms(),
                  json()
                ),
                transports: [
                  new LogtailTransport(logtail),
                  new transports.Console({
                    format: nestWinstonModuleUtilities.format.nestLike(
                      'Badman',
                      {
                        colors: true,
                        prettyPrint: true,
                      }
                    ),
                  }),
                ],
              };
            } else {
              return {
                level: 'silly',
                format: combine(
                  errors({ stack: true }),
                  nestWinstonModuleUtilities.format.nestLike('Badman', {
                    colors: true,
                    prettyPrint: true,
                    
                  })
                ),
                transports: [
                  new transports.Console(),
                  new transports.File({
                    filename: `info-${config.name}.log`,
                    level: 'silly',
                    format: combine(
                      timestamp(),
                      logFileFormat
                    ),
                    options: { flags: 'w' },
                  }),
                ],
              };
            }
          },
          inject: [ConfigService],
        }),
      ],
    };
  }
}
