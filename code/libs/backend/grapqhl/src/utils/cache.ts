import KeyvRedis from '@keyv/redis';
import Keyv from 'keyv';
import { KeyvAdapter } from '@apollo/utils.keyvadapter';
import Redis from 'ioredis';

export const GRAPHQL_CACHE = new KeyvAdapter(
  new Keyv({
    store: new KeyvRedis(
      new Redis({
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10),
        password: process.env.REDIS_PASSWORD,
      }) as unknown
    ),
  })
);
