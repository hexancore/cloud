/**
 * @group integration
 */

import { S3, HcS3Module, S3ObjectId, S3PutObjectOutput, S3DeleteObjectOutput } from '@';
import { S3Errors } from '@/Infrastructure/S3/S3Errors';
import { AccountId } from '@hexancore/common';
import { HcModule } from '@hexancore/core';
import { Test, TestingModule } from '@nestjs/testing';

describe('AccountBucketManager', () => {
  let module: TestingModule;
  let s3: S3;
  const TEST_BUCKET = 'test-s3-manager';

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        HcModule.forRoot({ accountContext: { useCls: false, currentAccountId: AccountId.cs('account1') } }),
        HcS3Module.forRoot({}),
      ],
    }).compile();

    s3 = module.get(S3);
    const r = await s3.deleteBucket(TEST_BUCKET, true);
    r.panicIfError();
  });

  afterEach(async () => {
    if (module) {
      await s3.deleteBucket(TEST_BUCKET, true);
      await module.close();
    }
  });

  describe('createBucket', () => {
    test('when not exists', async () => {
      const current = await s3.createBucket(TEST_BUCKET, { versioning: true });

      expect(current).toMatchSuccessResult(true);
      const names = await s3.listBucketsName();
      expect(names).toMatchSuccessResult([TEST_BUCKET]);
    });

    test('when exists', async () => {
      await s3.createBucket(TEST_BUCKET, { versioning: true });
      const current = await s3.createBucket(TEST_BUCKET, { versioning: true });

      expect(current).toMatchAppError({
        type: S3Errors.bucket_exist,
        data: {
          bucket: TEST_BUCKET,
        },
        code: 500,
      });
    });
  });

  describe('deleteBucket', () => {
    test('when exists', async () => {
      await s3.createBucket(TEST_BUCKET, { versioning: true });
      const current = await s3.deleteBucket(TEST_BUCKET);

      expect(current).toMatchSuccessResult(true);
      const names = await s3.listBucketsName();
      expect(names).toMatchSuccessResult([]);
    });

    test('when not exists', async () => {
      const current = await s3.deleteBucket(TEST_BUCKET);

      expect(current).toMatchSuccessResult(true);
    });
  });

  describe('existsBucket', () => {
    test('when exists', async () => {
      await s3.createBucket(TEST_BUCKET, { versioning: true });
      const current = await s3.existsBucket(TEST_BUCKET);

      expect(current).toMatchSuccessResult(true);
    });

    test('when not exists', async () => {
      const current = await s3.existsBucket(TEST_BUCKET);

      expect(current).toMatchSuccessResult(false);
    });
  });

  describe('object operations when versioning enabled', () => {
    let objectId: S3ObjectId;

    beforeEach(async () => {
      await s3.createBucket(TEST_BUCKET, { versioning: true });
      objectId = S3ObjectId.cs(TEST_BUCKET, 'test');
    });

    describe('putObject', () => {
      test('when versioning and not exists', async () => {
        const current = await s3.putObject(objectId, 'test_1');

        expect(current).toMatchSuccessResult(expect.any(S3PutObjectOutput));
        expect(current.v.id).toBe(objectId);
        expect(current.v.versionId.length).toBeGreaterThan(0);
      });
    });

    describe('getObject', () => {
      test('when exists and version not specified, should return latest', async () => {
        await s3.putObject(objectId, 'test_1');
        await s3.putObject(objectId, 'test_2');

        const current = await s3.getObject(objectId).onOk((o) => o.getAsString());

        expect(current).toMatchSuccessResult('test_2');
      });

      test('when exists and version specified, should return version content', async () => {
        const putResult = await s3.putObject(objectId, 'test_1');
        await s3.putObject(objectId, 'test_2');

        const objectIdVersion = S3ObjectId.cs(objectId.bucket, objectId.key, putResult.v.versionId);

        const current = await s3.getObject(objectIdVersion).onOk((o) => o.getAsString());

        expect(current).toMatchSuccessResult('test_1');
      });

      test('when not exists, should return error', async () => {
        const current = await s3.getObject(objectId);

        expect(current).toMatchAppError({ type: S3Errors.object_not_exist });
      });
    });

    describe('deleteObject', () => {
      test('when exists and only latest version exists', async () => {
        await s3.putObject(objectId, 'test_1');

        const current = await s3.deleteObject(objectId);

        expect(current).toMatchSuccessResult(expect.any(S3DeleteObjectOutput));
        const getResult = await s3.getObject(objectId);
        expect(getResult).toMatchAppError({ type: S3Errors.object_not_exist });
      });

      test('when exists and delete', async () => {
        await s3.putObject(objectId, 'test_1');

        const current = await s3.deleteObject(objectId);

        expect(current).toMatchSuccessResult(expect.any(S3DeleteObjectOutput));
      });
    });
  });
});
