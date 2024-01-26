import { DeleteObjectCommandOutput } from '@aws-sdk/client-s3';
import { S3ObjectId } from '../../S3ObjectId';

export class S3DeleteObjectOutput {
  public constructor(public readonly id: S3ObjectId, private o: DeleteObjectCommandOutput) {}
}
