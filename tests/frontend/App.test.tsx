// フロントエンド App テスト
import { render, screen, within } from '@testing-library/react'
import App from '../../src/frontend/App'

describe('App Component', () => {
  describe('ヘッダー', () => {
    it('アプリタイトルが表示される', () => {
      render(<App />)
      expect(screen.getByText('Personal Knowledge Base')).toBeInTheDocument()
    })

    it('ヘッダーがh1要素で表示される', () => {
      render(<App />)
      const header = screen.getByRole('heading', { level: 1 })
      expect(header).toHaveTextContent('Personal Knowledge Base')
    })
  })

  describe('ホームページ', () => {
    it('ようこそメッセージが表示される', () => {
      render(<App />)
      expect(screen.getByText('ようこそ！')).toBeInTheDocument()
    })

    it('説明文が表示される', () => {
      render(<App />)
      expect(screen.getByText(/個人向けナレッジベースシステムへようこそ/)).toBeInTheDocument()
    })

    it('開発環境セットアップ完了メッセージが表示される', () => {
      render(<App />)
      expect(screen.getByText(/開発環境のセットアップが完了しました/)).toBeInTheDocument()
    })
  })

  describe('次のステップセクション', () => {
    it('次のステップタイトルが表示される', () => {
      render(<App />)
      expect(screen.getByText('次のステップ')).toBeInTheDocument()
    })

    it('開発環境セットアップ完了が表示される', () => {
      render(<App />)
      expect(screen.getByText(/開発環境セットアップ完了/)).toBeInTheDocument()
    })

    it('メモ機能の実装項目が表示される', () => {
      render(<App />)
      expect(screen.getByText(/メモ機能の実装/)).toBeInTheDocument()
    })

    it('エディタ機能の実装項目が表示される', () => {
      render(<App />)
      expect(screen.getByText(/エディタ機能の実装/)).toBeInTheDocument()
    })

    it('検索機能の実装項目が表示される', () => {
      render(<App />)
      expect(screen.getByText(/検索機能の実装/)).toBeInTheDocument()
    })
  })

  describe('レイアウト構造', () => {
    it('メインコンテンツエリアが存在する', () => {
      render(<App />)
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
    })

    it('バナーヘッダーが存在する', () => {
      render(<App />)
      const banner = screen.getByRole('banner')
      expect(banner).toBeInTheDocument()
    })
  })

  describe('スタイリング', () => {
    it('アプリがmin-h-screenクラスを持つ', () => {
      render(<App />)
      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()
    })

    it('カードがshadowクラスを持つ', () => {
      render(<App />)
      const card = document.querySelector('.shadow')
      expect(card).toBeInTheDocument()
    })
  })
})

describe('ルーティング', () => {
  it('ルートパスでホームページが表示される', () => {
    render(<App />)
    expect(screen.getByText('ようこそ！')).toBeInTheDocument()
  })
})
