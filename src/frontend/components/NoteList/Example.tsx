/**
 * NoteListコンポーネントの使用例
 *
 * このファイルは実際のアプリケーションでの使用方法を示すサンプルです。
 * 必要に応じてコピー＆カスタマイズしてください。
 */

import { useState } from "react";
import { NoteList } from "./NoteList";

/**
 * 例1: 基本的な使い方
 * シンプルなノート一覧表示
 */
export function BasicExample() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    <div className="h-screen flex">
      {/* 左側: ノート一覧 */}
      <div className="w-1/3 border-r border-gray-200">
        <NoteList
          selectedNoteId={selectedNoteId}
          onNoteSelect={setSelectedNoteId}
        />
      </div>

      {/* 右側: 選択中のノート表示エリア */}
      <div className="flex-1 p-4">
        {selectedNoteId ? (
          <div>選択中のノート: {selectedNoteId}</div>
        ) : (
          <div className="text-gray-500">ノートを選択してください</div>
        )}
      </div>
    </div>
  );
}

/**
 * 例2: カスタムソート設定
 * 作成日時の昇順で初期表示
 */
export function CustomSortExample() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    <div className="h-screen">
      <NoteList
        selectedNoteId={selectedNoteId}
        onNoteSelect={setSelectedNoteId}
        initialSortBy="createdAt"
        initialOrder="asc"
      />
    </div>
  );
}

/**
 * 例3: 選択時に詳細を取得
 * ノート選択時にAPIから詳細データを取得する例
 */
export function FetchDetailExample() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteDetail, setNoteDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleNoteSelect = async (noteId: string) => {
    setSelectedNoteId(noteId);
    setLoading(true);

    try {
      const response = await fetch(`http://localhost:3000/api/notes/${noteId}`);
      const data = await response.json();
      setNoteDetail(data.data);
    } catch (error) {
      console.error("Failed to fetch note detail:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex">
      <div className="w-1/3 border-r border-gray-200">
        <NoteList
          selectedNoteId={selectedNoteId}
          onNoteSelect={handleNoteSelect}
        />
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div>読み込み中...</div>
        ) : noteDetail ? (
          <div>
            <h1 className="text-2xl font-bold mb-4">{noteDetail.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: noteDetail.content }} />
          </div>
        ) : (
          <div className="text-gray-500">ノートを選択してください</div>
        )}
      </div>
    </div>
  );
}

/**
 * 例4: カスタムAPIベースURL
 * 本番環境など異なるAPIエンドポイントを使用する例
 */
export function CustomApiExample() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // 環境変数からAPIベースURLを取得
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  return (
    <div className="h-screen">
      <NoteList
        selectedNoteId={selectedNoteId}
        onNoteSelect={setSelectedNoteId}
        apiBaseUrl={apiBaseUrl}
      />
    </div>
  );
}

/**
 * 例5: 削除後の処理をカスタマイズ
 * 削除後に通知を表示する例
 */
export function DeleteNotificationExample() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [notification] = useState<string | null>(null);

  const handleNoteSelect = (noteId: string) => {
    setSelectedNoteId(noteId);
  };

  // NoteListが内部的に削除処理を行うため、
  // 削除完了を検知したい場合は別途カスタム実装が必要
  // この例ではNoteListを使用し、内部の削除機能を利用

  return (
    <div className="h-screen">
      {notification && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {notification}
        </div>
      )}

      <NoteList
        selectedNoteId={selectedNoteId}
        onNoteSelect={handleNoteSelect}
      />
    </div>
  );
}

/**
 * 例6: レスポンシブレイアウト
 * モバイルとデスクトップで表示を切り替える例
 */
export function ResponsiveExample() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  return (
    <div className="h-screen flex flex-col md:flex-row">
      {/* モバイル: 一覧とエディタを切り替え */}
      {/* デスクトップ: 左右に並べる */}
      <div
        className={`
          ${isMobileView && selectedNoteId ? "hidden md:block" : "block"}
          w-full md:w-1/3 border-r border-gray-200
        `}
      >
        <NoteList
          selectedNoteId={selectedNoteId}
          onNoteSelect={(id) => {
            setSelectedNoteId(id);
            setIsMobileView(true);
          }}
        />
      </div>

      <div
        className={`
          ${isMobileView && !selectedNoteId ? "hidden md:block" : "block"}
          flex-1 p-4
        `}
      >
        {selectedNoteId ? (
          <div>
            <button
              onClick={() => setIsMobileView(false)}
              className="md:hidden mb-4 text-blue-600"
            >
              ← 一覧に戻る
            </button>
            <div>選択中のノート: {selectedNoteId}</div>
          </div>
        ) : (
          <div className="text-gray-500">ノートを選択してください</div>
        )}
      </div>
    </div>
  );
}

/**
 * 例7: 複数のNoteListコンポーネント
 * タブで切り替える例（全てのノート / お気に入り / アーカイブ）
 */
export function TabbedExample() {
  const [selectedTab, setSelectedTab] = useState<
    "all" | "favorites" | "archived"
  >("all");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col">
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setSelectedTab("all")}
          className={`px-4 py-2 ${selectedTab === "all" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
        >
          すべて
        </button>
        <button
          onClick={() => setSelectedTab("favorites")}
          className={`px-4 py-2 ${selectedTab === "favorites" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
        >
          お気に入り
        </button>
        <button
          onClick={() => setSelectedTab("archived")}
          className={`px-4 py-2 ${selectedTab === "archived" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-600"}`}
        >
          アーカイブ
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-hidden">
        {selectedTab === "all" && (
          <NoteList
            selectedNoteId={selectedNoteId}
            onNoteSelect={setSelectedNoteId}
          />
        )}
        {selectedTab === "favorites" && (
          <div className="p-4 text-gray-500">
            お気に入りフィルタ機能は別途実装が必要です
          </div>
        )}
        {selectedTab === "archived" && (
          <div className="p-4 text-gray-500">
            アーカイブフィルタ機能は別途実装が必要です
          </div>
        )}
      </div>
    </div>
  );
}
