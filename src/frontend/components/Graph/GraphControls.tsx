/**
 * グラフビューコントロール
 */

import type { GraphControlsProps } from "../../types/graph";

export function GraphControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFilterChange,
  filter,
}: GraphControlsProps) {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 space-y-4 z-10">
      {/* ズームコントロール */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-gray-700 mb-2">ズーム</div>
        <div className="flex flex-col space-y-2">
          <button
            onClick={onZoomIn}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            title="拡大"
          >
            <svg
              className="w-4 h-4 mx-auto"
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
          <button
            onClick={onZoomOut}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
            title="縮小"
          >
            <svg
              className="w-4 h-4 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H4"
              />
            </svg>
          </button>
          <button
            onClick={onReset}
            className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
            title="リセット"
          >
            <svg
              className="w-4 h-4 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* フィルター */}
      <div className="space-y-2 border-t pt-4">
        <div className="text-xs font-medium text-gray-700 mb-2">フィルター</div>

        {/* ピン留めのみ */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.showPinnedOnly}
            onChange={(e) =>
              onFilterChange({ ...filter, showPinnedOnly: e.target.checked })
            }
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">ピン留めのみ</span>
        </label>

        {/* お気に入りのみ */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filter.showFavoritesOnly}
            onChange={(e) =>
              onFilterChange({ ...filter, showFavoritesOnly: e.target.checked })
            }
            className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">お気に入りのみ</span>
        </label>

        {/* 最小リンク数 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-700">
            最小リンク数: {filter.minLinkCount}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={filter.minLinkCount}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                minLinkCount: parseInt(e.target.value),
              })
            }
            className="w-full"
          />
        </div>
      </div>

      {/* 凡例 */}
      <div className="space-y-2 border-t pt-4">
        <div className="text-xs font-medium text-gray-700 mb-2">凡例</div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs text-gray-600">選択中</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs text-gray-600">ピン留め</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-xs text-gray-600">お気に入り</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-xs text-gray-600">通常</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-0.5 bg-gray-800"></div>
            <span className="text-xs text-gray-600">単方向リンク</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-1 bg-gray-800"></div>
            <span className="text-xs text-gray-600">双方向リンク</span>
          </div>
        </div>
      </div>
    </div>
  );
}
