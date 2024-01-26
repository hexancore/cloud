import { GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { S3ObjectId } from '../../S3ObjectId';
import { AR, ERR, ERRA, OK, P, R } from '@hexancore/common';
import { S3Errors } from '../../S3Errors';

export class S3GetObjectOutput {
  public constructor(public readonly id: S3ObjectId, private o: GetObjectCommandOutput) {}

  public hasBody(): boolean {
    return this.o.Body !== undefined;
  }

  public getAsString(encoding?: BufferEncoding): AR<string, S3Errors<'empty_body'>> {
    if (this.o.Body) {
      return P(this.o.Body.transformToString(encoding));
    } else {
      return ERRA(S3Errors.empty_body);
    }
  }

  public getAsStream(): R<ReadableStream, S3Errors<'empty_body'>> {
    if (this.o.Body) {
      return OK(this.o.Body.transformToWebStream());
    } else {
      return ERR(S3Errors.empty_body);
    }
  }
}
