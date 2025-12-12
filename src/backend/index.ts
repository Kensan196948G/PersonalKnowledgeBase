import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// 環境変数読み込み
config()

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

// ミドルウェア
app.use(cors())
app.use(express.json())

// ヘルスチェック
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    })
  }
})

// ノート一覧取得
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        tags: {
          include: { tag: true },
        },
        folder: true,
      },
    })
    res.json(notes)
  } catch (error) {
    console.error('Error fetching notes:', error)
    res.status(500).json({ error: 'Failed to fetch notes' })
  }
})

// ノート作成
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, folderId } = req.body
    const note = await prisma.note.create({
      data: {
        title: title || '無題のノート',
        content: content || '',
        folderId,
      },
    })
    res.status(201).json(note)
  } catch (error) {
    console.error('Error creating note:', error)
    res.status(500).json({ error: 'Failed to create note' })
  }
})

// ノート取得（単一）
app.get('/api/notes/:id', async (req, res) => {
  try {
    const note = await prisma.note.findUnique({
      where: { id: req.params.id },
      include: {
        tags: {
          include: { tag: true },
        },
        folder: true,
        attachments: true,
      },
    })
    if (!note) {
      return res.status(404).json({ error: 'Note not found' })
    }
    res.json(note)
  } catch (error) {
    console.error('Error fetching note:', error)
    res.status(500).json({ error: 'Failed to fetch note' })
  }
})

// ノート更新
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { title, content, isPinned, isFavorite, isArchived, folderId } = req.body
    const note = await prisma.note.update({
      where: { id: req.params.id },
      data: {
        title,
        content,
        isPinned,
        isFavorite,
        isArchived,
        folderId,
      },
    })
    res.json(note)
  } catch (error) {
    console.error('Error updating note:', error)
    res.status(500).json({ error: 'Failed to update note' })
  }
})

// ノート削除
app.delete('/api/notes/:id', async (req, res) => {
  try {
    await prisma.note.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting note:', error)
    res.status(500).json({ error: 'Failed to delete note' })
  }
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`)
  console.log(`📚 API documentation: http://localhost:${PORT}/api/health`)
})

// グレースフルシャットダウン
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...')
  await prisma.$disconnect()
  process.exit(0)
})
