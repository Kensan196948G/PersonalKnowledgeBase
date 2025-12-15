#!/usr/bin/env node
/**
 * 2025年日記フォルダ構造作成スクリプト
 *
 * OneNote構造:
 * ブック名: 2025年
 * ├─ セクション: 2025年① (1月)
 * │  ├─ ページ: 2025年①01 (1月1日)
 * │  ├─ ページ: 2025年①02 (1月2日)
 * │  ...
 * │  └─ ページ: 2025年①31 (1月31日)
 * ├─ セクション: 2025年② (2月)
 * ...
 * └─ セクション: 2025年⑫ (12月)
 *
 * 実行: node scripts/create-2025-diary-structure.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 丸数字マッピング（①～⑫）
const CIRCLE_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];

// 各月の日数
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // 2025年は平年（2月28日）だが、29日まで作成

/**
 * フォルダ構造を作成
 */
async function createDiaryStructure() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  2025年日記フォルダ構造作成');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // 1. ルートフォルダ「2025年」を作成または取得
    let rootFolder = await prisma.folder.findFirst({
      where: { name: '2025年', parentId: null }
    });

    if (!rootFolder) {
      rootFolder = await prisma.folder.create({
        data: {
          name: '2025年'
        }
      });
      console.log(`✅ ルートフォルダ作成: 2025年 (ID: ${rootFolder.id})`);
    } else {
      console.log(`ℹ️  ルートフォルダ既存: 2025年 (ID: ${rootFolder.id})`);
    }

    // 2. 月ごとのサブフォルダを作成（①～⑫）
    const monthFolders = [];

    for (let month = 1; month <= 12; month++) {
      const monthName = `2025年${CIRCLE_NUMBERS[month - 1]}`;

      let monthFolder = await prisma.folder.findFirst({
        where: {
          name: monthName,
          parentId: rootFolder.id
        }
      });

      if (!monthFolder) {
        monthFolder = await prisma.folder.create({
          data: {
            name: monthName,
            parentId: rootFolder.id
          }
        });
        console.log(`  ✅ 月フォルダ作成: ${monthName} (ID: ${monthFolder.id})`);
      } else {
        console.log(`  ℹ️  月フォルダ既存: ${monthName} (ID: ${monthFolder.id})`);
      }

      monthFolders.push(monthFolder);
    }

    // 3. 各月のページ（日付）を作成
    console.log('\n📝 日付ページ作成中...\n');

    let totalNotesCreated = 0;
    let totalNotesExisting = 0;

    for (let month = 1; month <= 12; month++) {
      const monthFolder = monthFolders[month - 1];
      const daysInMonth = DAYS_IN_MONTH[month - 1];

      // 2月の日数を調整（2025年は平年なので28日まで）
      const actualDays = month === 2 ? 28 : daysInMonth;

      for (let day = 1; day <= actualDays; day++) {
        const dayStr = String(day).padStart(2, '0');
        const noteTitle = `2025年${CIRCLE_NUMBERS[month - 1]}${dayStr}`;

        // 既存ノートチェック
        const existingNote = await prisma.note.findFirst({
          where: {
            title: noteTitle,
            folderId: monthFolder.id
          }
        });

        if (!existingNote) {
          // 日付オブジェクト作成
          const date = new Date(2025, month - 1, day);

          // ノート作成（空のコンテンツ）
          const note = await prisma.note.create({
            data: {
              title: noteTitle,
              content: JSON.stringify({
                type: 'doc',
                content: [
                  {
                    type: 'paragraph',
                    content: []
                  }
                ]
              }),
              folderId: monthFolder.id,
              createdAt: date,
              updatedAt: date
            }
          });

          totalNotesCreated++;

          if (day === 1 || day === actualDays) {
            console.log(`  ✅ ${noteTitle} (${date.toLocaleDateString('ja-JP')})`);
          } else if (day === 2) {
            console.log(`     ...`);
          }
        } else {
          totalNotesExisting++;
        }
      }

      console.log(`  ✓ ${CIRCLE_NUMBERS[month - 1]}月: ${actualDays}日分完了\n`);
    }

    // 4. 結果レポート
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  作成結果');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`  ルートフォルダ: 2025年`);
    console.log(`  月フォルダ: ${monthFolders.length}個 (①～⑫)`);
    console.log(`  新規作成ノート: ${totalNotesCreated}個`);
    console.log(`  既存ノート: ${totalNotesExisting}個`);
    console.log(`  総ノート数: ${totalNotesCreated + totalNotesExisting}個 (365日分)`);
    console.log('\n✅ フォルダ構造の作成が完了しました！');

    // 5. 構造を表示
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  作成されたフォルダ構造');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📁 2025年');
    for (let month = 1; month <= 12; month++) {
      const days = month === 2 ? 28 : DAYS_IN_MONTH[month - 1];
      console.log(`  ├─ 📁 2025年${CIRCLE_NUMBERS[month - 1]} (${days}日分)`);
      console.log(`  │   ├─ 📄 2025年${CIRCLE_NUMBERS[month - 1]}01`);
      console.log(`  │   ├─ 📄 2025年${CIRCLE_NUMBERS[month - 1]}02`);
      console.log(`  │   │   ...`);
      console.log(`  │   └─ 📄 2025年${CIRCLE_NUMBERS[month - 1]}${String(days).padStart(2, '0')}`);
    }

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 実行
createDiaryStructure()
  .then(() => {
    console.log('\n🎉 完了！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
