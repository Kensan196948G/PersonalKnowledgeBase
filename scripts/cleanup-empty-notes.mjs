#!/usr/bin/env node
/**
 * 空の「無題のノート」削除スクリプト
 *
 * 以下の条件に該当するノートを検索・削除:
 * 1. content.length === 0 (空文字列)
 * 2. JSONパース失敗（不正なコンテンツ）
 * 3. TipTap JSONが空（<p></p>のみ）
 *
 * 使い方:
 *   node scripts/cleanup-empty-notes.mjs         # 対話モード（削除前に確認）
 *   node scripts/cleanup-empty-notes.mjs --yes   # 自動削除モード（確認なし）
 *   node scripts/cleanup-empty-notes.mjs -y      # 自動削除モード（短縮形）
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

// ターミナル入力用インターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * ユーザーに確認を求める
 */
function confirm(question) {
  return new Promise((resolve) => {
    rl.question(`${question} (y/N): `, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * TipTap JSONコンテンツが空かどうか判定
 */
function isEmptyTipTapContent(content) {
  try {
    const parsed = JSON.parse(content);

    // 基本的な空構造チェック
    if (!parsed.type || parsed.type !== 'doc') {
      return false;
    }

    // contentが存在しない、または空配列
    if (!parsed.content || parsed.content.length === 0) {
      return true;
    }

    // contentが1つのparagraphのみで、テキストが空
    if (parsed.content.length === 1) {
      const node = parsed.content[0];
      if (node.type === 'paragraph') {
        // contentが無い、または空配列
        if (!node.content || node.content.length === 0) {
          return true;
        }
        // contentが1つのtextノードで、テキストが空白のみ
        if (node.content.length === 1 && node.content[0].type === 'text') {
          const text = node.content[0].text || '';
          if (text.trim() === '') {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    // JSONパース失敗 = 不正なコンテンツ
    console.warn(`  ⚠️  JSON parse error: ${error.message}`);
    return true;
  }
}

/**
 * 空ノートを検索
 */
async function findEmptyNotes() {
  console.log('🔍 空ノートを検索中...\n');

  const allNotes = await prisma.note.findMany({
    include: {
      tags: {
        include: {
          tag: true
        }
      },
      folder: true,
      attachments: true,
      outgoingLinks: true,
      incomingLinks: true
    }
  });

  const emptyNotes = [];

  for (const note of allNotes) {
    let isEmpty = false;
    let reason = '';

    // 1. content.length === 0
    if (note.content.length === 0) {
      isEmpty = true;
      reason = 'content is empty string';
    }
    // 2. TipTap JSONが空
    else if (isEmptyTipTapContent(note.content)) {
      isEmpty = true;
      reason = 'TipTap content is empty';
    }

    if (isEmpty) {
      emptyNotes.push({
        ...note,
        reason
      });
    }
  }

  return emptyNotes;
}

/**
 * ノート情報を表示
 */
function displayNoteInfo(note, index) {
  const tags = note.tags.map(nt => nt.tag.name).join(', ') || 'なし';
  const folder = note.folder?.name || 'なし';
  const attachments = note.attachments.length;
  const outgoingLinks = note.outgoingLinks.length;
  const incomingLinks = note.incomingLinks.length;

  console.log(`\n[${index + 1}]`);
  console.log(`  ID: ${note.id}`);
  console.log(`  タイトル: ${note.title || '(無題)'}`);
  console.log(`  理由: ${note.reason}`);
  console.log(`  作成日時: ${note.createdAt.toLocaleString('ja-JP')}`);
  console.log(`  更新日時: ${note.updatedAt.toLocaleString('ja-JP')}`);
  console.log(`  タグ: ${tags}`);
  console.log(`  フォルダ: ${folder}`);
  console.log(`  添付ファイル: ${attachments}個`);
  console.log(`  リンク: 発信${outgoingLinks}本 / 受信${incomingLinks}本`);
  console.log(`  ピン留め: ${note.isPinned ? 'あり' : 'なし'}`);
  console.log(`  お気に入り: ${note.isFavorite ? 'あり' : 'なし'}`);
  console.log(`  アーカイブ: ${note.isArchived ? 'あり' : 'なし'}`);
}

/**
 * ノートを削除
 */
async function deleteNotes(noteIds) {
  console.log('\n🗑️  ノートを削除中...\n');

  let deletedCount = 0;
  let errorCount = 0;

  for (const noteId of noteIds) {
    try {
      await prisma.note.delete({
        where: { id: noteId }
      });
      deletedCount++;
      console.log(`  ✅ 削除成功: ${noteId}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ 削除失敗: ${noteId} - ${error.message}`);
    }
  }

  return { deletedCount, errorCount };
}

/**
 * メイン処理
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  空ノート削除スクリプト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // コマンドライン引数から --yes フラグを取得
  const autoConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

  try {
    // 1. 空ノートを検索
    const emptyNotes = await findEmptyNotes();

    if (emptyNotes.length === 0) {
      console.log('✅ 空ノートは見つかりませんでした。');
      return;
    }

    console.log(`📋 ${emptyNotes.length}件の空ノートが見つかりました:\n`);

    // 2. ノート情報を表示
    emptyNotes.forEach((note, index) => {
      displayNoteInfo(note, index);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 3. ユーザー確認
    let shouldDelete = autoConfirm;

    if (!autoConfirm) {
      shouldDelete = await confirm(`\n${emptyNotes.length}件のノートを削除しますか？`);
    } else {
      console.log(`\n自動確認モード（--yes）: ${emptyNotes.length}件のノートを削除します。`);
    }

    if (!shouldDelete) {
      console.log('\n❌ 削除をキャンセルしました。');
      return;
    }

    // 4. 削除実行
    const noteIds = emptyNotes.map(note => note.id);
    const { deletedCount, errorCount } = await deleteNotes(noteIds);

    // 5. 結果レポート
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  削除結果レポート');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  対象ノート数: ${emptyNotes.length}件`);
    console.log(`  削除成功: ${deletedCount}件`);
    console.log(`  削除失敗: ${errorCount}件`);

    if (deletedCount > 0) {
      console.log('\n✅ 空ノートの削除が完了しました。');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// 実行
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
