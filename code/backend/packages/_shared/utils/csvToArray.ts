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
  const o = {
    // Default methods
    onAdd: (item: T) => item,
    onEnd: (item: T[]) => item as unknown as Y,
    onError: (item: Error) => item,

    // Override defaults
    ...options,
  };

  return new Promise<Y>((resolve, reject) => {
    const parser = parseString(csv, { headers: true });
    const data: T[] = [];

    parser.on('data', async (result: T) => {
      if (o.onAdd.constructor.name === 'AsyncFunction') {
        data.push(await o.onAdd(result));
      } else {
        data.push(o.onAdd(result) as T);
      }
    });

    parser.on('error', async (error) => {
      logger.error('Error reading csv', error);
      if (o.onError.constructor.name === 'AsyncFunction') {
        reject(await o.onError(error));
      } else {
        reject(o.onError(error));
      }
    });

    parser.on('end', async () => {
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

      if (o.onEnd.constructor.name === 'AsyncFunction') {
        resolve(await o.onEnd(data));
      } else {
        resolve(o.onEnd(data));
      }
    });
  });
};
