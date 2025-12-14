/**
 * グラフデータ取得フック
 */

import { useState, useEffect } from 'react';
import type { GraphNode, GraphLink } from '../types/graph';

// Viteのプロキシを通じてAPIにアクセス（相対パス使用）
const API_BASE_URL = '/api';

/**
 * ノート間リンクをグラフデータに変換する
 */
export function useGraphData(centerNoteId?: string, depth: number = 2) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchGraphData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // ノードマップとリンクセット
        const nodeMap = new Map<string, GraphNode>();
        const linkSet = new Set<string>();
        const linkList: GraphLink[] = [];

        // 訪問済みノードを追跡
        const visited = new Set<string>();
        const queue: { noteId: string; currentDepth: number }[] = [];

        // 全ノート情報を取得
        const notesResponse = await fetch(`${API_BASE_URL}/notes`);
        if (!notesResponse.ok) {
          throw new Error('ノート一覧の取得に失敗しました');
        }
        const allNotes = await notesResponse.json();

        // ノート情報をマップに格納
        const noteInfoMap = new Map<string, {
          title: string;
          isPinned: boolean;
          isFavorite: boolean;
          tagCount: number;
        }>(
          allNotes.map((note: any) => [
            note.id,
            {
              title: note.title || '無題',
              isPinned: note.isPinned || false,
              isFavorite: note.isFavorite || false,
              tagCount: note.tags?.length || 0,
            },
          ])
        );

        // 中心ノードが指定されている場合、そこから開始
        if (centerNoteId) {
          queue.push({ noteId: centerNoteId, currentDepth: 0 });
        } else {
          // 中心ノードがない場合、全ノートをdepth=1で表示
          allNotes.forEach((note: any) => {
            queue.push({ noteId: note.id, currentDepth: 0 });
          });
        }

        // BFSでリンクを辿る
        while (queue.length > 0) {
          const { noteId, currentDepth } = queue.shift()!;

          if (visited.has(noteId) || currentDepth > depth) {
            continue;
          }

          visited.add(noteId);

          try {
            // 発リンク取得
            const outLinksResponse = await fetch(`${API_BASE_URL}/links/${noteId}`);
            let outLinks: any[] = [];
            if (outLinksResponse.ok) {
              outLinks = await outLinksResponse.json();
            }

            // 被リンク取得
            const backLinksResponse = await fetch(`${API_BASE_URL}/links/backlinks/${noteId}`);
            let backLinks: any[] = [];
            if (backLinksResponse.ok) {
              backLinks = await backLinksResponse.json();
            }

            // ノード情報を追加
            const noteInfo = noteInfoMap.get(noteId);
            if (!nodeMap.has(noteId) && noteInfo) {
              nodeMap.set(noteId, {
                id: noteId,
                title: noteInfo.title,
                isPinned: noteInfo.isPinned,
                isFavorite: noteInfo.isFavorite,
                tagCount: noteInfo.tagCount,
                linkCount: outLinks.length + backLinks.length,
              });
            }

            // 発リンクを処理
            outLinks.forEach((link: any) => {
              const targetId = link.targetNoteId;
              const linkKey = `${noteId}->${targetId}`;
              const reverseLinkKey = `${targetId}->${noteId}`;

              // ターゲットノードを追加
              const targetInfo = noteInfoMap.get(targetId);
              if (!nodeMap.has(targetId) && targetInfo) {
                nodeMap.set(targetId, {
                  id: targetId,
                  title: targetInfo.title,
                  isPinned: targetInfo.isPinned,
                  isFavorite: targetInfo.isFavorite,
                  tagCount: targetInfo.tagCount,
                  linkCount: 0, // 後で更新
                });
              }

              // リンクを追加（双方向チェック）
              if (!linkSet.has(linkKey) && !linkSet.has(reverseLinkKey)) {
                const isBidirectional = backLinks.some(
                  (bl: any) => bl.sourceNoteId === targetId
                );
                linkList.push({
                  source: noteId,
                  target: targetId,
                  bidirectional: isBidirectional,
                });
                linkSet.add(linkKey);
              }

              // 次の深度へ
              if (currentDepth < depth) {
                queue.push({ noteId: targetId, currentDepth: currentDepth + 1 });
              }
            });

            // 被リンクを処理（発リンクで処理されていないもののみ）
            backLinks.forEach((link: any) => {
              const sourceId = link.sourceNoteId;
              const linkKey = `${sourceId}->${noteId}`;
              const reverseLinkKey = `${noteId}->${sourceId}`;

              // ソースノードを追加
              const sourceInfo = noteInfoMap.get(sourceId);
              if (!nodeMap.has(sourceId) && sourceInfo) {
                nodeMap.set(sourceId, {
                  id: sourceId,
                  title: sourceInfo.title,
                  isPinned: sourceInfo.isPinned,
                  isFavorite: sourceInfo.isFavorite,
                  tagCount: sourceInfo.tagCount,
                  linkCount: 0,
                });
              }

              // リンクを追加（まだ追加されていない場合）
              if (!linkSet.has(linkKey) && !linkSet.has(reverseLinkKey)) {
                linkList.push({
                  source: sourceId,
                  target: noteId,
                  bidirectional: false,
                });
                linkSet.add(linkKey);
              }

              // 次の深度へ
              if (currentDepth < depth) {
                queue.push({ noteId: sourceId, currentDepth: currentDepth + 1 });
              }
            });
          } catch (err) {
            console.error(`ノート ${noteId} のリンク取得エラー:`, err);
          }
        }

        if (!isMounted) return;

        setNodes(Array.from(nodeMap.values()));
        setLinks(linkList);
      } catch (err) {
        console.error('グラフデータ取得エラー:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('グラフデータの取得に失敗しました'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchGraphData();

    return () => {
      isMounted = false;
    };
  }, [centerNoteId, depth]);

  return { nodes, links, isLoading, error };
}
