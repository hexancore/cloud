import { ERR, OK, R } from '@hexancore/common';
import { S3Errors } from './S3Errors';
import path from 'path';

export class S3ObjectId {
  public constructor(public readonly bucket: string, public readonly key: string, public readonly versionId?: string) {}

  public static c(bucket: string, key: string, versionId?: string): R<S3ObjectId, S3Errors<'object_key_is_not_file', 'never_internal'>> {
    return path.extname(key) !== '' ? OK(new S3ObjectId(bucket, key, versionId)) : ERR(S3Errors.object_key_is_not_file);
  }

  public static cs(bucket: string, key: string, versionId?: string): S3ObjectId {
    return new S3ObjectId(bucket, key, versionId);
  }
}
