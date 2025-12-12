// バックエンド ヘルスチェック テスト
describe('Backend Health Check', () => {
  const API_URL = 'http://localhost:3000'

  describe('GET /api/health', () => {
    it('should return status ok when server is running', async () => {
      const response = await fetch(`${API_URL}/api/health`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('ok')
      expect(data.database).toBe('connected')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('API Response Format', () => {
    it('should return JSON content type', async () => {
      const response = await fetch(`${API_URL}/api/health`)
      const contentType = response.headers.get('content-type')

      expect(contentType).toContain('application/json')
    })
  })
})
