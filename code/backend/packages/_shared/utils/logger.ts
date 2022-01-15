import dotenv from 'dotenv';
import jsonStringify from 'fast-safe-stringify';
import moment from 'moment';
import { createLogger, transports, format } from 'winston';
const { combine, errors, timestamp, colorize, align } = format;
import ecsFormat from '@elastic/ecs-winston-format';

dotenv.config();

let lastMessageText = '';
const logLikeFormat = (maxArgLength?: number) => {
  return {
    transform: (info) => {
      const { timestamp: ts, label, level, message, stack} = info;

      if (lastMessageText !== message) {
        lastMessageText = message;
      }

      let returnMessage = `${moment(ts).format('LTS')} `;

      if (label) {
        returnMessage += `[${label}] `;
      } 

      returnMessage += `${level}: ${message}`;

      const args = info[Symbol.for('splat')] || undefined;

      // delete arguments we use
      if (args && args.length > 0) {
        args?.findIndex(r => r['label'] != null) > -1 ? args.splice(args.findIndex(r => r['label'] != null), 1) : null;
      }


      let strArgs = jsonStringify(args, null, 2);
      if (maxArgLength && strArgs && strArgs.length > maxArgLength) {
        strArgs = strArgs.slice(0, maxArgLength / 10);
        strArgs += '\n...andMore';
      }
      if (strArgs) {
        returnMessage += `\n${strArgs}`;
      }

      if (stack) {
        returnMessage += `\n${stack}`;
      }
      info[Symbol.for('message')] = returnMessage;
 
      return info;
    },
  };
};

const tr = [];

if (process.env.LOG_LEVEL === 'None') {
  tr.push(
    new transports.Console({
      level: 'error',
      silent: true,
    })
  );
} else {
  // eslint-disable-next-line no-console
  console.log('LOG LEVEL', process.env.LOG_LEVEL, process.env.NODE_ENV);

  // File loggers
  tr.push(
    new transports.File({
      filename: 'error.log',
      level: 'error',
      format: logLikeFormat(),
    }),
    new transports.File({
      filename: 'info.log',
      level: 'info',
      format: logLikeFormat(),
      options: { flags: 'w' },
    }),
    new transports.File({
      filename: 'debug.log',
      level: 'debug',
      format: logLikeFormat(),
      options: { flags: 'w' },
    }),
    new transports.File({
      filename: 'silly.log',
      level: 'silly',
      format: logLikeFormat(),
      options: { flags: 'w' },
    })
  );

  // Format
  const outputFormat =
    process.env.NODE_ENV === 'production'
      ? combine(
          ecsFormat({
            apmIntegration: true,
            convertReqRes: true,
            convertErr: true,
          })
        )
      : combine(colorize(), timestamp(), logLikeFormat(1000));

  tr.push(
    new transports.Console({
      format: outputFormat,
      level: process.env.LOG_LEVEL ?? 'debug',
    })
  );

  // tr.push(
  //   new transports.Console({
  //     format: ecsFormat({
  //       apmIntegration: true,
  //       convertReqRes: true,
  //       convertErr: true
  //     }),
  //     level: process.env.LOG_LEVEL ?? 'debug'
  //   })
  // );
}

const logger = createLogger({
  defaultMeta: {
    version: process.env.SERVICE_VERSION,
    name: process.env.SERVICE_NAME,
  },
  format: combine(errors({ stack: true }), timestamp(), align()),
  transports: tr,
});

export { logger };
