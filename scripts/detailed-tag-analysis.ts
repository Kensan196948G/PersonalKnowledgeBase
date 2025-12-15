import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function detailedTagAnalysis() {
  console.log('='.repeat(80));
  console.log('詳細タグ分析レポート');
  console.log('実行日時:', new Date().toISOString());
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. 全タグ一覧
    console.log('【1. 全タグ一覧】');
    const allTags = await prisma.tag.findMany({
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
      orderBy: {
        name: 'asc',
      },
    });

    console.log(`総タグ数: ${allTags.length}`);
    console.log();

    for (const tag of allTags) {
      console.log(`タグ: "${tag.name}" (ID: ${tag.id})`);
      console.log(`  ノート数: ${tag.notes.length}件`);
      console.log(`  色: ${tag.color || '未設定'}`);
      console.log(`  作成日: ${tag.createdAt.toISOString()}`);

      if (tag.notes.length > 0) {
        // フォルダ別分布
        const folderDist = new Map<string, number>();
        tag.notes.forEach((noteTag) => {
          const folderName = noteTag.note.folder?.name || '(フォルダなし)';
          folderDist.set(folderName, (folderDist.get(folderName) || 0) + 1);
        });

        console.log('  フォルダ別分布:');
        for (const [folderName, count] of Array.from(folderDist).sort((a, b) => b[1] - a[1])) {
          console.log(`    - ${folderName}: ${count}件`);
        }

        // サンプルノート（最大3件）
        console.log('  サンプルノート:');
        tag.notes.slice(0, 3).forEach((noteTag) => {
          console.log(`    - ${noteTag.note.title} (${noteTag.note.folder?.name || 'フォルダなし'})`);
        });
      }
      console.log();
    }

    // 2. タグなしノート
    console.log('【2. タグなしノート】');
    const notesWithoutTags = await prisma.note.findMany({
      where: {
        tags: {
          none: {},
        },
      },
      include: {
        folder: true,
      },
      orderBy: {
        title: 'asc',
      },
    });

    console.log(`タグなしノート数: ${notesWithoutTags.length}`);

    if (notesWithoutTags.length > 0) {
      // フォルダ別分布
      const folderDist = new Map<string, number>();
      notesWithoutTags.forEach((note) => {
        const folderName = note.folder?.name || '(フォルダなし)';
        folderDist.set(folderName, (folderDist.get(folderName) || 0) + 1);
      });

      console.log('\nフォルダ別分布:');
      for (const [folderName, count] of Array.from(folderDist).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${folderName}: ${count}件`);
      }

      console.log('\nサンプル（最新10件）:');
      notesWithoutTags.slice(0, 10).forEach((note) => {
        console.log(`  - ${note.title} (${note.folder?.name || 'フォルダなし'})`);
      });
    }
    console.log();

    // 3. ノートのコンテンツパターン分析（インポート元の推測）
    console.log('【3. インポート元推測分析】');

    // コンテンツに特定パターンを含むノートを検索
    const allNotes = await prisma.note.findMany({
      include: {
        folder: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const patterns = [
      { name: 'OneNote風', pattern: /OneNote/i },
      { name: 'PDF風', pattern: /\.pdf|PDF/i },
      { name: 'インポート言及', pattern: /import|インポート/i },
    ];

    for (const { name, pattern } of patterns) {
      const matches = allNotes.filter(
        note => pattern.test(note.title) || pattern.test(note.content)
      );

      console.log(`\n"${name}" パターンマッチ: ${matches.length}件`);
      if (matches.length > 0) {
        matches.slice(0, 5).forEach((note) => {
          const tagNames = note.tags.map(t => t.tag.name).join(', ');
          console.log(`  - ${note.title}`);
          console.log(`    フォルダ: ${note.folder?.name || 'なし'}`);
          console.log(`    タグ: ${tagNames || 'なし'}`);
        });
      }
    }
    console.log();

    // 4. フォルダ別タグ統計
    console.log('【4. フォルダ別タグ統計】');
    const folders = await prisma.folder.findMany({
      include: {
        notes: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
        parent: true,
      },
    });

    for (const folder of folders) {
      const parentPath = folder.parent ? `${folder.parent.name}/` : '';
      const fullPath = `${parentPath}${folder.name}`;

      const taggedNotes = folder.notes.filter(note => note.tags.length > 0);
      const taglessNotes = folder.notes.filter(note => note.tags.length === 0);

      console.log(`\n${fullPath}:`);
      console.log(`  総ノート: ${folder.notes.length}件`);
      console.log(`  タグ付き: ${taggedNotes.length}件`);
      console.log(`  タグなし: ${taglessNotes.length}件`);

      if (taggedNotes.length > 0) {
        const tagCount = new Map<string, number>();
        taggedNotes.forEach((note) => {
          note.tags.forEach((t) => {
            tagCount.set(t.tag.name, (tagCount.get(t.tag.name) || 0) + 1);
          });
        });

        console.log('  使用されているタグ:');
        for (const [tagName, count] of Array.from(tagCount).sort((a, b) => b[1] - a[1])) {
          console.log(`    - ${tagName}: ${count}件`);
        }
      }
    }
    console.log();

    console.log('='.repeat(80));
    console.log('分析完了');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('エラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

detailedTagAnalysis().catch((error) => {
  console.error('実行エラー:', error);
  process.exit(1);
});
