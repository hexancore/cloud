import { S3Client } from '@aws-sdk/client-s3';
import { AppConfig } from '@hexancore/core';
import { ConfigurableModuleBuilder, InjectionToken, Module, OnApplicationShutdown, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { S3 } from './S3';

const s3ClientProviderFactory = (s3ClientToken: InjectionToken, configPath?: string): Provider => ({
  provide: s3ClientToken,
  inject: [AppConfig],
  useFactory: (c: AppConfig) => {
    configPath = configPath ?? 'core.s3';
    const secretKey: string = c.config.get(configPath + '.secretKey', 'core.s3');
    const credsResult = c.secrets.getFromJson<{ accessKeyId: string; secretAccessKey: string }>(secretKey);
    credsResult.panicIfError();
    const creds = credsResult.v;

    return new S3Client({
      region: c.config.get(configPath + '.region'),
      endpoint: c.config.get(configPath + '.endpoint'),
      credentials: {
        accessKeyId: creds.accessKeyId ?? '',
        secretAccessKey: creds.secretAccessKey ?? '',
      },
      retryMode: 'adaptive',
      maxAttempts: 5,
      

    });
  },
});

export interface S3ModuleOptions {}

const INTERNAL_MODULE_S3_CLIENT_TOKEN = '__HC_S3_CLIENT';

const { ConfigurableModuleClass } = new ConfigurableModuleBuilder<S3ModuleOptions>()
  .setClassMethodName('forRoot')
  .setExtras({ global: true, s3ClientToken: S3Client, configPath: 'core.s3' }, (def, extras) => {
    def.providers = def.providers ?? [];
    def.exports = def.exports ?? [];

    def.providers.push({
      provide: INTERNAL_MODULE_S3_CLIENT_TOKEN,
      useExisting: extras.s3ClientToken,
    });

    def.providers.push(s3ClientProviderFactory(extras.s3ClientToken, extras.configPath));
    def.exports.push(extras.s3ClientToken);

    def.providers.push({
      provide: S3,
      inject: [extras.s3ClientToken, AppConfig],
      useFactory: (client: S3Client, c: AppConfig) => new S3(client, c.config.get(extras.configPath + '.bucketPrefix', '')),
    });

    def.exports.push(S3);

    def.global = extras.global;
    return def;
  })
  .build();

@Module({})
export class HcS3Module extends ConfigurableModuleClass implements OnApplicationShutdown {
  public constructor(private ref: ModuleRef) {
    super();
  }

  public onApplicationShutdown(_signal?: string | undefined): void {
    this.ref.get<S3Client>(INTERNAL_MODULE_S3_CLIENT_TOKEN).destroy();
  }
}
