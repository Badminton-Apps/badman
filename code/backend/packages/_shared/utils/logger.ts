import dotenv from 'dotenv';
import jsonStringify from 'fast-safe-stringify';
import moment from 'moment';
import prettyMilliseconds from 'pretty-ms';
import { createLogger, transports, format } from 'winston';
const { combine, errors, timestamp, colorize, align } = format;
import ecsFormat from '@elastic/ecs-winston-format';

dotenv.config();

let lastMesage = moment();
let lastDiff = '';
let lastMessageText = '';
const logLikeFormat = (maxArgLength?: number) => {
  return {
    transform: info => {
      const { timestamp: ts, label, level, message, stack } = info;
      const args = info[Symbol.for('splat')] || undefined;
      let strArgs = jsonStringify(args, null, 2);
      if (maxArgLength && strArgs && strArgs.length > maxArgLength) {
        strArgs = strArgs.slice(0, maxArgLength / 10);
        strArgs += '\n...andMore';
      }

      if (lastMessageText !== message) {
        const time = moment(ts);
        const duration = moment.duration(time.diff(lastMesage));
        lastDiff = prettyMilliseconds(duration.asMilliseconds()); // `${hrs}:${mins}:${secs}.${msecs}`;
        lastMesage = time;
        lastMessageText = message;
      }

      info[Symbol.for('message')] = `${moment(ts).format('LTS')}${label ? `[${label}]` : ''
        } ${level}: ${message} ${strArgs ? `\n${strArgs}` : ''} ${stack ? `\n${stack}` : ''
        }`;
      return info;
    }
  };
};

const tr = [];

if (process.env.LOG_LEVEL === 'None') {
  tr.push(
    new transports.Console({
      level: 'error',
      silent: true
    })
  );
} else {
  // eslint-disable-next-line no-console
  console.log('LOG LEVEL', process.env.LOG_LEVEL, process.env.NODE_ENV);

  tr.push(
    new transports.File({
      filename: 'error.log',
      level: 'error',
      format: logLikeFormat()
    }),
    new transports.File({
      filename: 'info.log',
      level: 'info',
      format: logLikeFormat(),
      options: { flags: 'w' }
    }),
    new transports.File({
      filename: 'debug.log',
      level: 'debug',
      format: logLikeFormat(),
      options: { flags: 'w' }
    }),
    new transports.File({
      filename: 'silly.log',
      level: 'silly',
      format: logLikeFormat(),
      options: { flags: 'w' }
    })
  );


  const outputFormat = process.env.NODE_ENV === 'production' ?
    ecsFormat() :
    combine(colorize(), timestamp(), logLikeFormat(1000));


  tr.push(
    new transports.Console({
      format: outputFormat,
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    })
  );
}

const logger = createLogger({
  format: combine(errors({ stack: true }), timestamp(), align()),
  transports: tr
});


export { logger };
