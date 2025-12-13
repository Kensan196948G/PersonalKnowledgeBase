/**
 * データベース確認スクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Checking database contents...\n');

  // フォルダ確認
  const folders = await prisma.folder.findMany({
    include: {
      notes: true,
    },
  });
  console.log(`📁 Folders (${folders.length}):`);
  folders.forEach((folder) => {
    console.log(`   - ${folder.name} (${folder.notes.length} notes)`);
  });

  // タグ確認
  const tags = await prisma.tag.findMany({
    include: {
      notes: true,
    },
  });
  console.log(`\n🏷️  Tags (${tags.length}):`);
  tags.forEach((tag) => {
    console.log(`   - ${tag.name} (${tag.color}) - ${tag.notes.length} notes`);
  });

  // ノート確認
  const notes = await prisma.note.findMany({
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
      folder: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  console.log(`\n📝 Notes (${notes.length}):`);
  notes.forEach((note) => {
    const tagNames = note.tags.map((nt) => nt.tag.name).join(', ');
    const folderName = note.folder?.name || '(No folder)';
    const status = [
      note.isPinned ? '📌' : '',
      note.isFavorite ? '⭐' : '',
      note.isArchived ? '📦' : '',
    ]
      .filter(Boolean)
      .join(' ');
    console.log(`   - ${note.title} ${status}`);
    console.log(`     Folder: ${folderName} | Tags: ${tagNames || '(No tags)'}`);
  });

  // テンプレート確認
  const templates = await prisma.template.findMany();
  console.log(`\n📋 Templates (${templates.length}):`);
  templates.forEach((template) => {
    console.log(`   - ${template.name} (${template.category || 'No category'})`);
  });

  console.log('\n✅ Database check completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error checking database:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
