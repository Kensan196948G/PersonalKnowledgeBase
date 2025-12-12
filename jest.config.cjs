/** @type {import('jest').Config} */
const config = {
  // プロジェクト設定
  projects: [
    // バックエンドテスト
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/backend/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.backend.json',
          useESM: true,
        }],
      },
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    // フロントエンドテスト
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
          useESM: true,
        }],
      },
      extensionsToTreatAsEsm: ['.ts', '.tsx'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
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
