import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log('='.repeat(80));
  console.log('データベース状態確認レポート');
  console.log('実行日時:', new Date().toISOString());
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. 全体統計
    console.log('【1. 全体統計】');
    const totalNotes = await prisma.note.count();
    const totalFolders = await prisma.folder.count();
    const totalTags = await prisma.tag.count();
    console.log(`総ノート数: ${totalNotes}`);
    console.log(`総フォルダ数: ${totalFolders}`);
    console.log(`総タグ数: ${totalTags}`);
    console.log();

    // 2. フォルダ別ノート数（階層構造を考慮）
    console.log('【2. フォルダ別ノート数】');
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
      console.log(`  ${fullPath} (ID: ${folder.id}): ${folder.notes.length}件`);
    }
    console.log();

    // 3. フォルダIDがnullのノート
    console.log('【3. フォルダに属していないノート】');
    const notesWithoutFolder = await prisma.note.findMany({
      where: {
        folderId: null,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.log(`フォルダなしノート数: ${notesWithoutFolder.length}`);
    if (notesWithoutFolder.length > 0) {
      console.log('最新10件:');
      notesWithoutFolder.slice(0, 10).forEach((note) => {
        const tagNames = note.tags.map(t => t.tag.name).join(', ');
        console.log(`  - ${note.title} (ID: ${note.id}, タグ: ${tagNames || 'なし'})`);
      });
    }
    console.log();

    // 4. タグ別ノート数（特定タグ）
    console.log('【4. 特定タグ別ノート数】');
    const importantTags = ['OneNote Import', 'Batch Import', 'PDF Import', '日記', '2025年'];

    for (const tagName of importantTags) {
      const tag = await prisma.tag.findFirst({
        where: { name: tagName },
        include: {
          notes: {
            include: {
              note: {
                include: {
                  folder: true,
                },
              },
            },
          },
        },
      });

      if (tag) {
        console.log(`\n  タグ: "${tagName}" (${tag.notes.length}件)`);

        // フォルダ別集計
        const folderCount = new Map<string, number>();
        tag.notes.forEach((noteTag) => {
          const folderName = noteTag.note.folder?.name || '(フォルダなし)';
          folderCount.set(folderName, (folderCount.get(folderName) || 0) + 1);
        });

        console.log('  フォルダ別分布:');
        for (const [folderName, count] of folderCount) {
          console.log(`    - ${folderName}: ${count}件`);
        }
      } else {
        console.log(`\n  タグ: "${tagName}" - 見つかりませんでした`);
      }
    }
    console.log();

    // 5. OneNoteインポートノートの詳細
    console.log('【5. OneNoteインポートノートの詳細】');
    const oneNoteImportTag = await prisma.tag.findFirst({
      where: { name: 'OneNote Import' },
    });

    if (oneNoteImportTag) {
      const oneNoteNotes = await prisma.note.findMany({
        where: {
          tags: {
            some: {
              tagId: oneNoteImportTag.id,
            },
          },
        },
        include: {
          folder: true,
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log(`OneNote Import ノート総数: ${oneNoteNotes.length}`);

      // フォルダ別集計
      const folderDist = new Map<string, number>();
      oneNoteNotes.forEach((note) => {
        const folderName = note.folder?.name || '(フォルダなし)';
        folderDist.set(folderName, (folderDist.get(folderName) || 0) + 1);
      });

      console.log('\nフォルダ別分布:');
      for (const [folderName, count] of Array.from(folderDist).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${folderName}: ${count}件`);
      }

      // サンプル表示
      console.log('\n最新5件のサンプル:');
      oneNoteNotes.slice(0, 5).forEach((note) => {
        console.log(`  - ${note.title}`);
        console.log(`    フォルダ: ${note.folder?.name || '(なし)'}`);
        console.log(`    タグ: ${note.tags.map(t => t.tag.name).join(', ')}`);
        console.log(`    作成日: ${note.createdAt.toISOString()}`);
        console.log();
      });
    }
    console.log();

    // 6. 2025年関連フォルダの構造
    console.log('【6. 2025年フォルダ構造】');
    const year2025Folder = await prisma.folder.findFirst({
      where: { name: '2025年' },
      include: {
        children: {
          include: {
            notes: true,
          },
        },
        notes: true,
      },
    });

    if (year2025Folder) {
      console.log(`2025年フォルダ (ID: ${year2025Folder.id})`);
      console.log(`  直下のノート: ${year2025Folder.notes.length}件`);
      console.log(`  サブフォルダ数: ${year2025Folder.children.length}`);

      if (year2025Folder.children.length > 0) {
        console.log('\n  サブフォルダ一覧:');
        for (const child of year2025Folder.children) {
          console.log(`    - ${child.name}: ${child.notes.length}件`);
        }
      }
    } else {
      console.log('2025年フォルダが見つかりませんでした');
    }
    console.log();

    // 7. 問題検出
    console.log('【7. 問題検出】');
    const issues: string[] = [];

    if (notesWithoutFolder.length > 0) {
      issues.push(`⚠️ ${notesWithoutFolder.length}件のノートがフォルダに属していません`);
    }

    // 孤立したフォルダ（ノート0件）
    const emptyFolders = folders.filter(f => f.notes.length === 0);
    if (emptyFolders.length > 0) {
      issues.push(`⚠️ ${emptyFolders.length}件の空フォルダがあります: ${emptyFolders.map(f => f.name).join(', ')}`);
    }

    // 同名フォルダ
    const folderNames = folders.map(f => f.name);
    const duplicates = folderNames.filter((name, index) => folderNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      issues.push(`⚠️ 同名フォルダが存在します: ${[...new Set(duplicates)].join(', ')}`);
    }

    if (issues.length === 0) {
      console.log('✅ 特に問題は検出されませんでした');
    } else {
      console.log('検出された問題:');
      issues.forEach((issue) => console.log(`  ${issue}`));
    }
    console.log();

    console.log('='.repeat(80));
    console.log('レポート終了');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus().catch((error) => {
  console.error('実行エラー:', error);
  process.exit(1);
});
