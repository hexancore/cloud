import { ObjectStorageClass, _Object } from '@aws-sdk/client-s3';
import { DateTime } from '@hexancore/common';

export class S3ObjectMeta {
  public constructor(public readonly o: _Object) {}

  public get key(): string {
    return this.o.Key!;
  }

  public get lastModifiedAt(): DateTime {
    return DateTime.cs(this.o.LastModified!);
  }

  public get storageClass(): ObjectStorageClass {
    return this.o.StorageClass!;
  }
  public get size(): number {
    return this.o.Size!;
  }
}
