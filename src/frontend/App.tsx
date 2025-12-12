import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Personal Knowledge Base
            </h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function HomePage() {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        ようこそ！
      </h2>
      <p className="text-gray-600 mb-8">
        個人向けナレッジベースシステムへようこそ。
        <br />
        開発環境のセットアップが完了しました。
      </p>
      <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
        <h3 className="font-semibold mb-2">次のステップ</h3>
        <ul className="text-left text-sm text-gray-600 space-y-1">
          <li>✓ 開発環境セットアップ完了</li>
          <li>→ メモ機能の実装</li>
          <li>→ エディタ機能の実装</li>
          <li>→ 検索機能の実装</li>
        </ul>
      </div>
    </div>
  )
}

export default App
