/**
 * ノート状態管理 (Zustand Store)
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Note } from '../types/note'

interface NoteStore {
  // 状態
  notes: Note[]
  selectedNoteId: string | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  sortBy: 'updatedAt' | 'createdAt' | 'title'
  sortOrder: 'asc' | 'desc'

  // アクション
  fetchNotes: () => Promise<void>
  fetchNoteById: (id: string) => Promise<Note | null>
  createNote: (data?: Partial<Note>) => Promise<Note>
  updateNote: (id: string, data: Partial<Note>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
  selectNote: (id: string | null) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: 'updatedAt' | 'createdAt' | 'title') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  clearError: () => void

  // セレクター（computed values）
  getSelectedNote: () => Note | null
  getFilteredNotes: () => Note[]
}

// APIベースURL（環境変数またはデフォルト）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

export const useNoteStore = create<NoteStore>()(
  devtools(
    persist(
      (set, get) => ({
        // 初期状態
        notes: [],
        selectedNoteId: null,
        isLoading: false,
        error: null,
        searchQuery: '',
        sortBy: 'updatedAt',
        sortOrder: 'desc',

        // ノート一覧取得
        fetchNotes: async () => {
          set({ isLoading: true, error: null })
          try {
            const { sortBy, sortOrder, searchQuery } = get()
            const params = new URLSearchParams()
            params.append('sortBy', sortBy)
            params.append('order', sortOrder)
            if (searchQuery) {
              params.append('search', searchQuery)
            }

            const response = await fetch(`${API_BASE_URL}/api/notes?${params}`)
            if (!response.ok) {
              throw new Error(`Failed to fetch notes: ${response.statusText}`)
            }

            const result = await response.json()
            set({
              notes: result.data || [],
              isLoading: false,
              error: null
            })
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false
            })
          }
        },

        // 単一ノート取得
        fetchNoteById: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${id}`)
            if (!response.ok) {
              if (response.status === 404) {
                throw new Error('Note not found')
              }
              throw new Error(`Failed to fetch note: ${response.statusText}`)
            }

            const result = await response.json()
            const note = result.data

            // キャッシュ更新: 既存のノートを更新または追加
            set(state => {
              const existingIndex = state.notes.findIndex(n => n.id === note.id)
              const newNotes = [...state.notes]

              if (existingIndex >= 0) {
                newNotes[existingIndex] = note
              } else {
                newNotes.push(note)
              }

              return {
                notes: newNotes,
                isLoading: false,
                error: null
              }
            })

            return note
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false
            })
            return null
          }
        },

        // ノート作成
        createNote: async (data?: Partial<Note>) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`${API_BASE_URL}/api/notes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data || {}),
            })

            if (!response.ok) {
              throw new Error(`Failed to create note: ${response.statusText}`)
            }

            const result = await response.json()
            const newNote = result.data

            set(state => ({
              notes: [newNote, ...state.notes],
              selectedNoteId: newNote.id,
              isLoading: false,
              error: null
            }))

            return newNote
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false
            })
            throw error
          }
        },

        // ノート更新
        updateNote: async (id: string, data: Partial<Note>) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            })

            if (!response.ok) {
              throw new Error(`Failed to update note: ${response.statusText}`)
            }

            const result = await response.json()
            const updatedNote = result.data

            set(state => ({
              notes: state.notes.map(note =>
                note.id === id ? updatedNote : note
              ),
              isLoading: false,
              error: null
            }))
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false
            })
            throw error
          }
        },

        // ノート削除
        deleteNote: async (id: string) => {
          set({ isLoading: true, error: null })
          try {
            const response = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
              method: 'DELETE',
            })

            if (!response.ok) {
              throw new Error(`Failed to delete note: ${response.statusText}`)
            }

            set(state => ({
              notes: state.notes.filter(note => note.id !== id),
              selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
              isLoading: false,
              error: null
            }))
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false
            })
            throw error
          }
        },

        // ノート選択
        selectNote: (id: string | null) => {
          set({ selectedNoteId: id })
        },

        // 検索クエリ設定
        setSearchQuery: (query: string) => {
          set({ searchQuery: query })
        },

        // ソート方法設定
        setSortBy: (sortBy: 'updatedAt' | 'createdAt' | 'title') => {
          set({ sortBy })
        },

        // ソート順設定
        setSortOrder: (order: 'asc' | 'desc') => {
          set({ sortOrder: order })
        },

        // エラークリア
        clearError: () => {
          set({ error: null })
        },

        // セレクター: 選択中のノート取得
        getSelectedNote: () => {
          const { notes, selectedNoteId } = get()
          return notes.find(note => note.id === selectedNoteId) || null
        },

        // セレクター: フィルタ・ソート済みノート取得
        getFilteredNotes: () => {
          const { notes, searchQuery, sortBy, sortOrder } = get()

          // 検索フィルタ
          let filtered = notes
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            filtered = notes.filter(note =>
              note.title.toLowerCase().includes(query) ||
              note.content.toLowerCase().includes(query)
            )
          }

          // ソート
          const sorted = [...filtered].sort((a, b) => {
            let compareValue = 0

            if (sortBy === 'title') {
              compareValue = a.title.localeCompare(b.title)
            } else if (sortBy === 'createdAt') {
              compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            } else { // updatedAt
              compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
            }

            return sortOrder === 'asc' ? compareValue : -compareValue
          })

          // ピン留めを最上位に
          return sorted.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return 0
          })
        },
      }),
      {
        name: 'note-store',
        // 永続化する状態を選択（APIデータは除外）
        partialize: (state) => ({
          searchQuery: state.searchQuery,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          selectedNoteId: state.selectedNoteId,
        }),
      }
    ),
    { name: 'NoteStore' }
  )
)
