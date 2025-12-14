/**
 * NoteLinkSuggestion Component
 *
 * [[ノート名]] オートコンプリート用のSuggestionリスト
 * - Fuse.jsであいまい検索
 * - キーボードナビゲーション（↑↓Enter）
 * - 既存ノートと新規作成候補を表示
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import Fuse from "fuse.js";
import { NoteSuggestionItem } from "./extensions/NoteLinkExtension";

export interface NoteLinkSuggestionProps {
  items: NoteSuggestionItem[];
  command: (item: {
    id: string;
    label: string;
    noteId?: string;
    exists: boolean;
  }) => void;
  fetchNotes: () => Promise<NoteSuggestionItem[]>;
  query?: string;
}

export interface NoteLinkSuggestionRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

/**
 * NoteLinkSuggestion Component
 */
export const NoteLinkSuggestion = forwardRef<
  NoteLinkSuggestionRef,
  NoteLinkSuggestionProps
>((props, ref) => {
  const { fetchNotes, query, command } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [allNotes, setAllNotes] = useState<NoteSuggestionItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<NoteSuggestionItem[]>([]);

  // ノート一覧取得
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const notes = await fetchNotes();
        setAllNotes(notes);
      } catch (error) {
        console.error("Failed to fetch notes for suggestion:", error);
        setAllNotes([]);
      }
    };

    loadNotes();
  }, [fetchNotes]);

  // Fuse.jsであいまい検索
  useEffect(() => {
    const queryStr = query?.trim() || "";

    if (queryStr.length === 0) {
      // クエリが空の場合は最新のノートを表示
      setFilteredItems(allNotes.slice(0, 5));
      setSelectedIndex(0);
      return;
    }

    const fuse = new Fuse(allNotes, {
      keys: ["title"],
      threshold: 0.3, // 0.0 = 完全一致, 1.0 = すべてマッチ
      includeScore: true,
      minMatchCharLength: 1,
    });

    const results = fuse.search(queryStr);
    const items = results.map((result) => result.item).slice(0, 5);

    // 検索結果が0件の場合は新規作成候補を表示
    if (items.length === 0) {
      setFilteredItems([
        {
          id: `new-${queryStr}`,
          title: queryStr,
          exists: false,
        },
      ]);
    } else {
      setFilteredItems(items);
    }

    setSelectedIndex(0);
  }, [query, allNotes]);

  const selectItem = (index: number) => {
    const item = filteredItems[index];

    if (!item) {
      return;
    }

    command({
      id: item.id,
      label: item.title,
      noteId: item.exists ? item.id : undefined,
      exists: item.exists,
    });
  };

  const upHandler = () => {
    setSelectedIndex(
      (selectedIndex + filteredItems.length - 1) % filteredItems.length,
    );
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % filteredItems.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        upHandler();
        return true;
      }

      if (event.key === "ArrowDown") {
        downHandler();
        return true;
      }

      if (event.key === "Enter") {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (filteredItems.length === 0) {
    return (
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-[200px]">
        <div className="text-sm text-gray-500 px-2 py-1">
          ノートが見つかりません
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-1 min-w-[200px] max-h-[300px] overflow-y-auto">
      {filteredItems.map((item, index) => (
        <button
          key={item.id}
          onClick={() => selectItem(index)}
          className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
            index === selectedIndex
              ? "bg-blue-100 text-blue-900"
              : "hover:bg-gray-100 text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {item.exists ? (
              <span className="text-blue-600">📄</span>
            ) : (
              <span className="text-red-600">➕</span>
            )}
            <span className="font-medium truncate">{item.title}</span>
          </div>
          {!item.exists && (
            <div className="text-xs text-gray-500 ml-6">新規作成</div>
          )}
        </button>
      ))}
    </div>
  );
});

NoteLinkSuggestion.displayName = "NoteLinkSuggestion";
