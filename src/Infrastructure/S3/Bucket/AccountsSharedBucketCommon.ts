import { AR, ERRA, R } from '@hexancore/common';
import { AccountContext } from '@hexancore/core';
import { NodeJsRuntimeStreamingBlobPayloadInputTypes } from '@smithy/types';
import { S3DeleteObjectsOutput, S3GetObjectOutput, S3PutObjectOutput } from '../Command';
import { GetObjectAsStringOptions, GetObjectOptions } from '../Command/GetObjectOptions';
import { S3, S3PutObjectOptions } from '../S3';
import { S3ErrorObjectOrBucketNotExist, S3Errors } from '../S3Errors';
import { S3ObjectId } from '../S3ObjectId';

/**
 * Represents a bucket where multiple accounts store data.
 * Object key is always prefixed with current accountId: `<accountId>/<key>`
 */
export abstract class AccountsSharedBucketCommon<GOT extends GetObjectOptions> {
  public constructor(protected ac: AccountContext, protected s3: S3, protected bucket: string) {}

  /**
   * Puts an object into the S3 bucket.
   * @param key - The object key.
   * @param body - The object content.
   * @param options - Optional parameters for the put operation.
   * @returns The result of the put operation.
   */
  public put(key: string, body: NodeJsRuntimeStreamingBlobPayloadInputTypes, options?: S3PutObjectOptions): AR<S3PutObjectOutput, string> {
    return this.objectId(key).onOk((id) => this.s3.putObject(id, body, options));
  }

  /**
   * Retrieves an object as stream from the S3 bucket.
   * @param key - The key of the object to retrieve.
   * @param options - Optional parameters.
   * @returns A readable stream of the object if successful.
   */
  public getAsStream(key: string, options?: GOT): AR<ReadableStream, S3ErrorObjectOrBucketNotExist | S3Errors<'empty_body'>> {
    return this.get(key, options).onOk((o) => o.getAsStream());
  }

  /**
   * Retrieves an object as string from the S3 bucket.
   * @param key - The key of the object to retrieve.
   * @param options - Optional parameters.
   * @returns A readable stream of the object if successful.
   */
  public getAsString(key: string, options?: GOT & GetObjectAsStringOptions): AR<string, S3ErrorObjectOrBucketNotExist | S3Errors<'empty_body'>> {
    return this.get(key, options).onOk((o) => o.getAsString(options?.encoding));
  }

  /**
   * Retrieves an object from the S3 bucket.
   * @param key - The key of the object to retrieve.
   * @returns The result of the get operation.
   */
  public get(key: string, options?: GOT): AR<S3GetObjectOutput, S3ErrorObjectOrBucketNotExist> {
    return this.objectId(key).onOk((id) => this.s3.getObject(id, options));
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

  protected objectId(key: string): R<S3ObjectId, S3Errors<'object_key_is_not_file'>> {
    key = this.getAccountKeyPrefix() + key;
    return S3ObjectId.c(this.bucket, key);
  }

  protected getAccountKeyPrefix(): string {
    return this.ac.get().toString() + '/';
  }
}
