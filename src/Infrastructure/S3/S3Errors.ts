import { DefineErrorsUnion } from '@hexancore/common';

export const S3Errors = {
  empty_body: 'core.infra.s3.empty_body',
  bucket_exist: 'core.cloud.infra.s3.bucket_exist',
  bucket_not_exist: 'core.cloud.infra.s3.bucket_not_exist',
  object_key_is_not_file: 'core.cloud.infra.s3.object_key_is_not_file',
  object_not_exist: 'core.cloud.infra.s3.object_not_exist',
  empty_key_prefix: 'core.cloud.infra.s3.empty_object_prefix',
} as const;
export type S3Errors<K extends keyof typeof S3Errors, internal extends 'internal' | 'never_internal' = 'internal'> = DefineErrorsUnion<
  typeof S3Errors,
  K,
  internal
>;

export type S3ErrorObjectOrBucketNotExist = S3Errors<'bucket_not_exist' | 'object_not_exist'>;
