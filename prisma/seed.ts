/**
 * Personal Knowledge Base - Database Seed Script
 * サンプルデータ投入スクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 既存データのクリーンアップ（開発用）
  console.log('🧹 Cleaning existing data...');
  await prisma.noteTag.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.note.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.template.deleteMany();

  // フォルダ作成
  console.log('📁 Creating folders...');
  const dailyNotesFolder = await prisma.folder.create({
    data: {
      name: '日記',
    },
  });

  const projectsFolder = await prisma.folder.create({
    data: {
      name: 'プロジェクト',
    },
  });

  console.log(`✅ Created ${2} folders`);

  // タグ作成
  console.log('🏷️  Creating tags...');
  const importantTag = await prisma.tag.create({
    data: {
      name: '重要',
      color: '#EF4444', // Red
    },
  });

  const ideaTag = await prisma.tag.create({
    data: {
      name: 'アイデア',
      color: '#F59E0B', // Amber
    },
  });

  const todoTag = await prisma.tag.create({
    data: {
      name: 'ToDo',
      color: '#3B82F6', // Blue
    },
  });

  console.log(`✅ Created ${3} tags`);

  // ウェルカムノート作成
  console.log('📝 Creating welcome note...');
  const welcomeNote = await prisma.note.create({
    data: {
      title: 'Personal Knowledge Baseへようこそ',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Personal Knowledge Baseへようこそ' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'このシステムは、あなたの思考と知識を整理するための個人向けナレッジベースです。',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '基本的な使い方' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: 'メモの作成: ' },
                      { type: 'text', text: '左上の「新規ノート」ボタンをクリック' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: '画像の貼り付け: ' },
                      { type: 'text', text: 'Ctrl+V（またはCmd+V）で画像をペースト' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: 'タグの付与: ' },
                      { type: 'text', text: 'ノート上部のタグアイコンから選択' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: 'フォルダ整理: ' },
                      { type: 'text', text: 'ノートをフォルダにドラッグ＆ドロップ' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'エディタの機能' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: '見出し: ' },
                      { type: 'text', text: '# を入力してスペース' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: '箇条書き: ' },
                      { type: 'text', text: '- を入力してスペース' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: 'タスクリスト: ' },
                      { type: 'text', text: '[ ] を入力してスペース' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: '太字: ' },
                      { type: 'text', text: '**テキスト**' },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      { type: 'text', marks: [{ type: 'bold' }], text: '斜体: ' },
                      { type: 'text', text: '*テキスト*' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'ヒント' }],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: '定期的にメモを見直して、タグやフォルダで整理することで、あなたの知識ベースはより価値のあるものになります。',
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'さあ、最初のメモを書き始めましょう！',
              },
            ],
          },
        ],
      }),
      isPinned: true,
      isFavorite: false,
      isArchived: false,
    },
  });

  // ウェルカムノートにタグを付与
  await prisma.noteTag.create({
    data: {
      noteId: welcomeNote.id,
      tagId: importantTag.id,
    },
  });

  console.log(`✅ Created welcome note`);

  // サンプルノート作成（プロジェクトフォルダ内）
  console.log('📝 Creating sample notes...');
  const sampleNote1 = await prisma.note.create({
    data: {
      title: 'サンプルプロジェクト：Personal Knowledge Base',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'プロジェクト概要' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '個人向けのナレッジベースシステム。OneNoteやNotionのような使い心地を目指す。',
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'ToDoリスト' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'データベース設計' }],
                  },
                ],
              },
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'TipTapエディタ統合' }],
                  },
                ],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '検索機能実装' }],
                  },
                ],
              },
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'タグ管理機能' }],
                  },
                ],
              },
            ],
          },
        ],
      }),
      folderId: projectsFolder.id,
      isPinned: false,
      isFavorite: true,
      isArchived: false,
    },
  });

  await prisma.noteTag.createMany({
    data: [
      { noteId: sampleNote1.id, tagId: todoTag.id },
      { noteId: sampleNote1.id, tagId: importantTag.id },
    ],
  });

  // サンプルアイデアノート
  const sampleNote2 = await prisma.note.create({
    data: {
      title: 'アイデア：AI連携機能',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: '将来のAI連携アイデア' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '以下の機能を検討中：',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '自動タグ付け（内容から推測）' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: '関連ノート提案（セマンティック検索）' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'メモの要約生成' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'Q&A機能（ナレッジベースに質問）' }],
                  },
                ],
              },
            ],
          },
        ],
      }),
      isPinned: false,
      isFavorite: false,
      isArchived: false,
    },
  });

  await prisma.noteTag.create({
    data: {
      noteId: sampleNote2.id,
      tagId: ideaTag.id,
    },
  });

  console.log(`✅ Created ${2} sample notes`);

  // テンプレート作成
  console.log('📋 Creating templates...');
  await prisma.template.create({
    data: {
      name: '議事録',
      category: 'ビジネス',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: '議事録：[会議名]' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: '日時: ' },
              { type: 'text', text: 'YYYY/MM/DD HH:MM' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: '参加者: ' },
              { type: 'text', text: '' },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'アジェンダ' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '議事' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'アクションアイテム' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
              },
            ],
          },
        ],
      }),
    },
  });

  await prisma.template.create({
    data: {
      name: '日報',
      category: 'ビジネス',
      content: JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: '日報：YYYY/MM/DD' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '本日の業務' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
              },
            ],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '課題・問題点' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '' }],
          },
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: '明日の予定' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
              },
            ],
          },
        ],
      }),
    },
  });

  console.log(`✅ Created ${2} templates`);

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Folders: ${2}`);
  console.log(`   - Tags: ${3}`);
  console.log(`   - Notes: ${3}`);
  console.log(`   - Templates: ${2}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
