import { useState, useEffect } from "react";
import { useTagStore } from "../../stores/tagStore";
import type { Note } from "../../types/note";

export interface TagSelectorProps {
  /** 編集中のノート */
  note: Note;
  /** タグ変更時のコールバック（親コンポーネントでノートを再取得するため） */
  onTagsChanged?: () => void;
}

/**
 * タグ選択・管理コンポーネント
 * ノート編集時にタグを選択・付与・削除できる
 */
export function TagSelector({ note, onTagsChanged }: TagSelectorProps) {
  const {
    tags,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    addTagToNote,
    removeTagFromNote,
  } = useTagStore();

  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6"); // デフォルト: blue-500
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState("");
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  // コンポーネントマウント時にタグ一覧を取得
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // ノートに付与されているタグのIDリスト
  const noteTagIds = note.tags?.map((nt) => nt.tagId) || [];

  // タグのクリック（付与/削除）
  const handleTagClick = async (tagId: string) => {
    const isAttached = noteTagIds.includes(tagId);
    try {
      if (isAttached) {
        await removeTagFromNote(note.id, tagId);
      } else {
        await addTagToNote(note.id, tagId);
      }
      onTagsChanged?.();
    } catch (error) {
      console.error("Failed to toggle tag:", error);
    }
  };

  // 新規タグ作成
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await createTag({
        name: newTagName.trim(),
        color: newTagColor,
      });
      // 作成したタグを自動的にノートに付与
      await addTagToNote(note.id, newTag.id);
      onTagsChanged?.();

      // フォームをリセット
      setNewTagName("");
      setNewTagColor("#3B82F6");
      setIsCreatingTag(false);
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  // タグ編集開始
  const handleEditStart = (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (tag) {
      setEditingTagId(tagId);
      setEditTagName(tag.name);
      setEditTagColor(tag.color || "#3B82F6");
    }
  };

  // タグ編集保存
  const handleEditSave = async (tagId: string) => {
    if (!editTagName.trim()) return;

    try {
      await updateTag(tagId, {
        name: editTagName.trim(),
        color: editTagColor,
      });
      setEditingTagId(null);
      onTagsChanged?.();
    } catch (error) {
      console.error("Failed to update tag:", error);
    }
  };

  // タグ編集キャンセル
  const handleEditCancel = () => {
    setEditingTagId(null);
    setEditTagName("");
    setEditTagColor("");
  };

  // タグ削除
  const handleDeleteTag = async (tagId: string) => {
    try {
      await deleteTag(tagId);
      setDeletingTagId(null);
      onTagsChanged?.();
    } catch (error) {
      console.error("Failed to delete tag:", error);
    }
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          タグ
        </h3>
        <button
          onClick={() => setIsCreatingTag(!isCreatingTag)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {isCreatingTag ? "キャンセル" : "+ 新規タグ"}
        </button>
      </div>

      {/* 新規タグ作成フォーム */}
      {isCreatingTag && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="タグ名"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateTag();
                } else if (e.key === "Escape") {
                  setIsCreatingTag(false);
                }
              }}
              autoFocus
            />
            <input
              type="color"
              value={newTagColor}
              onChange={(e) => setNewTagColor(e.target.value)}
              className="w-10 h-8 cursor-pointer border border-gray-300 rounded"
              title="色を選択"
            />
          </div>
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="w-full px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            作成
          </button>
        </div>
      )}

      {/* 既存タグ一覧 */}
      <div className="space-y-2">
        {tags.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            タグがありません。上のボタンから作成してください。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isAttached = noteTagIds.includes(tag.id);
              const isEditing = editingTagId === tag.id;
              const isDeleting = deletingTagId === tag.id;

              if (isEditing) {
                // 編集モード
                return (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1 p-2 bg-white border border-gray-300 rounded-lg"
                  >
                    <input
                      type="text"
                      value={editTagName}
                      onChange={(e) => setEditTagName(e.target.value)}
                      className="w-20 px-1 py-0.5 text-xs border border-gray-300 rounded"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleEditSave(tag.id);
                        } else if (e.key === "Escape") {
                          handleEditCancel();
                        }
                      }}
                      autoFocus
                    />
                    <input
                      type="color"
                      value={editTagColor}
                      onChange={(e) => setEditTagColor(e.target.value)}
                      className="w-6 h-6 cursor-pointer"
                    />
                    <button
                      onClick={() => handleEditSave(tag.id)}
                      className="text-green-600 hover:text-green-700"
                      title="保存"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="text-gray-400 hover:text-gray-600"
                      title="キャンセル"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                );
              }

              if (isDeleting) {
                // 削除確認モード
                return (
                  <div
                    key={tag.id}
                    className="flex items-center gap-1 p-2 bg-red-50 border border-red-300 rounded-lg"
                  >
                    <span className="text-xs text-red-900">削除?</span>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="px-2 py-0.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      削除
                    </button>
                    <button
                      onClick={() => setDeletingTagId(null)}
                      className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      戻る
                    </button>
                  </div>
                );
              }

              // 通常モード
              return (
                <div
                  key={tag.id}
                  className="inline-flex items-center gap-1 group"
                >
                  <button
                    onClick={() => handleTagClick(tag.id)}
                    className={`
                      inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                      transition-all duration-200
                      ${
                        isAttached
                          ? "ring-2 ring-offset-1"
                          : "opacity-60 hover:opacity-100"
                      }
                    `}
                    style={{
                      backgroundColor: tag.color
                        ? `${tag.color}20`
                        : "#E5E7EB",
                      color: tag.color || "#374151",
                      ...(isAttached && tag.color ? { outlineColor: tag.color } : {}),
                    }}
                    title={isAttached ? "クリックで削除" : "クリックで付与"}
                  >
                    {tag.name}
                    {isAttached && (
                      <span className="ml-1 text-xs">✓</span>
                    )}
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button
                      onClick={() => handleEditStart(tag.id)}
                      className="p-0.5 text-gray-400 hover:text-blue-600"
                      title="編集"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingTagId(tag.id)}
                      className="p-0.5 text-gray-400 hover:text-red-600"
                      title="削除"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 付与済みタグ */}
      {note.tags && note.tags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">付与済みタグ:</p>
          <div className="flex flex-wrap gap-2">
            {note.tags.map((noteTag) => (
              <span
                key={noteTag.tagId}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: noteTag.tag.color
                    ? `${noteTag.tag.color}20`
                    : "#E5E7EB",
                  color: noteTag.tag.color || "#374151",
                }}
              >
                {noteTag.tag.name}
                <button
                  onClick={() => handleTagClick(noteTag.tagId)}
                  className="ml-1.5 text-current opacity-60 hover:opacity-100"
                  title="削除"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TagSelector;
