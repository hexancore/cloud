import 'reflect-metadata';
import { AppMeta, EnvAppMetaProvider } from '@hexancore/common';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import '@hexancore/common/testutil';

process.env['APP_ENV'] = 'test';
process.env['APP_ID'] = 'core';
AppMeta.setProvider(EnvAppMetaProvider);

process.env['TEST_TMP_DIR'] = path.join(__dirname, 'tmp');
if (!existsSync(process.env['TEST_TMP_DIR'])) {
  mkdirSync(process.env['TEST_TMP_DIR']);
}

process.on('unhandledRejection', (err) => {
  console.log(err);
});
