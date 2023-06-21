import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { Model, Sequelize } from 'sequelize-typescript';

const TTL = 60 * 60 * 24 * 7; // 1 week

@Injectable()
export class SequelizeAttachReqToModelMiddleware {
  private readonly logger = new Logger(
    SequelizeAttachReqToModelMiddleware.name
  );

  constructor(
    sequelize: Sequelize,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly _cacheManager: Cache
  ) {
    const cache = this.configService.get('DB_CACHE') === 'true';
    const prefix = this.configService.get('DB_CACHE_PREFIX');

    const seq = sequelize as Sequelize & { Cache: Cache };

    if (cache) {
      this.logger.debug('initialize cache');
      seq['Cache'] = this._cacheManager;

      // seq.addHook('beforeQuery', 'beforeQueryCache', async (options, query) => {
      //   if (!options) return;
      //   const model = (options as unknown as { model: any })?.['model'];
      //   this.logger.debug(`beforeQueryCache: ${model.name}`);
      //   if (!model) return;
      //   const cacheKey = `${prefix}${model.name}\\${model.id}`;
      //   const cached = await seq['Cache'].get(cacheKey);
      //   if (cached) {
      //     this.logger.debug(`beforeQueryCache: ${cacheKey} found`);
      //     return cached as any;
      //   }
      // });

      seq.addHook('afterFind', 'afterFindCache', async (results) => {
        if (!Array.isArray(results)) return;
        for (const result of results) {
          if (!(result instanceof Model)) continue;
          const cacheKey = `${prefix}${result.constructor.name}:${result.id}`;
          await seq['Cache'].set(cacheKey, result.toJSON(), TTL);
        }
      });

      seq.addHook('afterCreate', 'afterCreateCache', async (instance) => {
        if (!(instance instanceof Model)) return;
        const cacheKey = `${prefix}instance.constructor.name}:${instance.id}`;
        await seq['Cache'].set(cacheKey, instance.toJSON(), TTL);
      });

      seq.addHook('afterUpdate', 'afterUpdateCache', async (instance) => {
        if (!(instance instanceof Model)) return;
        const cacheKey = `${prefix}${instance.constructor.name}:${instance.id}`;
        await seq['Cache'].set(cacheKey, instance.toJSON(), TTL);
      });

      seq.addHook('afterDestroy', 'afterDestroyCache', async (instance) => {
        if (!(instance instanceof Model)) return;
        const cacheKey = `${prefix}${instance.constructor.name}:${instance.id}`;
        await seq['Cache'].del(cacheKey);
      });

      seq.addHook('afterFind', 'afterFindCache', async (results) => {
        if (!Array.isArray(results)) return;
        for (const result of results) {
          if (!(result instanceof Model)) continue;
          const cacheKey = `${prefix}${result.constructor.name}:${result.id}`;
          await seq['Cache'].set(cacheKey, result.toJSON(), TTL);
        }
      });

      seq.addHook(
        'afterBulkCreate',
        'afterBulkCreateCache',
        async (instances) => {
          if (!Array.isArray(instances)) return;
          for (const instance of instances) {
            if (!(instance instanceof Model)) continue;
            const cacheKey = `${prefix}${instance.constructor.name}:${instance.id}`;
            await seq['Cache'].set(cacheKey, instance.toJSON(), TTL);
          }
        }
      );

      seq.addHook(
        'afterBulkUpdate',
        'afterBulkUpdateCache',
        async (instances) => {
          if (!Array.isArray(instances)) return;
          for (const instance of instances) {
            if (!(instance instanceof Model)) continue;
            const cacheKey = `${prefix}${instance.constructor.name}:${instance.id}`;
            await seq['Cache'].set(cacheKey, instance.toJSON(), TTL);
          }
        }
      );

      seq.addHook(
        'afterBulkDestroy',
        'afterBulkDestroyCache',
        async (instances) => {
          if (!Array.isArray(instances)) return;
          for (const instance of instances) {
            if (!(instance instanceof Model)) continue;
            const cacheKey = `${prefix}${instance.constructor.name}:${instance.id}`;
            await seq['Cache'].del(cacheKey);
          }
        }
      );

      seq.addHook('afterQuery', 'afterQueryCache', async (options) => {
        //     if (!options || !options.instance) return;
        //     const cacheKey =
        //       options.instance.constructor.name + ':' + JSON.stringify(options);
        //     const model = await seq['Cache'].get(cacheKey);
        //     this.logger.debug('cache: ' + cacheKey);
        //     if (model) {
        //       return;
        //     }
        //     await seq['Cache'].set(cacheKey, JSON.stringify(options), TTL);
      });

      console.log('cache enabled');
    }
  }
}
