import { useState, useCallback, useRef, useEffect } from "react";
import { MainLayout } from "./components/Layout/MainLayout";
import { Header } from "./components/Layout/Header";
import { NoteList } from "./components/NoteList";
import { TipTapEditor } from "./components/Editor";
import { ToastContainer } from "./components/UI/ToastContainer";
import { TagSelector } from "./components/Tags/TagSelector";
import { TagFilterSidebar } from "./components/Tags/TagFilterSidebar";
import {
  FolderTree,
  FolderSelector,
  FolderCreateModal,
} from "./components/Folders";
import { SettingsModal } from "./components/Settings";
import { ImportModal } from "./components/Import";
import {
  BacklinkPanel,
  RelatedNotesWidget,
  OutgoingLinksPanel,
} from "./components/NoteLinks";
import { useNotes } from "./hooks/useNotes";
import { useUIStore } from "./stores/uiStore";
import { useTagStore } from "./stores/tagStore";
import { useFolderStore } from "./stores/folderStore";
import { useNoteStore } from "./stores/noteStore";
import type { Folder } from "./types/folder";
import { tiptapJsonToHtml } from "./utils/tiptap";

function App() {
  const { selectedNote, createNote, updateNote, selectNote, fetchNotes } =
    useNotes();
  const { isSaving, setSaving } = useUIStore();
  const { toggleTagSelection } = useTagStore();
  const { selectFolder } = useFolderStore();
  const { setSearchFolder } = useNoteStore();
  const [editorContent, setEditorContent] = useState("");
  const [editorTitle, setEditorTitle] = useState("");
  const [editorFolderId, setEditorFolderId] = useState<string | null>(null);

  // フォルダモーダル管理
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | undefined>(
    undefined,
  );
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);

  // 設定モーダル管理
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // インポートモーダル管理
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFolderId, setImportFolderId] = useState<string | null>(null);

  // デバウンスタイマー用ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const folderSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ノート選択時にストアを更新（API取得を含む）
  const handleNoteSelect = useCallback(
    async (noteId: string | null) => {
      console.log("handleNoteSelect called, noteId:", noteId);
      await selectNote(noteId);
    },
    [selectNote],
  );

  // selectedNoteが変更されたときにエディタを更新
  useEffect(() => {
    console.log("[App] ========== selectedNote useEffect triggered ==========");
    console.log(
      "[App] selectedNote changed:",
      selectedNote?.id,
      selectedNote?.title,
    );
    if (selectedNote) {
      console.log("[App] Setting editor content, title:", selectedNote.title);
      console.log(
        "[App] Content type:",
        typeof selectedNote.content,
        "length:",
        selectedNote.content.length,
      );
      console.log(
        "[App] Content preview:",
        selectedNote.content.substring(0, 100),
      );
      setEditorTitle(selectedNote.title);
      // TipTap JSON文字列をHTMLに変換
      try {
        const htmlContent = tiptapJsonToHtml(selectedNote.content);
        console.log("[App] Converted HTML length:", htmlContent.length);
        console.log("[App] HTML preview:", htmlContent.substring(0, 200));
        setEditorContent(htmlContent);
        console.log(
          "[App] editorContent state updated to:",
          htmlContent.length,
        );
      } catch (error) {
        console.error("[App] Failed to convert TipTap JSON to HTML:", error);
        console.error("[App] Content was:", selectedNote.content);
      }
      setEditorFolderId(selectedNote.folderId);
    } else {
      console.log("[App] No note selected, clearing editor");
      setEditorTitle("");
      setEditorContent("");
      setEditorFolderId(null);
    }
    console.log("[App] ========================================");
  }, [selectedNote]);

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

  // フォルダ変更時の保存（デバウンス1秒）
  const handleFolderChange = useCallback(
    (folderId: string | null) => {
      setEditorFolderId(folderId);

      // 既存のタイマーをクリア
      if (folderSaveTimeoutRef.current) {
        clearTimeout(folderSaveTimeoutRef.current);
      }

      // 選択中のノートがあれば1秒後に保存
      if (selectedNote) {
        setSaving(true);

        folderSaveTimeoutRef.current = setTimeout(async () => {
          try {
            await updateNote(selectedNote.id, { folderId });
            setSaving(false);
          } catch (error) {
            setSaving(false);
            console.error("Failed to save note folder:", error);
          }
        }, 1000);
      }
    },
    [selectedNote, updateNote, setSaving],
  );

  // フォルダクリックハンドラ（フィルタリング）
  const handleFolderClick = useCallback(
    async (folderId: string | null) => {
      console.log("[App] ========== Folder clicked ==========");
      console.log("[App] folderId:", folderId);

      // フォルダストアを更新（UI表示用）
      selectFolder(folderId);
      console.log("[App] Folder selected in folderStore");

      // ノートストアのフォルダフィルタを更新
      setSearchFolder(folderId);
      console.log("[App] searchFolderId set in noteStore:", folderId);

      // ノート一覧を再取得してフィルタリング
      console.log("[App] Calling fetchNotes...");
      await fetchNotes();

      console.log("[App] Notes fetched complete");
      console.log("[App] ========================================");
    },
    [selectFolder, setSearchFolder, fetchNotes],
  );

  // フォルダ作成モーダルを開く
  const handleCreateFolder = (parentId?: string | null) => {
    setEditingFolder(undefined);
    setDefaultParentId(parentId ?? null);
    setIsFolderModalOpen(true);
  };

  // フォルダ編集モーダルを開く
  const handleEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setDefaultParentId(null);
    setIsFolderModalOpen(true);
  };

  // フォルダモーダルを閉じる
  const handleCloseFolderModal = () => {
    setIsFolderModalOpen(false);
    setEditingFolder(undefined);
    setDefaultParentId(null);
  };

  // インポートモーダルを開く
  const handleOpenImportModal = (folderId: string) => {
    setImportFolderId(folderId);
    setIsImportModalOpen(true);
  };

  // インポートモーダルを閉じる
  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setImportFolderId(null);
  };

  // インポート完了時のハンドラ
  const handleImportComplete = () => {
    // ノート一覧を再取得（useNotesフックで自動的に行われる）
    console.log("Import completed");
  };

  // クリーンアップ：コンポーネントアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (titleSaveTimeoutRef.current) {
        clearTimeout(titleSaveTimeoutRef.current);
      }
      if (folderSaveTimeoutRef.current) {
        clearTimeout(folderSaveTimeoutRef.current);
      }
    };
  }, []);

  // タグクリック時のハンドラ（フィルタ切り替え）
  const handleTagClick = (tagId: string) => {
    toggleTagSelection(tagId);
  };

  // タグ変更時のハンドラ（ノートを再取得）
  const handleTagsChanged = async () => {
    if (selectedNote) {
      await selectNote(selectedNote.id);
    }
  };

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
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        }
        sidebar={
          <div className="flex flex-col h-full">
            {/* フォルダツリー */}
            <div className="flex-shrink-0 border-b border-gray-200">
              <FolderTree
                onFolderClick={handleFolderClick}
                onFolderEdit={handleEditFolder}
                onCreateFolder={handleCreateFolder}
                onImport={handleOpenImportModal}
              />
            </div>
            {/* ノート一覧 */}
            <div className="flex-1 overflow-hidden">
              <NoteList
                onNoteSelect={handleNoteSelect}
                selectedNoteId={selectedNote?.id || null}
                onTagClick={handleTagClick}
              />
            </div>
            {/* タグフィルター */}
            <TagFilterSidebar />
          </div>
        }
        rightSidebar={
          selectedNote ? (
            <div className="p-4 space-y-4">
              {/* 関連ノートウィジェット */}
              <RelatedNotesWidget
                noteId={selectedNote.id}
                onNoteClick={handleNoteSelect}
                limit={5}
              />
            </div>
          ) : null
        }
        editor={
          selectedNote ? (
            <div className="h-full flex flex-col p-6">
              {/* タイトル入力 */}
              <input
                data-testid="note-title-input"
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

              {/* フォルダセレクター */}
              <div className="mb-4">
                <FolderSelector
                  selectedFolderId={editorFolderId}
                  onFolderSelect={handleFolderChange}
                  onCreateFolder={() => handleCreateFolder(null)}
                />
              </div>

              {/* エディタ */}
              <div className="flex-1 overflow-auto">
                <TipTapEditor
                  key={selectedNote?.id || "empty"}
                  content={editorContent}
                  onChange={handleEditorChange}
                  placeholder="ここにメモを入力してください..."
                  className="border-none shadow-none"
                />
              </div>

              {/* タグセレクター */}
              <TagSelector
                note={selectedNote}
                onTagsChanged={handleTagsChanged}
              />

              {/* メタ情報 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 flex items-center gap-4">
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
                    <span className="text-yellow-600">ピン留め</span>
                  )}
                  {selectedNote.isFavorite && (
                    <span className="text-red-600">お気に入り</span>
                  )}
                </div>
              </div>

              {/* バックリンクパネル */}
              <BacklinkPanel
                noteId={selectedNote.id}
                onNoteClick={handleNoteSelect}
              />

              {/* 発リンクパネル */}
              <OutgoingLinksPanel
                noteId={selectedNote.id}
                onNoteClick={handleNoteSelect}
              />
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
                data-testid="create-note-center-button"
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

      {/* フォルダ作成・編集モーダル */}
      <FolderCreateModal
        isOpen={isFolderModalOpen}
        onClose={handleCloseFolderModal}
        editFolder={editingFolder}
        defaultParentId={defaultParentId}
      />

      {/* 設定モーダル */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* インポートモーダル */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={handleCloseImportModal}
        onImportComplete={handleImportComplete}
        defaultFolderId={importFolderId}
      />
    </>
  );
}

export default App;
