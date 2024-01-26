import { DateTime } from '.yalc/@hexancore/common/lib/mjs';

export interface GetObjectOptions {
  versionId?: string;
  ifMatch?: string;
  ifNoneMatch?: string;
  ifModifiedSince?: DateTime;
  ifUnmodifiedSince?: DateTime;
}

export type GetObjectOptionsWithoutVersion = Omit<GetObjectOptions, 'versionId'>;

export interface GetObjectAsStringOptions {
  encoding?: BufferEncoding;
}
