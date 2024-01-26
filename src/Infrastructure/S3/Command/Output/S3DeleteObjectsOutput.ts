export class S3DeleteObjectsOutput {
  public constructor(public readonly bucket: string, public readonly prefix: string) {}
}
