import { ListObjectVersionsCommand, ListObjectVersionsCommandOutput } from '@aws-sdk/client-s3';
import { R, OK } from '@hexancore/common';
import { S3 } from '../../S3';
import { S3ObjectVersionMeta } from '../S3ObjectVersionMeta';

export class S3ListObjectsVersionsOutput {
  public constructor(private s3: S3, private options: { bucket: string; prefix?: string; maxKeys: number }) {}

  public async *versions(includeDeleteMarkers = false): AsyncGenerator<R<S3ObjectVersionMeta[]>, void, unknown> {
    const bucket = this.options.bucket;
    const prefix = this.options.prefix;
    const maxKeys = this.options.maxKeys;
    let nextKeyMarker;
    let nextVersionIdMarker;
    while (true) {
      const command = new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        KeyMarker: nextKeyMarker,
        VersionIdMarker: nextVersionIdMarker,
      });

      const objectsResult = await this.s3.send<ListObjectVersionsCommandOutput>(command);
      if (objectsResult.isError()) {
        return objectsResult as any;
      }

      const versions = objectsResult.v.Versions ? objectsResult.v.Versions.map((v) => new S3ObjectVersionMeta(v, false)) : [];
      const deleteMarkers =
        includeDeleteMarkers && objectsResult.v.DeleteMarkers ? objectsResult.v.DeleteMarkers.map((v) => new S3ObjectVersionMeta(v, true)) : [];

      yield OK([...versions, ...deleteMarkers]);

      if (objectsResult.v.IsTruncated) {
        nextKeyMarker = objectsResult.v.NextKeyMarker;
        nextVersionIdMarker = objectsResult.v.NextVersionIdMarker;
      } else {
        break;
      }
    }
  }

  public async *toDelete(): AsyncGenerator<R<{ Key: string; VersionId: string }[]>, void, unknown> {
    for await (const r of this.versions(true)) {
      yield r.onOk((list) => list.map((v) => ({ Key: v.key, VersionId: v.versionId })));
    }
  }
}
