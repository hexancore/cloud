import { PutObjectCommandOutput } from '@aws-sdk/client-s3';
import { S3ObjectId } from '../../S3ObjectId';
import { LogicError } from '@hexancore/common/lib/mjs';

export class S3PutObjectOutput {
  public constructor(public readonly id: S3ObjectId, private o: PutObjectCommandOutput) {}

  public get versionId(): string {
    if (!this.o.VersionId) {
      throw new LogicError("Can't get S3PutObjectOutput.versionId in not versioned bucket");
    }
    return this.o.VersionId;
  }
}
