import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  フォルダ階層構造修正');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. 2025年フォルダを取得（または作成）
  let year2025Folder = await prisma.folder.findFirst({
    where: { name: '2025年' }
  });

  if (!year2025Folder) {
    console.log('❌ 2025年フォルダが見つかりません');
    return;
  }

  console.log(`✅ 2025年フォルダ発見:`);
  console.log(`   ID: ${year2025Folder.id}`);
  console.log(`   親ID: ${year2025Folder.parentId || 'なし（ルート）'}\n`);

  // 2. 2025年フォルダをルートに移動（OneNoteの子から外す）
  if (year2025Folder.parentId) {
    await prisma.folder.update({
      where: { id: year2025Folder.id },
      data: { parentId: null }
    });
    console.log('✅ 2025年フォルダをルートに移動しました\n');

    // 再取得
    year2025Folder = await prisma.folder.findUnique({
      where: { id: year2025Folder.id }
    });
  }

  // 3. 2025年①～⑫フォルダを2025年の子に移動
  const monthFolders = await prisma.folder.findMany({
    where: {
      name: {
        startsWith: '2025年'
      },
      NOT: {
        name: '2025年'
      }
    }
  });

  console.log(`月フォルダ数: ${monthFolders.length}\n`);

  for (const monthFolder of monthFolders) {
    if (monthFolder.parentId !== year2025Folder.id) {
      await prisma.folder.update({
        where: { id: monthFolder.id },
        data: { parentId: year2025Folder.id }
      });

      console.log(`✅ ${monthFolder.name} を 2025年 の子に移動`);
      console.log(`   ID: ${monthFolder.id}`);
      console.log(`   旧親ID: ${monthFolder.parentId}`);
      console.log(`   新親ID: ${year2025Folder.id}\n`);
    } else {
      console.log(`ℹ️  ${monthFolder.name} は既に正しい位置にあります\n`);
    }
  }

  // 4. 修正後の構造を表示
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  修正後の構造');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const updatedYear2025 = await prisma.folder.findUnique({
    where: { id: year2025Folder.id },
    include: {
      children: {
        include: {
          _count: {
            select: { notes: true }
          }
        },
        orderBy: { name: 'asc' }
      }
    }
  });

  console.log(`📁 ${updatedYear2025.name}`);
  updatedYear2025.children.forEach(child => {
    console.log(`  ├─ 📁 ${child.name} (${child._count.notes}件)`);
  });

  console.log('\n✅ フォルダ階層構造の修正が完了しました！');

  await prisma.$disconnect();
}

main().catch(console.error);
