import { ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { R, OK, AR, AsyncResult } from '@hexancore/common';
import { S3 } from '../../S3';
import { S3ObjectMeta } from '../S3ObjectMeta';

export class S3ListObjectsOutput {
  public constructor(private s3: S3, private options: { bucket: string; prefix: string; maxKeys?: number }) {}

  public async *keys(): AsyncGenerator<R<string[]>, void, unknown> {
    for await (const r of this.objects()) {
      yield r.onOk((list) => list.map((m) => m.key));
    }
  }

  public keysAsArray(): AR<string[]> {
    return new AsyncResult(
      (async () => {
        let list: string[] = [];
        for await (const r of this.keys()) {
          if (r.isError()) {
            return r;
          }

          list = list.concat(r.v);
        }
        return OK(list);
      })(),
    );
  }

  public async *objects(): AsyncGenerator<R<S3ObjectMeta[]>, void, unknown> {
    const bucket = this.options.bucket;
    const prefix = this.options.prefix;
    const maxKeys = this.options.maxKeys ?? 100;
    let continuationToken;

    while (true) {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      });

      const objectsResult = await this.s3.send<ListObjectsV2CommandOutput>(command);
      if (objectsResult.isError()) {
        return objectsResult as any;
      }

      if (!objectsResult.v.Contents || objectsResult.v.Contents.length === 0) {
        break;
      }

      yield OK(objectsResult.v.Contents.map((o) => new S3ObjectMeta(o)));

      if (objectsResult.v.IsTruncated || objectsResult.v.NextContinuationToken) {
        continuationToken = objectsResult.v.NextContinuationToken;
      } else {
        break;
      }
    }
  }

  public async *toDelete(): AsyncGenerator<R<{ Key: string }[]>, void, unknown> {
    for await (const r of this.objects()) {
      yield r.onOk((list) => list.map((v) => ({ Key: v.key })));
    }
  }
}
