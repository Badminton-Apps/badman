import { parseString } from '@fast-csv/parse';
import { logger } from './logger';

export const csvToArray = <T, Y = T[]>(
  csv: string,
  options?: {
    onAdd?: (item: T) => T | PromiseLike<T>;
    onEnd?: (item: T[]) => Y | PromiseLike<Y>;
    onError?: (error: Error) => void | PromiseLike<void>;
  }
) => {
  return new Promise<Y>((resolve, reject) => {
    const parser = parseString(csv, { headers: true });
    const data: T[] = [];

    parser.on('data', async (result: T) => {
      if (options.onAdd) {
        if (options.onAdd.constructor.name === 'AsyncFunction') {
          data.push(await options.onAdd(result));
        } else {
          data.push(options.onAdd(result) as T);
        }
      }
    });

    parser.on('error', async (error) => {
      if (options.onError) {
        logger.error('Error reading csv', error);
        if (options.onError.constructor.name === 'AsyncFunction') {
          reject(await options.onError(error));
        } else {
          reject(options.onError(error));
        }
      }
    });

    parser.on('end', async () => {
      if (options.onEnd) {
        if (
          data === null ||
          data === undefined ||
          (data.length === 0 && csv.length === 0)
        ) {
          reject({
            message: 'No data',
            arguments: { csv },
          });
        }

        if (options.onEnd.constructor.name === 'AsyncFunction') {
          resolve(await options.onEnd(data));
        } else {
          resolve(options.onEnd(data));
        }
      }
    });
  });
};
