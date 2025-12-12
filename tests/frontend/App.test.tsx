// フロントエンド App テスト
import { render, screen } from '@testing-library/react'
import App from '../../src/frontend/App'

describe('App Component', () => {
  it('should render the app title', () => {
    render(<App />)

    expect(screen.getByText('Personal Knowledge Base')).toBeInTheDocument()
  })

  it('should render welcome message', () => {
    render(<App />)

    expect(screen.getByText('ようこそ！')).toBeInTheDocument()
  })

  it('should render next steps section', () => {
    render(<App />)

    expect(screen.getByText('次のステップ')).toBeInTheDocument()
  })
})
