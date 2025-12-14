/**
 * Personal Knowledge Base - Phase 3 Link Testing Seed Script
 * ノート間リンクのテストデータ投入スクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔗 Starting Phase 3 link seed...');

  // 既存のリンクデータをクリーンアップ
  console.log('🧹 Cleaning existing link data...');
  await prisma.noteLink.deleteMany();

  // テスト用ノート作成（リンク関係を作るため）
  console.log('📝 Creating test notes for linking...');

  const reactNote = await prisma.note.create({
    data: {
      title: 'React開発メモ',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'React開発メモ' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Reactの基本的な開発パターンについて。' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '関連: [[TypeScript基礎]]、[[フロントエンド設計]]' },
            ],
          },
        ],
      }),
      isPinned: false,
      isFavorite: false,
      isArchived: false,
    },
  });

  const typescriptNote = await prisma.note.create({
    data: {
      title: 'TypeScript基礎',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'TypeScript基礎' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'TypeScriptの型システムと基本文法について。' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'これは[[React開発メモ]]や[[Node.js開発]]で使用される。' },
            ],
          },
        ],
      }),
      isPinned: false,
      isFavorite: false,
      isArchived: false,
    },
  });

  const frontendNote = await prisma.note.create({
    data: {
      title: 'フロントエンド設計',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'フロントエンド設計' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'フロントエンドアーキテクチャのベストプラクティス。' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '[[React開発メモ]]を参照。状態管理については[[状態管理パターン]]も確認。' },
            ],
          },
        ],
      }),
      isPinned: false,
      isFavorite: false,
      isArchived: false,
    },
  });

  const nodejsNote = await prisma.note.create({
    data: {
      title: 'Node.js開発',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Node.js開発' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Node.jsでのバックエンド開発について。' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '[[TypeScript基礎]]を前提とする。' },
            ],
          },
        ],
      }),
      isPinned: false,
      isFavorite: false,
      isArchived: false,
    },
  });

  const stateManagementNote = await prisma.note.create({
    data: {
      title: '状態管理パターン',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: '状態管理パターン' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'アプリケーション状態管理のパターン集。' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: '[[React開発メモ]]や[[フロントエンド設計]]で活用。' },
            ],
          },
        ],
      }),
      isPinned: false,
      isFavorite: false,
      isArchived: false,
    },
  });

  console.log(`✅ Created 5 test notes`);

  // ノート間リンクの作成
  console.log('🔗 Creating note links...');

  // React開発メモ → TypeScript基礎
  await prisma.noteLink.create({
    data: {
      sourceNoteId: reactNote.id,
      targetNoteId: typescriptNote.id,
      linkText: 'TypeScript基礎',
      context: '関連: [[TypeScript基礎]]、[[フロントエンド設計]]',
    },
  });

  // React開発メモ → フロントエンド設計
  await prisma.noteLink.create({
    data: {
      sourceNoteId: reactNote.id,
      targetNoteId: frontendNote.id,
      linkText: 'フロントエンド設計',
      context: '関連: [[TypeScript基礎]]、[[フロントエンド設計]]',
    },
  });

  // TypeScript基礎 → React開発メモ
  await prisma.noteLink.create({
    data: {
      sourceNoteId: typescriptNote.id,
      targetNoteId: reactNote.id,
      linkText: 'React開発メモ',
      context: 'これは[[React開発メモ]]や[[Node.js開発]]で使用される。',
    },
  });

  // TypeScript基礎 → Node.js開発
  await prisma.noteLink.create({
    data: {
      sourceNoteId: typescriptNote.id,
      targetNoteId: nodejsNote.id,
      linkText: 'Node.js開発',
      context: 'これは[[React開発メモ]]や[[Node.js開発]]で使用される。',
    },
  });

  // フロントエンド設計 → React開発メモ
  await prisma.noteLink.create({
    data: {
      sourceNoteId: frontendNote.id,
      targetNoteId: reactNote.id,
      linkText: 'React開発メモ',
      context: '[[React開発メモ]]を参照。状態管理については[[状態管理パターン]]も確認。',
    },
  });

  // フロントエンド設計 → 状態管理パターン
  await prisma.noteLink.create({
    data: {
      sourceNoteId: frontendNote.id,
      targetNoteId: stateManagementNote.id,
      linkText: '状態管理パターン',
      context: '[[React開発メモ]]を参照。状態管理については[[状態管理パターン]]も確認。',
    },
  });

  // Node.js開発 → TypeScript基礎
  await prisma.noteLink.create({
    data: {
      sourceNoteId: nodejsNote.id,
      targetNoteId: typescriptNote.id,
      linkText: 'TypeScript基礎',
      context: '[[TypeScript基礎]]を前提とする。',
    },
  });

  // 状態管理パターン → React開発メモ
  await prisma.noteLink.create({
    data: {
      sourceNoteId: stateManagementNote.id,
      targetNoteId: reactNote.id,
      linkText: 'React開発メモ',
      context: '[[React開発メモ]]や[[フロントエンド設計]]で活用。',
    },
  });

  // 状態管理パターン → フロントエンド設計
  await prisma.noteLink.create({
    data: {
      sourceNoteId: stateManagementNote.id,
      targetNoteId: frontendNote.id,
      linkText: 'フロントエンド設計',
      context: '[[React開発メモ]]や[[フロントエンド設計]]で活用。',
    },
  });

  console.log(`✅ Created 9 note links`);

  console.log('\n🎉 Phase 3 link seed completed successfully!');
  console.log('\n📊 Link Summary:');
  console.log(`   - Notes: 5`);
  console.log(`   - Links: 9`);
  console.log('\n🔗 Link Network:');
  console.log('   React開発メモ ──→ TypeScript基礎, フロントエンド設計');
  console.log('   TypeScript基礎 ──→ React開発メモ, Node.js開発');
  console.log('   フロントエンド設計 ──→ React開発メモ, 状態管理パターン');
  console.log('   Node.js開発 ──→ TypeScript基礎');
  console.log('   状態管理パターン ──→ React開発メモ, フロントエンド設計');

  // バックリンク情報の表示
  console.log('\n🔙 Backlink Summary:');
  const notes = [reactNote, typescriptNote, frontendNote, nodejsNote, stateManagementNote];

  for (const note of notes) {
    const outgoingLinks = await prisma.noteLink.count({
      where: { sourceNoteId: note.id },
    });
    const incomingLinks = await prisma.noteLink.count({
      where: { targetNoteId: note.id },
    });
    console.log(`   ${note.title}: ${outgoingLinks} outgoing, ${incomingLinks} incoming`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during link seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
