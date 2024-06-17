import { DeleteMarkerEntry, ObjectVersion } from '@aws-sdk/client-s3';
import { DateTime } from '@hexancore/common';

export class S3ObjectVersionMeta {
  public constructor(public readonly v: ObjectVersion | DeleteMarkerEntry, public readonly isDeleteMarker: boolean) {}

  public get versionId(): string {
    return this.v.VersionId!;
  }

  public get key(): string {
    return this.v.Key!;
  }

  public get lastModifiedAt(): DateTime {
    return DateTime.cs(this.v.LastModified!);
  }

  public get isLatest(): boolean {
    return this.v.IsLatest!;
  }
  public get size(): number {
    return this.isDeleteMarker ? 0 : (this.v as ObjectVersion).Size!;
  }
}
