// Jest セットアップファイル
import "@testing-library/jest-dom";
import { config } from "dotenv";

// .envファイルから環境変数を読み込む
config({ path: ".env" });

// DATABASE_URLが設定されていない場合はデフォルト値を設定
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:../data/knowledge.db";
}

// Vite の import.meta.env をモック
globalThis.import = {
  meta: {
    env: {
      VITE_API_BASE_URL: "http://localhost:3001",
      MODE: "test",
      DEV: false,
      PROD: false,
      SSR: false,
    },
  },
} as ImportMeta & { meta: { env: Record<string, unknown> } };

// グローバルモック（必要に応じて追加）
beforeAll(() => {
  // テスト開始前の共通処理
});

afterAll(() => {
  // テスト終了後の共通処理
});

// コンソールエラーをテストで捕捉
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // React の act() 警告を抑制（必要に応じて）
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render is no longer supported")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
