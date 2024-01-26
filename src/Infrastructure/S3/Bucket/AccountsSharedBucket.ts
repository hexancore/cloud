import { AR, ERRA } from '@hexancore/common';
import { S3DeleteObjectOutput, S3DeleteObjectsOutput } from '../Command';
import { GetObjectOptionsWithoutVersion } from '../Command/GetObjectOptions';
import { S3Errors } from '../S3Errors';
import { AccountsSharedBucketCommon } from './AccountsSharedBucketCommon';

/**
 * Represents a bucket where multiple accounts store data.
 * Object key is always prefixed with current accountId: `<accountId>/<key>`
 */
export class AccountsSharedBucket extends AccountsSharedBucketCommon<GetObjectOptionsWithoutVersion> {
  /**
   * Deletes object.
   * @param key - The key of the object to delete.
   * @returns The result of the delete operation.
   */
  public delete(key: string): AR<S3DeleteObjectOutput, S3Errors<'bucket_not_exist' | 'object_key_is_not_file'>> {
    return this.objectId(key).onOk((id) => this.s3.deleteObject(id));
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
    return this.s3.deleteObjects(this.bucket, prefix);
  }
}
