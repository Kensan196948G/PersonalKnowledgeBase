import { useState, useEffect, useRef } from "react";
import { useFolderStore } from "../../stores/folderStore";
import type { Folder } from "../../types/folder";

export interface FolderSelectorProps {
  /** 現在選択中のフォルダID */
  selectedFolderId: string | null;
  /** フォルダ選択時のコールバック */
  onFolderSelect: (folderId: string | null) => void;
  /** 新規フォルダ作成時のコールバック */
  onCreateFolder?: () => void;
  /** 無効化フラグ */
  disabled?: boolean;
}

/**
 * フォルダ選択ドロップダウンコンポーネント
 * ノート編集時にフォルダを選択するために使用
 */
export function FolderSelector({
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  disabled = false,
}: FolderSelectorProps) {
  const { folders, fetchFolders, getFolderById } = useFolderStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 初回マウント時にフォルダ一覧を取得
  useEffect(() => {
    if (folders.length === 0) {
      fetchFolders();
    }
  }, [fetchFolders, folders.length]);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedFolder = selectedFolderId ? getFolderById(selectedFolderId) : null;

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    onFolderSelect(folderId);
    setIsOpen(false);
  };

  const handleCreateFolder = () => {
    onCreateFolder?.();
    setIsOpen(false);
  };

  /**
   * フォルダツリーをフラットなリストに変換（階層インデント付き）
   */
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

  const folderTree = buildFolderTree(folders);
  const flatFolderList = getFlatFolderList(folderTree);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ラベル */}
      <label className="block text-sm font-medium text-gray-700 mb-1">
        フォルダ
      </label>

      {/* セレクトボタン */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between
          px-3 py-2 border rounded-lg
          text-sm text-left
          ${
            disabled
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:border-blue-500 cursor-pointer"
          }
          ${isOpen ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-300"}
          transition-all
        `}
      >
        <span className="flex items-center flex-1 truncate">
          {/* フォルダアイコン */}
          <svg
            className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>

          {/* 選択中のフォルダ名 */}
          <span className="truncate">
            {selectedFolder ? selectedFolder.name : "(フォルダなし)"}
          </span>
        </span>

        {/* ドロップダウンアイコン */}
        <svg
          className={`w-4 h-4 ml-2 flex-shrink-0 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {/* フォルダなしオプション */}
          <button
            type="button"
            onClick={() => handleFolderSelect(null)}
            className={`
              w-full flex items-center px-3 py-2 text-sm text-left
              hover:bg-gray-100 transition-colors
              ${selectedFolderId === null ? "bg-blue-50 text-blue-700" : "text-gray-700"}
            `}
          >
            <svg
              className="w-4 h-4 mr-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <span>(フォルダなし)</span>
          </button>

          {/* 区切り線 */}
          {flatFolderList.length > 0 && (
            <div className="border-t border-gray-200 my-1" />
          )}

          {/* フォルダリスト */}
          {flatFolderList.map(({ folder, level }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => handleFolderSelect(folder.id)}
              className={`
                w-full flex items-center px-3 py-2 text-sm text-left
                hover:bg-gray-100 transition-colors
                ${selectedFolderId === folder.id ? "bg-blue-50 text-blue-700" : "text-gray-700"}
              `}
              style={{ paddingLeft: `${12 + level * 16}px` }}
            >
              {/* フォルダアイコン */}
              <svg
                className="w-4 h-4 mr-2 flex-shrink-0 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>

              {/* フォルダ名 */}
              <span className="truncate">{folder.name}</span>

              {/* 選択中アイコン */}
              {selectedFolderId === folder.id && (
                <svg
                  className="w-4 h-4 ml-auto flex-shrink-0 text-blue-700"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}

          {/* フォルダが存在しない場合 */}
          {flatFolderList.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-500 text-center">
              フォルダがありません
            </div>
          )}

          {/* 区切り線 */}
          {onCreateFolder && (
            <div className="border-t border-gray-200 my-1" />
          )}

          {/* 新規フォルダ作成ボタン */}
          {onCreateFolder && (
            <button
              type="button"
              onClick={handleCreateFolder}
              className="
                w-full flex items-center px-3 py-2 text-sm text-left
                text-blue-600 hover:bg-blue-50 transition-colors
              "
            >
              <svg
                className="w-4 h-4 mr-2"
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
              <span className="font-medium">新規フォルダを作成</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FolderSelector;
