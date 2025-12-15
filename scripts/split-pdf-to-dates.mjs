#!/usr/bin/env node
/**
 * PDF統合ノートを日付ごとに分割して各日付ノートに配置
 *
 * 「今年が・・・始まった。」ノート（974ブロック、487ページ）を
 * 日付ごとに分割して、対応する日付テンプレートノートに内容を配置します。
 *
 * 実行: node scripts/split-pdf-to-dates.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 丸数字マッピング
const CIRCLE_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

/**
 * 日付パターンから年月日を抽出
 */
function extractDate(text) {
  // 2025年1月1日 パターン
  const match1 = text.match(/(2025)年(\d{1,2})月(\d{1,2})日/);
  if (match1) {
    return {
      year: parseInt(match1[1]),
      month: parseInt(match1[2]),
      day: parseInt(match1[3])
    };
  }

  // 1月1日 パターン（年は2025と仮定）
  const match2 = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (match2) {
    return {
      year: 2025,
      month: parseInt(match2[1]),
      day: parseInt(match2[2])
    };
  }

  return null;
}

/**
 * 日付ノートタイトルを生成（2025年①01形式）
 */
function generateNoteTitle(year, month, day) {
  const monthCircle = CIRCLE_NUMBERS[month - 1];
  const dayStr = String(day).padStart(2, '0');
  return `${year}年${monthCircle}${dayStr}`;
}

/**
 * メイン処理
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  PDF統合ノート → 日付ノート分割');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. 統合PDFノートを取得
    const pdfNote = await prisma.note.findFirst({
      where: { title: '今年が・・・始まった。' },
      orderBy: { createdAt: 'desc' }
    });

    if (!pdfNote) {
      console.log('❌ 「今年が・・・始まった。」ノートが見つかりません');
      return;
    }

    console.log(`✅ PDF統合ノート発見:`);
    console.log(`   ID: ${pdfNote.id}`);
    console.log(`   内容サイズ: ${pdfNote.content.length}文字`);

    const pdfContent = JSON.parse(pdfNote.content);
    const blocks = pdfContent.content || [];

    console.log(`   ブロック数: ${blocks.length}\n`);

    // 2. ブロックを日付ごとにグループ化
    console.log('📝 ブロックを日付ごとにグループ化中...\n');

    const dateGroups = {}; // { "2025-01-01": [block1, block2, ...], ... }
    let currentDate = null;
    let currentBlocks = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      if (block.type === 'paragraph' && block.content && block.content[0] && block.content[0].text) {
        const text = block.content[0].text;

        // ページ区切りをスキップ
        if (/^-- \d+ of \d+ --$/.test(text.trim())) {
          continue;
        }

        // 日付パターンを検出
        const dateInfo = extractDate(text);

        if (dateInfo) {
          // 新しい日付セクション開始
          if (currentDate && currentBlocks.length > 0) {
            // 前の日付のブロックを保存
            dateGroups[currentDate] = currentBlocks;
          }

          // 新しい日付セクション開始
          currentDate = `${dateInfo.year}-${String(dateInfo.month).padStart(2, '0')}-${String(dateInfo.day).padStart(2, '0')}`;
          currentBlocks = [block];

          console.log(`  📅 ${currentDate} 開始（ブロック${i}）`);
        } else {
          // 既存セクションにブロックを追加
          if (currentDate) {
            currentBlocks.push(block);
          }
        }
      }
    }

    // 最後のセクションを保存
    if (currentDate && currentBlocks.length > 0) {
      dateGroups[currentDate] = currentBlocks;
    }

    const dateCount = Object.keys(dateGroups).length;
    console.log(`\n✅ ${dateCount}個の日付セクションを検出しました\n`);

    // 3. 各日付ノートに内容を配置
    console.log('📝 日付ノートに内容を配置中...\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const [dateStr, dateBlocks] of Object.entries(dateGroups)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const noteTitle = generateNoteTitle(year, month, day);

      // 対応する日付ノートを検索
      const dateNote = await prisma.note.findFirst({
        where: {
          title: noteTitle
        }
      });

      if (dateNote) {
        // ノートの内容を更新
        const updatedContent = {
          type: 'doc',
          content: dateBlocks
        };

        await prisma.note.update({
          where: { id: dateNote.id },
          data: {
            content: JSON.stringify(updatedContent),
            updatedAt: new Date() // 更新日時を現在に設定
          }
        });

        updatedCount++;

        if (updatedCount <= 5 || updatedCount % 30 === 0) {
          console.log(`  ✅ ${noteTitle} - ${dateBlocks.length}ブロック配置`);
        } else if (updatedCount === 6) {
          console.log(`     ...`);
        }
      } else {
        notFoundCount++;
        console.log(`  ⚠️  ${noteTitle} - ノートが見つかりません`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('  処理結果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  検出した日付: ${dateCount}個`);
    console.log(`  更新したノート: ${updatedCount}個`);
    console.log(`  見つからなかったノート: ${notFoundCount}個`);

    if (updatedCount > 0) {
      console.log('\n✅ 日付ノートへの内容配置が完了しました！');
      console.log('\n次のステップ:');
      console.log('1. WebUIでノート一覧を更新（F5キー）');
      console.log('2. 「2025年①01」などのノートを開いて内容を確認');
      console.log('3. 元のPDF統合ノート「今年が・・・始まった。」を削除');
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
main()
  .then(() => {
    console.log('\n🎉 完了！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
