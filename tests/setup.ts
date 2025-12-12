// Jest セットアップファイル
import '@testing-library/jest-dom'

// グローバルモック（必要に応じて追加）
beforeAll(() => {
  // テスト開始前の共通処理
})

afterAll(() => {
  // テスト終了後の共通処理
})

// コンソールエラーをテストで捕捉
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // React の act() 警告を抑制（必要に応じて）
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
