/**
 * グラフビューページ
 *
 * 使用方法:
 * App.tsxで状態管理を追加し、ヘッダーにビュー切り替えボタンを配置してください。
 *
 * 例:
 * const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
 *
 * <Header
 *   onViewModeChange={setViewMode}
 *   currentViewMode={viewMode}
 * />
 *
 * {viewMode === 'editor' ? (
 *   // 既存のエディタビュー
 * ) : (
 *   <GraphViewPage noteId={selectedNote?.id} />
 * )}
 */

import { useState } from 'react';
import { NoteGraphView } from './NoteGraphView';

interface GraphViewPageProps {
  noteId?: string;
}

export function GraphViewPage({ noteId }: GraphViewPageProps) {
  const [depth, setDepth] = useState(2);

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* ページヘッダー */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">ノートグラフビュー</h2>
            <p className="text-sm text-gray-500 mt-1">
              ノート間のリンク関係を可視化します
            </p>
          </div>

          {/* 深度設定 */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">リンク深度:</span>
              <select
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1階層</option>
                <option value={2}>2階層</option>
                <option value={3}>3階層</option>
                <option value={4}>4階層</option>
              </select>
            </label>

            {noteId && (
              <div className="text-sm text-gray-600">
                中心ノート: {noteId.substring(0, 8)}...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* グラフビュー */}
      <div className="flex-1 p-4">
        <NoteGraphView
          noteId={noteId}
          depth={depth}
          width={1200}
          height={800}
        />
      </div>

      {/* ヘルプ情報 */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>操作方法:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>ノードをクリック: そのノートを開く</li>
            <li>ノードをドラッグ: 位置を移動</li>
            <li>マウスホイール: ズームイン/アウト</li>
            <li>背景をドラッグ: 視点を移動（パン）</li>
            <li>右側のコントロール: フィルター・ズーム操作</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
