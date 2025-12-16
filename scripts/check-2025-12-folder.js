#!/usr/bin/env node
/**
 * 2025年⑫フォルダのノート数確認スクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 2025年⑫フォルダのノート数確認 ===\n');

  // フォルダ一覧を取得
  const folders = await prisma.folder.findMany({
    where: {
      name: {
        contains: '2025'
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  console.log('【2025年関連フォルダ】');
  folders.forEach(folder => {
    console.log(`  ID: ${folder.id}`);
    console.log(`  Name: ${folder.name}`);
    console.log(`  ParentID: ${folder.parentId || 'なし'}`);
    console.log('');
  });

  // 2025年⑫フォルダを特定
  const targetFolder = folders.find(f =>
    f.name.includes('2025') && (f.name.includes('⑫') || f.name.includes('12'))
  );

  if (!targetFolder) {
    console.error('❌ 2025年⑫フォルダが見つかりません');
    return;
  }

  console.log(`\n【ターゲットフォルダ】`);
  console.log(`  ID: ${targetFolder.id}`);
  console.log(`  Name: ${targetFolder.name}\n`);

  // ノート数を取得
  const notes = await prisma.note.findMany({
    where: {
      folderId: targetFolder.id
    },
    select: {
      id: true,
      title: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`【ノート一覧】 合計: ${notes.length}件\n`);
  notes.forEach((note, index) => {
    console.log(`  ${index + 1}. ${note.title}`);
    console.log(`     ID: ${note.id}`);
    console.log(`     作成日: ${note.createdAt.toISOString()}`);
    console.log('');
  });

  console.log(`\n✅ 2025年⑫フォルダには ${notes.length} 件のノートがあります`);
}

main()
  .catch(e => {
    console.error('❌ エラー:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
