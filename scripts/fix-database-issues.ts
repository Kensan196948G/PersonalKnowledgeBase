import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDatabaseIssues() {
  console.log('='.repeat(80));
  console.log('データベース問題修正スクリプト');
  console.log('実行日時:', new Date().toISOString());
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. フォルダなしノートの確認と処理
    console.log('【1. フォルダに属していないノートの処理】');
    const notesWithoutFolder = await prisma.note.findMany({
      where: {
        folderId: null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
      orderBy: {
        title: 'asc',
      },
    });

    console.log(`フォルダなしノート数: ${notesWithoutFolder.length}`);

    if (notesWithoutFolder.length > 0) {
      console.log('\n対象ノート一覧:');
      notesWithoutFolder.forEach((note, index) => {
        console.log(`  ${index + 1}. ${note.title} (ID: ${note.id})`);
      });

      // 重複ノートを検出（同名のノート）
      const titleCount = new Map<string, number>();
      notesWithoutFolder.forEach((note) => {
        titleCount.set(note.title, (titleCount.get(note.title) || 0) + 1);
      });

      const duplicateTitles = Array.from(titleCount.entries()).filter(([_, count]) => count > 1);

      if (duplicateTitles.length > 0) {
        console.log('\n⚠️ 重複タイトル検出:');
        duplicateTitles.forEach(([title, count]) => {
          console.log(`  - "${title}": ${count}件`);
        });

        console.log('\n重複ノートを削除しますか? (新しい方を残します)');
        console.log('注意: この操作は取り消せません');

        // 重複ノートの処理（古い方を削除）
        for (const [title, _] of duplicateTitles) {
          const duplicates = notesWithoutFolder.filter(n => n.title === title);
          // 作成日時でソート（新しい順）
          duplicates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          // 最新以外を削除
          const toDelete = duplicates.slice(1);
          console.log(`\n  "${title}" の古いバージョンを削除: ${toDelete.length}件`);

          for (const note of toDelete) {
            await prisma.note.delete({
              where: { id: note.id },
            });
            console.log(`    ✓ 削除: ${note.id} (${note.createdAt.toISOString()})`);
          }
        }
      }

      // 残ったフォルダなしノートをプロジェクトフォルダに移動
      const projectFolder = await prisma.folder.findFirst({
        where: { name: 'プロジェクト' },
      });

      if (projectFolder) {
        const remainingNotes = await prisma.note.findMany({
          where: { folderId: null },
        });

        if (remainingNotes.length > 0) {
          console.log(`\n残りの${remainingNotes.length}件のノートを「プロジェクト」フォルダに移動します...`);

          for (const note of remainingNotes) {
            await prisma.note.update({
              where: { id: note.id },
              data: { folderId: projectFolder.id },
            });
            console.log(`  ✓ 移動: ${note.title}`);
          }
        }
      } else {
        console.log('\n⚠️ プロジェクトフォルダが見つかりません。スキップします。');
      }
    } else {
      console.log('✅ フォルダなしノートはありません');
    }
    console.log();

    // 2. 空フォルダの処理
    console.log('【2. 空フォルダの処理】');
    const emptyFolders = await prisma.folder.findMany({
      include: {
        notes: true,
        children: true,
      },
    });

    const trulyEmptyFolders = emptyFolders.filter(
      f => f.notes.length === 0 && f.children.length === 0
    );

    if (trulyEmptyFolders.length > 0) {
      console.log(`空フォルダ数: ${trulyEmptyFolders.length}`);
      trulyEmptyFolders.forEach((folder) => {
        console.log(`  - ${folder.name} (ID: ${folder.id})`);
      });

      console.log('\n空フォルダは保持します（将来的に使用される可能性があるため）');
    } else {
      console.log('✅ 完全な空フォルダはありません');
    }
    console.log();

    // 3. 統計情報の更新
    console.log('【3. 修正後の統計情報】');
    const finalStats = await Promise.all([
      prisma.note.count(),
      prisma.folder.count(),
      prisma.tag.count(),
      prisma.note.count({ where: { folderId: null } }),
    ]);

    console.log(`総ノート数: ${finalStats[0]}`);
    console.log(`総フォルダ数: ${finalStats[1]}`);
    console.log(`総タグ数: ${finalStats[2]}`);
    console.log(`フォルダなしノート数: ${finalStats[3]}`);
    console.log();

    // 4. フォルダ別ノート数
    console.log('【4. フォルダ別ノート数（修正後）】');
    const folders = await prisma.folder.findMany({
      include: {
        notes: true,
        parent: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    for (const folder of folders) {
      const parentPath = folder.parent ? `${folder.parent.name}/` : '';
      const fullPath = `${parentPath}${folder.name}`;
      console.log(`  ${fullPath}: ${folder.notes.length}件`);
    }
    console.log();

    console.log('='.repeat(80));
    console.log('修正完了');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabaseIssues().catch((error) => {
  console.error('実行エラー:', error);
  process.exit(1);
});
