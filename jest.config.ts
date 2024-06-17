import { pathsToModuleNameMapper } from 'ts-jest'
import { compilerOptions } from './tsconfig.json'
import type { JestConfigWithTsJest } from 'ts-jest'

const jestConfig: JestConfigWithTsJest = {
  preset: "ts-jest",
  runner: "groups",
  roots: [__dirname],
  modulePaths: [__dirname],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {prefix: "<rootDir>"}),
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  setupFiles: [],
  setupFilesAfterEnv: ["jest-expect-message", "<rootDir>/test/config.ts"],
  coverageDirectory: "./test/coverage",
  testEnvironment: "node",

}

export default jestConfig

