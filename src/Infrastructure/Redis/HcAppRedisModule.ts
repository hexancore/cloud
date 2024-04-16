import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { RedisProviderFactory } from './RedisProvider';
import type Redis from 'ioredis';
import { getLogger } from '@hexancore/common';

export const APP_REDIS_TOKEN = 'HC_APP_REDIS';
export const InjectAppRedis = (): PropertyDecorator & ParameterDecorator => Inject(APP_REDIS_TOKEN);

const appRedisProvider = RedisProviderFactory({
  id: 'app',
  authSecretKey: 'core.redis',
  configKey: 'core.redis',
  token: APP_REDIS_TOKEN,
});

@Global()
@Module({
  providers: [appRedisProvider],
  exports: [appRedisProvider],
})
export class HcAppRedisModule implements OnApplicationShutdown {
  public constructor(@InjectAppRedis() private redis: Redis) {

  }

  public async onApplicationShutdown(_signal?: string): Promise<any> {
    const logger = getLogger(`cloud.infra.redis`, ['core', 'infra', 'redis']);
    logger.info('Start shutdown redis...');
    await this.redis.quit();
    logger.info('End shutdown redis...');
  }
}