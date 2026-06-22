'use strict';

// globalSetup runs in Jest's main process, which already has ts-node registered
// with the project tsconfig (that contains resolvePackageJsonExports).
// Spawning a fresh child process avoids that conflict entirely.
const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  execFileSync(
    process.execPath,
    [
      '-e',
      `
      require('ts-node').register({
        project: '${path.join(__dirname, 'tsconfig.jest.json')}',
        transpileOnly: true,
      });
      require('reflect-metadata');
      require('dotenv').config();
      const { TestDataSource } = require('./src/database/data-source.test');
      TestDataSource.initialize()
        .then(() => TestDataSource.destroy())
        .then(() => console.log('[Test] tcc_db_test schema synchronized'))
        .catch((e) => { console.error(e); process.exit(1); });
      `,
    ],
    { stdio: 'inherit', cwd: __dirname },
  );
};
