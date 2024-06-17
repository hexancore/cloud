/**
 * @group integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { HcAppRedisModule, InjectAppRedis } from '@/redis';
import { Injectable } from '@nestjs/common';
import { HcAppConfigModule } from '@hexancore/core';

@Injectable()
class T {
  public constructor(@InjectAppRedis() public r: Redis) {}
}

describe('HcAppRedisModule', () => {
  let module!: TestingModule|null;
  let redis!: Redis| null;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [HcAppConfigModule, HcAppRedisModule],
      providers: [T],
    }).compile();
    module.enableShutdownHooks();
    await module.init();
    redis = module.get(T).r;
  }, 10000);

  afterAll(async () => {
    if (module) {
      redis = null;
      await module.close();
      module = null;
    }
  });

  test('connected', async () => {
    const key = 'app:test';
    await redis!.set(key, 'test');
    const r = await redis!.get(key);

    expect(r).toEqual('test');
  }, 10000);
});
