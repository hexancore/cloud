import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  CreateBucketCommandOutput,
  DeleteBucketCommand,
  DeleteBucketCommandOutput,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  DeleteObjectsCommand,
  DeleteObjectsCommandOutput,
  GetBucketVersioningCommand,
  GetBucketVersioningCommandOutput,
  GetObjectCommand,
  GetObjectCommandOutput,
  HeadBucketCommand,
  HeadBucketCommandOutput,
  ListBucketsCommand,
  ListBucketsCommandOutput,
  NoSuchKey,
  ObjectLockMode,
  PutBucketVersioningCommand,
  PutBucketVersioningCommandOutput,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
  S3ServiceException,
  StorageClass,
} from '@aws-sdk/client-s3';
import { AR, ARW, ERR, InternalError, NeverError, OK, OKA, P } from '@hexancore/common';
import { NodeJsRuntimeStreamingBlobPayloadInputTypes } from '@smithy/types';
import {
  S3DeleteObjectOutput,
  S3DeleteObjectsOutput,
  S3GetObjectOutput,
  S3ListObjectsOutput,
  S3ListObjectsVersionsOutput,
  S3PutObjectOutput,
} from './Command';
import { S3ErrorObjectOrBucketNotExist, S3Errors } from './S3Errors';
import { S3ObjectId } from './S3ObjectId';
import { GetObjectAsStringOptions, GetObjectOptions } from './Command/GetObjectOptions';

export class S3DeleteAllObjectVersionsOutput {
  public constructor(public readonly id: S3ObjectId, private o?: DeleteObjectsCommandOutput) {}
}

export class S3ListBucketsOutput {
  public constructor(private names: string[], private o: ListBucketsCommandOutput) {}

  public getNames(): string[] {
    return this.names;
  }
}

export interface S3PutObjectOptions {
  contentType?: string;
  contentEncoding?: string;
  contentDisposition?: string;
  contentLanguage?: string;
  metadata?: Record<string, any>;
  storageClass?: StorageClass;
  objectLockMode?: ObjectLockMode;
  sseKMSKeyId?: string;
}

export interface S3CreateBucketOptions {
  versioning?: boolean;
}

export class S3 {
  public constructor(protected client: S3Client, protected bucketPrefix = '') {}

  public createBucket(bucket: string, options: S3CreateBucketOptions): AR<boolean, S3Errors<'bucket_exist'>> {
    const command = new CreateBucketCommand({
      Bucket: bucket,
    });

    return this.send<CreateBucketCommandOutput>(command)
      .onOk(() => {
        if (options.versioning) {
          const commandVersioning = new PutBucketVersioningCommand({
            Bucket: bucket,
            VersioningConfiguration: {
              Status: 'Enabled',
            },
          });
          return this.send<PutBucketVersioningCommandOutput>(commandVersioning).mapToTrue();
        }

        return OK(true);
      })
      .onErr((e) => {
        if (e.isInternalError() && e.error instanceof BucketAlreadyOwnedByYou) {
          return ERR({ type: S3Errors.bucket_exist, code: 500, error: e.error, data: { bucket } });
        }

        return ERR(e);
      });
  }

  public existsBucket(bucket: string): AR<boolean, InternalError> {
    const command = new HeadBucketCommand({ Bucket: bucket });

    return this.send<HeadBucketCommandOutput>(command)
      .mapToTrue()
      .onErr((e) => {
        const error: S3ServiceException = e.error as any;
        if (error['$metadata'].httpStatusCode === 404) {
          return OK(false);
        }
        return ERR(e);
      });
  }

  public deleteBucket(bucket: string, force = false): AR<boolean, InternalError> {
    return this.existsBucket(bucket)
      .onOk((exists) => {
        if (!exists) {
          return OKA(true);
        }
        return this.send<GetBucketVersioningCommandOutput>(new GetBucketVersioningCommand({ Bucket: bucket })).onOk((o) => {
          let deleteObjectsCommandSend: AR<S3DeleteObjectsOutput, NeverError | S3Errors<'bucket_not_exist'>> = OKA(null);
          if (force) {
            const versioning = o.Status === 'Enabled';
            deleteObjectsCommandSend = versioning ? this.deleteObjectsVersions(bucket, 'all') : this.deleteObjects(bucket, 'all');
          }

          const command = new DeleteBucketCommand({ Bucket: bucket });
          return deleteObjectsCommandSend.onOk(() => this.send<DeleteBucketCommandOutput>(command));
        });
      })
      .onErr((e) => {
        if (e.isInternalError() && e.error instanceof S3ServiceException && e.error['$metadata'].httpStatusCode === 404) {
          return true;
        }

        return ERR(e);
      })
      .mapToTrue();
  }

  public listBuckets(): AR<S3ListBucketsOutput, InternalError> {
    const command = new ListBucketsCommand({});
    return this.send<ListBucketsCommandOutput>(command).onOk((o) => {
      return new S3ListBucketsOutput(
        o.Buckets.filter((v) => v.Name.startsWith(this.bucketPrefix)).map((v) => v.Name.substring(this.bucketPrefix.length)),
        o,
      );
    });
  }

  public listBucketsName(): AR<string[], InternalError> {
    return this.listBuckets().onOk((o) => o.getNames());
  }

  /**
   * Retrieves an object as string from the S3 bucket.
   * @param key - The key of the object to retrieve.
   * @param options - Optional parameters including versionId.
   * @returns A readable stream of the object if successful.
   */
  public getObjectAsString(
    id: S3ObjectId,
    options?: GetObjectOptions & GetObjectAsStringOptions,
  ): AR<string, S3ErrorObjectOrBucketNotExist | S3Errors<'empty_body'>> {
    return this.getObject(id, options).onOk((o) => o.getAsString(options?.encoding));
  }

  /**
   * Retrieves an object as stream from the S3 bucket.
   * @param key - The key of the object to retrieve.
   * @param options - Optional parameters including versionId.
   * @returns A readable stream of the object if successful.
   */
  public getObjectAsStream(id: S3ObjectId, options?: GetObjectOptions): AR<ReadableStream, S3ErrorObjectOrBucketNotExist | S3Errors<'empty_body'>> {
    return this.getObject(id, options).onOk((o) => o.getAsStream());
  }

  public getObject(id: S3ObjectId, options?: GetObjectOptions): AR<S3GetObjectOutput, S3Errors<'object_not_exist'>> {
    const command = new GetObjectCommand({
      Bucket: id.bucket,
      Key: id.key,
      VersionId: id.versionId,
      IfMatch: options?.ifMatch,
      IfNoneMatch: options?.ifNoneMatch,
      IfModifiedSince: options?.ifModifiedSince ? options.ifModifiedSince.toNativeDate() : undefined,
      IfUnmodifiedSince: options?.ifUnmodifiedSince ? options.ifUnmodifiedSince.toNativeDate() : undefined,
    });

    return this.send<GetObjectCommandOutput>(command)
      .onOk((o) => {
        return new S3GetObjectOutput(id, o);
      })
      .onErr((e) => {
        if (e.error instanceof NoSuchKey) {
          return ERR(S3Errors.object_not_exist, 404, { id });
        }
      });
  }

  public putObject(
    id: S3ObjectId,
    body: NodeJsRuntimeStreamingBlobPayloadInputTypes,
    options?: S3PutObjectOptions,
  ): AR<S3PutObjectOutput, S3Errors<'bucket_not_exist'>> {
    const command = new PutObjectCommand({
      Bucket: id.bucket,
      Key: id.key,
      Body: body,
      ContentType: options?.contentType,
      ContentDisposition: options?.contentDisposition,
      ContentLanguage: options?.contentLanguage,
      Metadata: options?.metadata,
      StorageClass: options?.storageClass,
      ObjectLockMode: options?.objectLockMode,
      SSEKMSKeyId: options?.sseKMSKeyId,
      
    });

    return this.send<PutObjectCommandOutput>(command).onOk((o) => {
      return new S3PutObjectOutput(id, o);
    });
  }

  public listObjects(bucket: string, prefix?: string, maxKeys = 50): S3ListObjectsOutput {
    return new S3ListObjectsOutput(this, { bucket, prefix, maxKeys });
  }

  public listObjectsVersions(bucket: string, prefix?: string, maxKeys = 50): S3ListObjectsVersionsOutput {
    return new S3ListObjectsVersionsOutput(this, { bucket, prefix, maxKeys });
  }

  public deleteObjects(bucket: string, prefix: string | 'all'): AR<S3DeleteObjectsOutput, S3Errors<'bucket_not_exist'>> {
    return ARW(
      (async () => {
        prefix = prefix === 'all' ? undefined : prefix;

        for await (const r of this.listObjects(bucket, prefix).toDelete()) {
          if (r.isError()) {
            return r as any;
          }

          if (r.v.length === 0) {
            break;
          }

          const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: r.v },
          });
          const deleteResult = await this.send(deleteCommand);
          if (deleteResult.isError()) {
            return deleteResult as any;
          }
        }

        return OKA(new S3DeleteObjectsOutput(bucket, prefix));
      })(),
    );
  }

  public deleteObjectsVersions(bucket: string, prefix: string | 'all'): AR<S3DeleteObjectsOutput, S3Errors<'bucket_not_exist'>> {
    return ARW(
      (async () => {
        prefix = prefix === 'all' ? undefined : prefix;
        for await (const r of this.listObjectsVersions(bucket, prefix).toDelete()) {
          if (r.isError()) {
            return r as any;
          }

          if (r.v.length === 0) {
            break;
          }

          const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: r.v },
          });

          const deleteResult = await this.send(deleteCommand);
          if (deleteResult.isError()) {
            return deleteResult as any;
          }
        }

        return OKA(new S3DeleteObjectsOutput(bucket, prefix));
      })(),
    );
  }

  public deleteObject(id: S3ObjectId): AR<S3DeleteObjectOutput, S3Errors<'bucket_not_exist'>> {
    const command = new DeleteObjectCommand({
      Bucket: id.bucket,
      Key: id.key,
      VersionId: id.versionId,
    });

    return this.send<DeleteObjectCommandOutput>(command).onOk((o) => new S3DeleteObjectOutput(id, o));
  }

  public send<R>(command: any): AR<R, InternalError> {
    command.input.Bucket = command.input.Bucket ? this.appendBucketPrefix(command.input.Bucket) : command.input.Bucket;
    return P(this.client.send(command as any)) as any;
  }

  protected appendBucketPrefix(bucket: string): string {
    return this.bucketPrefix + bucket;
  }
}
