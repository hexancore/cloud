import { Redis, RedisOptions } from 'ioredis';
import { getLogger, ERR, AppErrorCode, INTERNAL_ERROR } from '@hexancore/common';
import { AppConfig } from '@hexancore/core';
import type { FactoryProvider, InjectionToken } from '@nestjs/common';

export const APP_REDIS_TOKEN = 'HC_APP_REDIS';

export interface RedisProviderFactoryOptions {
  id: string,
  token: InjectionToken,
  configKey: string,
  authSecretKey: string;
}

export const RedisProviderFactory = (o: RedisProviderFactoryOptions): FactoryProvider<Redis> => ({
  provide: o.token,
  inject: [AppConfig],
  useFactory: async (appConfig: AppConfig): Promise<Redis> => {
    const LOGGER = getLogger(`cloud.infra.redis.${o.id}`, ['core', 'infra', 'redis']);
    const config = appConfig.config.get(o.configKey);
    if (config === undefined) {
      ERR('core.infra.redis.empty_config', AppErrorCode.INTERNAL_ERROR).panicIfError();
    }

    const secretGetResult = appConfig.secrets.getAsBasicAuth(o.authSecretKey);
    secretGetResult.panicIfError();
    const auth = secretGetResult.v;

    const retryOptions = {
      warnEveryXTimes: config.retry?.warnEveryXTimes ?? 5,
      firstRetryDelayMs: config.retry?.firstRetryDelayMs ?? 3000,
      retryDelayMultiplerMs: config.retry?.retryDelayMultiplerMs ?? 5000,
      maxRetryDelayMs: config.retry?.maxRetryDelayMs ?? 1 * 60 * 1000,
    };

    const redisOptions: RedisOptions = {
      ...config,
      username: auth.username,
      password: auth.password,
      lazyConnect: true,
      retryStrategy(times) {
        const nextDelay = Math.min(retryOptions.firstRetryDelayMs + times * retryOptions.retryDelayMultiplerMs, retryOptions.maxRetryDelayMs);
        if (times % retryOptions.warnEveryXTimes === 0) {
          LOGGER.warn(`Reconnected redis, times: ${times} next delay: ${nextDelay} ms`, { times, nextDelay });
        }

        return nextDelay;
      },
    };

    const redis = new Redis(redisOptions);

    try {
      await redis.connect();
    } catch (e) {
      INTERNAL_ERROR(e as Error);
    }

    return redis;
  }
});