// バックエンド ノートAPI テスト
describe('Notes API', () => {
  const API_URL = 'http://localhost:3000'
  let createdNoteId: string

  describe('POST /api/notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        title: 'テストノート',
        content: 'これはテスト用のノートです。',
      }

      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteData),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.id).toBeDefined()
      expect(data.title).toBe(noteData.title)
      expect(data.content).toBe(noteData.content)

      createdNoteId = data.id
    })

    it('should create note with default title when not provided', async () => {
      const response = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.title).toBe('無題のノート')
    })
  })

  describe('GET /api/notes', () => {
    it('should return array of notes', async () => {
      const response = await fetch(`${API_URL}/api/notes`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('GET /api/notes/:id', () => {
    it('should return a specific note', async () => {
      if (!createdNoteId) {
        console.log('Skipping: No note created')
        return
      }

      const response = await fetch(`${API_URL}/api/notes/${createdNoteId}`)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(createdNoteId)
    })

    it('should return 404 for non-existent note', async () => {
      const response = await fetch(`${API_URL}/api/notes/non-existent-id`)

      expect(response.status).toBe(404)
    })
  })

  describe('PUT /api/notes/:id', () => {
    it('should update a note', async () => {
      if (!createdNoteId) {
        console.log('Skipping: No note created')
        return
      }

      const updateData = {
        title: '更新されたタイトル',
        content: '更新された内容',
      }

      const response = await fetch(`${API_URL}/api/notes/${createdNoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe(updateData.title)
      expect(data.content).toBe(updateData.content)
    })
  })

  describe('DELETE /api/notes/:id', () => {
    it('should delete a note', async () => {
      if (!createdNoteId) {
        console.log('Skipping: No note created')
        return
      }

      const response = await fetch(`${API_URL}/api/notes/${createdNoteId}`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(204)
    })
  })
})
