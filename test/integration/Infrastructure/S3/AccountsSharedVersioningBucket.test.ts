/**
 * @group integration
 */

import { AccountsSharedVersioningBucket, HcS3Module, S3, S3DeleteObjectsOutput, S3PutObjectOutput } from '@';
import { AccountId } from '@hexancore/common';
import { AccountContext, HcModule } from '@hexancore/core';
import { Test, TestingModule } from '@nestjs/testing';

describe(' AccountsSharedVersioningBucket', () => {
  let module: TestingModule;
  let s3: S3;
  let bucket: AccountsSharedVersioningBucket;
  const TEST_BUCKET = 'test-accounts-shared-versioning-bucket';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        HcModule.forRoot({ accountContext: { useCls: false, currentAccountId: AccountId.cs('account1') } }),
        HcS3Module.forRoot({}),
      ],
    }).compile();

    s3 = module.get(S3);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    const r = await s3
      .deleteBucket(TEST_BUCKET, true)
      .onOk(() => s3.createBucket(TEST_BUCKET, { versioning: true }));
    r.panicIfError();
    bucket = new AccountsSharedVersioningBucket(module.get(AccountContext), s3, TEST_BUCKET);
  });

  afterEach(async () => {
    if (module) {
      await s3.deleteBucket(TEST_BUCKET, true);
    }
  });

  describe('put', () => {
    test('when object not exists', async () => {
      const key = 'test.txt';
      const current = await bucket.put(key, 'test_body');
      expect(current).toMatchSuccessResult(expect.any(S3PutObjectOutput));

      const objects = await s3.listObjects(TEST_BUCKET).keysAsArray();
      expect(objects).toMatchSuccessResult(['account1/test.txt']);
      expect(await bucket.getAsString(key)).toMatchSuccessResult('test_body');
    });

    test('when object exists', async () => {
      const key = 'test.txt';
      const firstPut = await bucket.put(key, 'test_body');

      const current = await bucket.put(key, 'test_body_new');

      expect(current).toMatchSuccessResult(expect.any(S3PutObjectOutput));
      expect(await bucket.getAsString(key)).toMatchSuccessResult('test_body_new');

      expect(await bucket.getAsString(key, { versionId: firstPut.v.versionId })).toMatchSuccessResult(
        'test_body',
      );
      expect(await bucket.getAsString(key, { versionId: current.v.versionId })).toMatchSuccessResult(
        'test_body_new',
      );
    });
  });

  describe('delete', () => {
    test('when object not exists', async () => {
      const key = 'test.txt';
      const current = await bucket.delete(key);
      expect(current).toMatchSuccessResult(expect.any(S3DeleteObjectsOutput));

      const objects = await s3.listObjects(TEST_BUCKET).keysAsArray();
      expect(objects).toMatchSuccessResult([]);
    });

    test('when object exists', async () => {
      const key = 'test.txt';
      await bucket.put(key, 'test_body');

      const current = await bucket.delete(key);
      expect(current).toMatchSuccessResult(expect.any(S3DeleteObjectsOutput));

      const objects = await s3.listObjects(TEST_BUCKET).keysAsArray();
      expect(objects).toMatchSuccessResult([]);
    });
  });

  describe('deleteRecursive', () => {
    test('when object not exists', async () => {
      await bucket.put('test.txt', 'test_body'); // must stay

      const current = await bucket.deleteRecursive('dir/test.txt');

      expect(current).toMatchSuccessResult(expect.any(S3DeleteObjectsOutput));
      const objects = await s3.listObjects(TEST_BUCKET).keysAsArray();
      expect(objects).toMatchSuccessResult(['account1/test.txt']);
    });

    test('when object exists', async () => {
      const key = 'dir/test.txt';
      await bucket.put('test.txt', 'test_body'); // must stay
      await bucket.put(key, 'test_body');

      const current = await bucket.deleteRecursive('dir');

      expect(current).toMatchSuccessResult(expect.any(S3DeleteObjectsOutput));
      const objects = await s3.listObjects(TEST_BUCKET).keysAsArray();
      expect(objects).toMatchSuccessResult(['account1/test.txt']);
    });
  });
});
