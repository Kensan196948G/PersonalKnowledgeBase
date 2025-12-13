import { useState } from 'react'
import { MainLayout } from './components/Layout/MainLayout'
import { Header } from './components/Layout/Header'
import { NoteList } from './components/NoteList'
import { TipTapEditor } from './components/Editor'
import { ToastContainer } from './components/UI/ToastContainer'
import { useNotes } from './hooks/useNotes'

function App() {
  const { selectedNote, createNote, updateNote } = useNotes()
  const [editorContent, setEditorContent] = useState('')
  const [editorTitle, setEditorTitle] = useState('')

  // ノート選択時にエディタを更新
  const handleNoteSelect = (noteId: string | null) => {
    if (noteId && selectedNote) {
      setEditorTitle(selectedNote.title)
      setEditorContent(selectedNote.content)
    }
  }

  // 新規ノート作成
  const handleNewNote = async () => {
    const newNote = await createNote({
      title: '無題のノート',
      content: '',
    })
    setEditorTitle(newNote.title)
    setEditorContent(newNote.content)
  }

  // エディタ内容変更時の自動保存（デバウンス）
  const handleEditorChange = (html: string) => {
    setEditorContent(html)

    // 選択中のノートがあれば自動保存
    if (selectedNote) {
      // デバウンス処理は後で実装（今はシンプルに即時更新）
      updateNote(selectedNote.id, { content: html })
    }
  }

  // タイトル変更時の保存
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setEditorTitle(newTitle)

    if (selectedNote) {
      updateNote(selectedNote.id, { title: newTitle })
    }
  }

  return (
    <>
      {/* トースト通知 */}
      <ToastContainer />

      {/* メインレイアウト */}
      <MainLayout
        header={
          <Header
            title="Personal Knowledge Base"
            onNewNote={handleNewNote}
          />
        }
        sidebar={
          <NoteList
            onNoteSelect={handleNoteSelect}
            selectedNoteId={selectedNote?.id || null}
          />
        }
        editor={
          selectedNote ? (
            <div className="h-full flex flex-col p-6">
              {/* タイトル入力 */}
              <input
                type="text"
                value={editorTitle}
                onChange={handleTitleChange}
                placeholder="無題のノート"
                className="
                  text-3xl font-bold mb-4 px-2 py-1
                  border-b-2 border-transparent
                  focus:border-blue-500 focus:outline-none
                  transition-colors
                "
              />

              {/* エディタ */}
              <div className="flex-1 overflow-auto">
                <TipTapEditor
                  content={editorContent}
                  onChange={handleEditorChange}
                  placeholder="ここにメモを入力してください..."
                  className="border-none shadow-none"
                />
              </div>

              {/* メタ情報 */}
              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 flex items-center gap-4">
                <span>作成: {new Date(selectedNote.createdAt).toLocaleString('ja-JP')}</span>
                <span>更新: {new Date(selectedNote.updatedAt).toLocaleString('ja-JP')}</span>
                {selectedNote.isPinned && <span className="text-yellow-600">📌 ピン留め</span>}
                {selectedNote.isFavorite && <span className="text-red-600">⭐ お気に入り</span>}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
              <svg className="w-24 h-24 mb-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-xl font-medium text-gray-700 mb-2">
                ノートを選択してください
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                左のリストからノートを選択するか、新しいノートを作成してください
              </p>
              <button
                onClick={handleNewNote}
                className="
                  px-6 py-3
                  bg-blue-600 text-white rounded-lg
                  hover:bg-blue-700 transition-colors
                  font-medium
                  flex items-center gap-2
                "
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しいノートを作成
              </button>
            </div>
          )
        }
      />
    </>
  )
}

export default App
