import { parseString } from '@fast-csv/parse';
import { logger } from './logger';

const defaultOptions = {
  onAdd: (item: any) => item,
  onEnd: (item: any) => item,
  onError: (item: any) => item
};

export const csvToArray = <T>(
  csv: string,
  options?: {
    onAdd?: (item: any) => any;
    onEnd?: (item: any) => T;
    onError?: (item: any) => any;
  }
) => {
  const o = {
    ...defaultOptions,
    ...options
  };

  return new Promise<T>((resolve, reject) => {
    const parser = parseString(csv, { headers: true });
    const data = [];

    parser.on('data', async result => {
      if (o.onAdd.constructor.name === 'AsyncFunction') {
        data.push(await o.onAdd(result));
      } else {
        data.push(o.onAdd(result));
      }
    });

    parser.on('error', async error => {
      logger.error('Error reading csv', error);
      if (o.onAdd.constructor.name === 'AsyncFunction') {
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
          arguments: { csv }
        });
      }

      if (o.onAdd.constructor.name === 'AsyncFunction') {
        resolve(await o.onEnd(data));
      } else {
        resolve(o.onEnd(data));
      }
    });
  });
};
