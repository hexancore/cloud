import { Redis, RedisOptions } from 'ioredis';
import { getLogger, INTERNAL_ERROR } from '@hexancore/common';
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
    const config = appConfig.getOrPanic<any>(o.configKey);
    const auth = appConfig.getSecretAsBasicAuth(o.authSecretKey);

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

    let redis: Redis|null = null;
    try {
      redis = new Redis(redisOptions);
      await redis.connect();
    } catch (e) {
      INTERNAL_ERROR(e as Error).panic();
    }

    return redis as Redis;
  }
});