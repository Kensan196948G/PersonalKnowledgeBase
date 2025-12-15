import { useEffect, useState } from "react";
import { useFolderStore } from "../../stores/folderStore";
import type { Folder } from "../../types/folder";

export interface FolderTreeProps {
  /** フォルダクリック時のコールバック */
  onFolderClick?: (folderId: string | null) => void;
  /** フォルダ編集時のコールバック */
  onFolderEdit?: (folder: Folder) => void;
  /** フォルダ削除時のコールバック */
  onFolderDelete?: (folderId: string) => void;
  /** 新規フォルダ作成時のコールバック */
  onCreateFolder?: (parentId?: string | null) => void;
  /** インポート時のコールバック */
  onImport?: (folderId: string) => void;
}

/**
 * フォルダツリーアイテムコンポーネント（再帰的レンダリング）
 */
interface FolderTreeItemProps {
  folder: Folder;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: (folderId: string) => void;
  onSelect: (folderId: string) => void;
  onEdit?: (folder: Folder) => void;
  onDelete?: (folderId: string) => void;
  onCreate?: (parentId: string) => void;
  onImport?: (folderId: string) => void;
}

function FolderTreeItem({
  folder,
  level,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
  onEdit,
  onDelete,
  onCreate,
  onImport,
}: FolderTreeItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasChildren = folder.children && folder.children.length > 0;
  const indentWidth = level * 16; // 16px per level

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggleExpand(folder.id);
    }
  };

  const handleFolderClick = () => {
    onSelect(folder.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(folder);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(folder.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const handleCreateSubfolder = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCreate?.(folder.id);
  };

  const handleImport = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImport?.(folder.id);
  };

  return (
    <>
      <div
        className={`
          group relative flex items-center py-1.5 px-2 cursor-pointer
          hover:bg-gray-100 transition-colors
          ${isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700"}
          ${showDeleteConfirm ? "bg-red-50" : ""}
        `}
        style={{ paddingLeft: `${indentWidth + 8}px` }}
        onClick={handleFolderClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => {
          if (!showDeleteConfirm) {
            setShowActions(false);
          }
        }}
      >
        {/* 展開/折りたたみアイコン */}
        <button
          onClick={handleToggleClick}
          className={`
            flex-shrink-0 w-4 h-4 mr-1 flex items-center justify-center
            ${hasChildren ? "text-gray-500 hover:text-gray-700" : "invisible"}
          `}
        >
          {hasChildren && (
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* フォルダアイコン */}
        <svg
          className={`w-4 h-4 mr-2 flex-shrink-0 ${isExpanded ? "text-blue-500" : "text-gray-500"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>

        {/* フォルダ名 */}
        <span className="flex-1 truncate text-sm font-medium">
          {folder.name}
        </span>

        {/* ノート数 */}
        {folder.noteCount !== undefined && folder.noteCount > 0 && (
          <span className="text-xs text-gray-500 ml-2">
            ({folder.noteCount})
          </span>
        )}

        {/* アクションボタン */}
        {showActions && !showDeleteConfirm && (
          <div
            className="flex items-center gap-1 ml-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 新規サブフォルダ */}
            {onCreate && (
              <button
                onClick={handleCreateSubfolder}
                className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                title="サブフォルダを作成"
              >
                <svg
                  className="w-3 h-3"
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
              </button>
            )}

            {/* インポート */}
            {onImport && (
              <button
                onClick={handleImport}
                className="p-1 rounded text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                title="このフォルダにインポート"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </button>
            )}

            {/* 編集 */}
            {onEdit && (
              <button
                onClick={handleEditClick}
                className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50"
                title="編集"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}

            {/* 削除 */}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                title="削除"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 削除確認 */}
        {showDeleteConfirm && (
          <div className="flex items-center gap-1 ml-2">
            <span className="text-xs text-red-700 mr-1">削除?</span>
            <button
              onClick={handleConfirmDelete}
              className="px-2 py-0.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              削除
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              戻る
            </button>
          </div>
        )}
      </div>

      {/* 子フォルダ（再帰的にレンダリング） */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((childFolder) => (
            <FolderTreeItem
              key={childFolder.id}
              folder={childFolder}
              level={level + 1}
              isSelected={false} // 子フォルダの選択状態は親コンポーネントで管理
              isExpanded={false} // 子フォルダの展開状態は親コンポーネントで管理
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreate={onCreate}
              onImport={onImport}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * フォルダツリーコンポーネント
 * 階層構造のフォルダ一覧を表示
 */
export function FolderTree({
  onFolderClick,
  onFolderEdit,
  onFolderDelete,
  onCreateFolder,
  onImport,
}: FolderTreeProps) {
  const {
    fetchFolders,
    deleteFolder,
    selectFolder,
    toggleFolderExpand,
    expandAll,
    collapseAll,
    getFolderTree,
    selectedFolderId,
    expandedFolders,
    isLoading,
    error,
  } = useFolderStore();

  const [showAllFolders, setShowAllFolders] = useState(false);

  // 初回マウント時にフォルダ一覧を取得
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const folderTree = getFolderTree();

  const handleFolderClick = (folderId: string) => {
    selectFolder(folderId);
    onFolderClick?.(folderId);
  };

  const handleAllNotesClick = () => {
    selectFolder(null);
    onFolderClick?.(null);
  };

  const handleFolderDelete = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      onFolderDelete?.(folderId);
    } catch (error) {
      console.error("Failed to delete folder:", error);
    }
  };

  const handleExpandAll = () => {
    expandAll();
    setShowAllFolders(true);
  };

  const handleCollapseAll = () => {
    collapseAll();
    setShowAllFolders(false);
  };

  // 再帰的にフォルダツリーをレンダリング
  const renderFolderTree = (folders: Folder[], level: number = 0) => {
    return folders.map((folder) => {
      const isSelected = selectedFolderId === folder.id;
      const isExpanded = expandedFolders.has(folder.id);

      return (
        <FolderTreeItem
          key={folder.id}
          folder={folder}
          level={level}
          isSelected={isSelected}
          isExpanded={isExpanded}
          onToggleExpand={toggleFolderExpand}
          onSelect={handleFolderClick}
          onEdit={onFolderEdit}
          onDelete={handleFolderDelete}
          onCreate={onCreateFolder}
          onImport={onImport}
        />
      );
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">フォルダ</h2>
        <div className="flex items-center gap-1">
          {/* 展開/折りたたみトグル */}
          <button
            onClick={showAllFolders ? handleCollapseAll : handleExpandAll}
            className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200"
            title={showAllFolders ? "全て折りたたむ" : "全て展開"}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {showAllFolders ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              )}
            </svg>
          </button>

          {/* 新規フォルダ作成 */}
          {onCreateFolder && (
            <button
              onClick={() => onCreateFolder(null)}
              className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              title="新規フォルダ"
            >
              <svg
                className="w-4 h-4"
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
            </button>
          )}
        </div>
      </div>

      {/* フォルダツリー */}
      <div className="flex-1 overflow-y-auto">
        {/* 全てのノート */}
        <div
          className={`
            flex items-center py-2 px-3 cursor-pointer
            hover:bg-gray-100 transition-colors
            ${selectedFolderId === null ? "bg-blue-50 text-blue-700" : "text-gray-700"}
          `}
          onClick={handleAllNotesClick}
        >
          <svg
            className="w-4 h-4 mr-2 text-gray-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
          <span className="text-sm font-medium">全てのノート</span>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="px-3 py-2 text-xs text-red-600 bg-red-50">
            {error}
          </div>
        )}

        {/* ローディング */}
        {isLoading && folderTree.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            読み込み中...
          </div>
        )}

        {/* フォルダツリー */}
        {!isLoading && folderTree.length === 0 && (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            フォルダがありません
          </div>
        )}

        {folderTree.length > 0 && (
          <div className="py-1">{renderFolderTree(folderTree)}</div>
        )}
      </div>
    </div>
  );
}

export default FolderTree;
