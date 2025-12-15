/** @type {import('jest').Config} */
const config = {
  // プロジェクト設定
  rootDir: process.cwd(),
  projects: [
    // バックエンドテスト
    {
      displayName: 'backend',
      testEnvironment: 'node',
      rootDir: process.cwd(),
      testMatch: ['**/tests/backend/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.backend.json',
          useESM: true,
        }],
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': process.cwd() + '/src/$1',
      },
      setupFilesAfterEnv: [process.cwd() + '/tests/setup.ts'],
    },
    // フロントエンドテスト
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      rootDir: process.cwd(),
      testMatch: ['**/tests/frontend/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: true,
        }],
      },
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': process.cwd() + '/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      setupFilesAfterEnv: [process.cwd() + '/tests/setup.ts'],
    },
  ],

  // カバレッジ設定
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // その他
  verbose: true,
  clearMocks: true,
}

module.exports = config
