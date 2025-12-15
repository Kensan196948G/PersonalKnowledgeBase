import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  2025年フォルダをOneNoteの子に移動');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. OneNoteフォルダを取得
  const oneNoteFolder = await prisma.folder.findFirst({
    where: { name: 'OneNote' }
  });

  if (!oneNoteFolder) {
    console.log('❌ OneNoteフォルダが見つかりません');
    return;
  }

  console.log(`✅ OneNoteフォルダ発見:`);
  console.log(`   ID: ${oneNoteFolder.id}\n`);

  // 2. 2025年フォルダを取得
  const year2025Folder = await prisma.folder.findFirst({
    where: { name: '2025年' }
  });

  if (!year2025Folder) {
    console.log('❌ 2025年フォルダが見つかりません');
    return;
  }

  console.log(`✅ 2025年フォルダ発見:`);
  console.log(`   ID: ${year2025Folder.id}`);
  console.log(`   現在の親ID: ${year2025Folder.parentId || 'なし（ルート）'}\n`);

  // 3. 2025年フォルダをOneNoteの子に移動
  await prisma.folder.update({
    where: { id: year2025Folder.id },
    data: { parentId: oneNoteFolder.id }
  });

  console.log(`✅ 2025年フォルダをOneNoteの子に移動しました`);
  console.log(`   新しい親ID: ${oneNoteFolder.id}\n`);

  // 4. 修正後の構造を確認
  const updatedOneNote = await prisma.folder.findUnique({
    where: { id: oneNoteFolder.id },
    include: {
      children: {
        include: {
          children: {
            include: {
              _count: {
                select: { notes: true }
              }
            },
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      }
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  修正後の階層構造');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`📁 ${updatedOneNote.name}`);
  updatedOneNote.children.forEach(child => {
    console.log(`  └─ 📁 ${child.name}`);
    if (child.children.length > 0) {
      child.children.forEach((grandchild, index) => {
        const isLast = index === child.children.length - 1;
        const prefix = isLast ? '      └─' : '      ├─';
        console.log(`${prefix} 📁 ${grandchild.name} (${grandchild._count.notes}件)`);
      });
    }
  });

  console.log('\n✅ フォルダ階層構造の修正が完了しました！');
  console.log('\n次のステップ:');
  console.log('1. ブラウザでF5キーを押してリロード');
  console.log('2. 左側で「OneNote」→「2025年」→「2025年⑫」と展開');
  console.log('3. 「2025年⑫13」をクリック');
  console.log('4. 右側に正しい内容が表示されることを確認');

  await prisma.$disconnect();
}

main().catch(console.error);
