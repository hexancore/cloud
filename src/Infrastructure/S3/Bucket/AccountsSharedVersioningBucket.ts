import { AR, ERRA, R } from '@hexancore/common';
import { S3DeleteObjectOutput, S3DeleteObjectsOutput, S3GetObjectOutput } from '../Command';
import { GetObjectOptions } from '../Command/GetObjectOptions';
import { S3ErrorObjectOrBucketNotExist, S3Errors } from '../S3Errors';
import { S3ObjectId } from '../S3ObjectId';
import { AccountsSharedBucketCommon } from './AccountsSharedBucketCommon';

/**
 * Represents a bucket where multiple accounts store data.
 * Object key is always prefixed with current accountId: `<accountId>/<key>`
 */
export class AccountsSharedVersioningBucket extends AccountsSharedBucketCommon<GetObjectOptions> {
  /**
   * Retrieves an object from the S3 bucket.
   * @param key - The key of the object to retrieve.
   * @param options - Optional parameters including versionId.
   * @returns The result of the get operation.
   */
  public get(key: string, options?: GetObjectOptions): AR<S3GetObjectOutput, S3ErrorObjectOrBucketNotExist> {
    return this.objectId(key, options?.versionId).onOk((id) => this.s3.getObject(id));
  }

  /**
   * Deletes all object versions.
   * @param key - The key of the object to delete.
   * @returns The result of the delete operation.
   */
  public delete(key: string): AR<S3DeleteObjectsOutput, S3Errors<'bucket_not_exist' | 'object_key_is_not_file'>> {
    return this.objectId(key).onOk(() => this.deleteAllVersions(key) as unknown as AR<S3DeleteObjectsOutput, S3Errors<'bucket_not_exist'>>);
  }

  /**
   * Deletes object version.
   * @param key - The key of the object to delete.
   * @param versionId - The version Id of the object.
   * @returns The result of the delete operation.
   */
  public deleteVersion(key: string, versionId: string): AR<S3DeleteObjectOutput, S3Errors<'object_key_is_not_file' | 'bucket_not_exist'>> {
    return this.objectId(key, versionId).onOk((id) => this.s3.deleteObject(id) as unknown as AR<S3DeleteObjectOutput, S3Errors<'bucket_not_exist'>>);
  }

  /**
   * Deletes objects by prefix.
   * @param prefix - The prefix of the objects to delete.
   * @returns The result of the delete operation.
   */
  public deleteRecursive(prefix: string): AR<S3DeleteObjectsOutput, S3Errors<'bucket_not_exist' | 'empty_key_prefix'>> {
    if (prefix.length === 0) {
      return ERRA(S3Errors.empty_key_prefix);
    }

    prefix = this.getAccountKeyPrefix() + prefix;
    return this.s3.deleteObjectsVersions(this.bucket, prefix);
  }

  protected deleteAllVersions(prefix: string): AR<S3DeleteObjectsOutput, S3Errors<'bucket_not_exist' | 'empty_key_prefix'>> {
    if (prefix.length === 0) {
      return ERRA(S3Errors.empty_key_prefix);
    }
    prefix = this.getAccountKeyPrefix() + prefix;
    return this.s3.deleteObjectsVersions(this.bucket, prefix);
  }

  protected objectId(key: string, versionId?: string): R<S3ObjectId, S3Errors<'object_key_is_not_file'>> {
    key = this.getAccountKeyPrefix() + key;
    return S3ObjectId.c(this.bucket, key, versionId);
  }
}
