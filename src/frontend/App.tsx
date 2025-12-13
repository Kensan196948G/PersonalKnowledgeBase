import { useState, useCallback, useRef, useEffect } from "react";
import { MainLayout } from "./components/Layout/MainLayout";
import { Header } from "./components/Layout/Header";
import { NoteList } from "./components/NoteList";
import { TipTapEditor } from "./components/Editor";
import { ToastContainer } from "./components/UI/ToastContainer";
import { useNotes } from "./hooks/useNotes";
import { useUIStore } from "./stores/uiStore";

function App() {
  const { selectedNote, createNote, updateNote } = useNotes();
  const { isSaving, setSaving } = useUIStore();
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");

  // デバウンスタイマー用ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ノート選択時にエディタを更新
  const handleNoteSelect = (noteId: string | null) => {
    if (noteId && selectedNote) {
      setEditorTitle(selectedNote.title);
      setEditorContent(selectedNote.content);
    }
  };

  // 新規ノート作成
  const handleNewNote = async () => {
    const newNote = await createNote({
      title: "無題のノート",
      content: "",
    });
    setEditorTitle(newNote.title);
    setEditorContent(newNote.content);
  };

  // エディタ内容変更時の自動保存（デバウンス1秒）
  const handleEditorChange = useCallback(
    (html: string) => {
      setEditorContent(html);

      // 既存のタイマーをクリア
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // 選択中のノートがあれば1秒後に保存
      if (selectedNote) {
        setSaving(true);

        saveTimeoutRef.current = setTimeout(async () => {
          try {
            await updateNote(selectedNote.id, { content: html });
            setSaving(false);
          } catch (error) {
            setSaving(false);
            console.error("Failed to save note content:", error);
          }
        }, 1000);
      }
    },
    [selectedNote, updateNote, setSaving],
  );

  // タイトル変更時の保存（デバウンス1秒）
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setEditorTitle(newTitle);

      // 既存のタイマーをクリア
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }

      // 選択中のノートがあれば1秒後に保存
      if (selectedNote) {
        setSaving(true);

        titleSaveTimeoutRef.current = setTimeout(async () => {
          try {
            await updateNote(selectedNote.id, { title: newTitle });
            setSaving(false);
          } catch (error) {
            setSaving(false);
            console.error("Failed to save note title:", error);
          }
        }, 1000);
      }
    },
    [selectedNote, updateNote, setSaving],
  );

  // クリーンアップ：コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* トースト通知 */}
      <ToastContainer />

      {/* メインレイアウト */}
      <MainLayout
        header={
          <Header title="Personal Knowledge Base" onNewNote={handleNewNote} />
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
                {/* 保存状態インジケーター */}
                <span className="flex items-center gap-1">
                  {isSaving ? (
                    <>
                      <svg
                        className="w-3 h-3 animate-spin text-blue-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="text-blue-600">保存中...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-3 h-3 text-green-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-green-600">保存済み</span>
                    </>
                  )}
                </span>
                <span>
                  作成:{" "}
                  {new Date(selectedNote.createdAt).toLocaleString("ja-JP")}
                </span>
                <span>
                  更新:{" "}
                  {new Date(selectedNote.updatedAt).toLocaleString("ja-JP")}
                </span>
                {selectedNote.isPinned && (
                  <span className="text-yellow-600">📌 ピン留め</span>
                )}
                {selectedNote.isFavorite && (
                  <span className="text-red-600">⭐ お気に入り</span>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
              <svg
                className="w-24 h-24 mb-6 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                新しいノートを作成
              </button>
            </div>
          )
        }
      />
    </>
  );
}

export default App;
