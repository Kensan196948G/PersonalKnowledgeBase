import { useState, useEffect } from "react";
import { useFolderStore } from "../../stores/folderStore";
import type { Folder } from "../../types/folder";

export interface FolderCreateModalProps {
  /** モーダル表示フラグ */
  isOpen: boolean;
  /** モーダルクローズ時のコールバック */
  onClose: () => void;
  /** 作成/更新成功時のコールバック */
  onSuccess?: (folder: Folder) => void;
  /** 編集対象のフォルダ（新規作成時はundefined） */
  editFolder?: Folder;
  /** デフォルトの親フォルダID */
  defaultParentId?: string | null;
}

/**
 * フォルダ作成・編集モーダルコンポーネント
 */
export function FolderCreateModal({
  isOpen,
  onClose,
  onSuccess,
  editFolder,
  defaultParentId,
}: FolderCreateModalProps) {
  const { folders, createFolder, updateFolder, isLoading } = useFolderStore();

  const [folderName, setFolderName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editFolder;

  // モーダルが開かれた時に初期値を設定
  useEffect(() => {
    if (isOpen) {
      if (editFolder) {
        // 編集モード
        setFolderName(editFolder.name);
        setParentId(editFolder.parentId);
      } else {
        // 新規作成モード
        setFolderName("");
        setParentId(defaultParentId ?? null);
      }
      setError(null);
    }
  }, [isOpen, editFolder, defaultParentId]);

  // Escapeキーでモーダルを閉じる
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isLoading, onClose]);

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // バリデーション
    if (!folderName.trim()) {
      setError("フォルダ名を入力してください");
      return;
    }

    if (folderName.length > 100) {
      setError("フォルダ名は100文字以内で入力してください");
      return;
    }

    // 循環参照チェック（編集モードのみ）
    if (isEditMode && parentId) {
      if (parentId === editFolder.id) {
        setError("自分自身を親フォルダに設定できません");
        return;
      }

      // 子孫フォルダを親フォルダに設定できないかチェック
      const isDescendant = (folderId: string, targetId: string): boolean => {
        const folder = folders.find((f) => f.id === folderId);
        if (!folder) return false;
        if (folder.parentId === targetId) return true;
        if (folder.parentId) {
          return isDescendant(folder.parentId, targetId);
        }
        return false;
      };

      if (isDescendant(parentId, editFolder.id)) {
        setError("子フォルダを親フォルダに設定できません");
        return;
      }
    }

    try {
      let result: Folder;

      if (isEditMode) {
        // 更新
        await updateFolder(editFolder.id, folderName.trim(), parentId);
        result = { ...editFolder, name: folderName.trim(), parentId };
      } else {
        // 新規作成
        result = await createFolder(folderName.trim(), parentId);
      }

      onSuccess?.(result);
      handleClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "フォルダの保存に失敗しました",
      );
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFolderName(e.target.value);
    if (error) setError(null);
  };

  const handleParentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setParentId(value === "" ? null : value);
    if (error) setError(null);
  };

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null;

  // 選択可能な親フォルダリスト（編集モード時は自分自身と子孫を除外）
  const getAvailableParentFolders = (): Folder[] => {
    if (!isEditMode) return folders;

    const getAllDescendants = (folderId: string): string[] => {
      const descendants: string[] = [folderId];
      const children = folders.filter((f) => f.parentId === folderId);
      children.forEach((child) => {
        descendants.push(...getAllDescendants(child.id));
      });
      return descendants;
    };

    const excludedIds = getAllDescendants(editFolder.id);
    return folders.filter((f) => !excludedIds.includes(f.id));
  };

  const availableFolders = getAvailableParentFolders();

  // フォルダツリーを構築
  const buildFolderTree = (folders: Folder[]): Folder[] => {
    const folderMap = new Map<string, Folder>();
    const rootFolders: Folder[] = [];

    folders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    folders.forEach((folder) => {
      const folderNode = folderMap.get(folder.id);
      if (!folderNode) return;

      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent && parent.children) {
          parent.children.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  };

  // フォルダツリーをフラットなリストに変換
  const getFlatFolderList = (
    folders: Folder[],
    level: number = 0,
  ): Array<{ folder: Folder; level: number }> => {
    const result: Array<{ folder: Folder; level: number }> = [];

    folders.forEach((folder) => {
      result.push({ folder, level });
      if (folder.children && folder.children.length > 0) {
        result.push(...getFlatFolderList(folder.children, level + 1));
      }
    });

    return result;
  };

  const folderTree = buildFolderTree(availableFolders);
  const flatFolderList = getFlatFolderList(folderTree);

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
      />

      {/* モーダル */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditMode ? "フォルダを編集" : "新規フォルダを作成"}
            </h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            {/* フォルダ名入力 */}
            <div className="mb-4">
              <label
                htmlFor="folderName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                フォルダ名 <span className="text-red-500">*</span>
              </label>
              <input
                id="folderName"
                type="text"
                value={folderName}
                onChange={handleNameChange}
                disabled={isLoading}
                placeholder="例: プロジェクト、日記、アイデア"
                className="
                  w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  transition-colors
                "
                autoFocus
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500">
                {folderName.length} / 100 文字
              </p>
            </div>

            {/* 親フォルダ選択 */}
            <div className="mb-4">
              <label
                htmlFor="parentFolder"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                親フォルダ（任意）
              </label>
              <select
                id="parentFolder"
                value={parentId ?? ""}
                onChange={handleParentChange}
                disabled={isLoading}
                className="
                  w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:bg-gray-100 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                <option value="">(なし - ルートフォルダ)</option>
                {flatFolderList.map(({ folder, level }) => (
                  <option key={folder.id} value={folder.id}>
                    {"\u00A0".repeat(level * 4)}
                    {folder.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                このフォルダを別のフォルダの中に配置できます
              </p>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ボタン */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="
                  px-4 py-2 text-sm font-medium text-gray-700
                  bg-white border border-gray-300 rounded-lg
                  hover:bg-gray-50 active:bg-gray-100
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isLoading || !folderName.trim()}
                className="
                  px-4 py-2 text-sm font-medium text-white
                  bg-blue-600 rounded-lg
                  hover:bg-blue-700 active:bg-blue-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {isLoading
                  ? "保存中..."
                  : isEditMode
                    ? "更新"
                    : "作成"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default FolderCreateModal;
