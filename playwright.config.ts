import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2Eテスト設定
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // 並列実行を有効化
  fullyParallel: true,

  // CI環境では.only()を禁止
  forbidOnly: !!process.env.CI,

  // CI環境ではリトライ2回、ローカルではリトライなし
  retries: process.env.CI ? 2 : 0,

  // CI環境ではワーカー1、ローカルではCPU数に応じて自動
  workers: process.env.CI ? 1 : undefined,

  // HTMLレポーター
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // グローバル設定
  use: {
    // ベースURL（開発サーバー）
    baseURL: 'http://192.168.0.187:5173',

    // 失敗時のトレース
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ（失敗時のみ）
    video: 'retain-on-failure',

    // ブラウザコンテキストのタイムアウト（30秒）
    actionTimeout: 30000,

    // ナビゲーションのタイムアウト（30秒）
    navigationTimeout: 30000,
  },

  // テストプロジェクト（ブラウザ）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 必要に応じて他のブラウザも追加可能
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // 開発サーバーの起動設定
  webServer: {
    command: 'npm run dev',
    url: 'http://192.168.0.187:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2分
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
