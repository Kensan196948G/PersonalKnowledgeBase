/**
 * Phase 3 Link Testing Script
 * ノート間リンク機能のテストスクリプト
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testLinkQueries() {
  console.log('🧪 Testing Phase 3 Link Queries...\n');

  // Test 1: Get all notes with their links
  console.log('Test 1: Fetching all notes with outgoing and incoming links');
  console.log('━'.repeat(70));

  const notes = await prisma.note.findMany({
    include: {
      outgoingLinks: {
        include: {
          targetNote: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      incomingLinks: {
        include: {
          sourceNote: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    where: {
      title: {
        contains: '開発',
      },
    },
  });

  notes.forEach((note) => {
    console.log(`\n📄 Note: ${note.title}`);
    console.log(`   Outgoing Links (${note.outgoingLinks.length}):`);
    note.outgoingLinks.forEach((link) => {
      console.log(`      → [[${link.linkText}]] (${link.targetNote.title})`);
      console.log(`         Context: "${link.context}"`);
    });
    console.log(`   Incoming Links (${note.incomingLinks.length}):`);
    note.incomingLinks.forEach((link) => {
      console.log(`      ← from [[${link.sourceNote.title}]]`);
    });
  });

  // Test 2: Get backlinks for a specific note
  console.log('\n\nTest 2: Getting backlinks for "TypeScript基礎"');
  console.log('━'.repeat(70));

  const targetNote = await prisma.note.findFirst({
    where: { title: 'TypeScript基礎' },
    include: {
      incomingLinks: {
        include: {
          sourceNote: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (targetNote) {
    console.log(`\n📄 Note: ${targetNote.title}`);
    console.log(`   Referenced by ${targetNote.incomingLinks.length} notes:`);
    targetNote.incomingLinks.forEach((link) => {
      console.log(`      ← ${link.sourceNote.title}`);
      console.log(`         Created: ${link.createdAt.toISOString()}`);
    });
  }

  // Test 3: Find related notes (notes that share links)
  console.log('\n\nTest 3: Finding notes related to "React開発メモ"');
  console.log('━'.repeat(70));

  const reactNote = await prisma.note.findFirst({
    where: { title: 'React開発メモ' },
    include: {
      outgoingLinks: {
        include: {
          targetNote: {
            include: {
              incomingLinks: {
                include: {
                  sourceNote: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (reactNote) {
    console.log(`\n📄 Note: ${reactNote.title}`);
    console.log('   Related notes (through shared links):');

    const relatedNotes = new Set<string>();
    reactNote.outgoingLinks.forEach((link) => {
      // Add direct links
      relatedNotes.add(link.targetNote.title);

      // Add notes that also link to the same targets
      link.targetNote.incomingLinks.forEach((backlink) => {
        if (backlink.sourceNote.id !== reactNote.id) {
          relatedNotes.add(backlink.sourceNote.title);
        }
      });
    });

    relatedNotes.forEach((title) => {
      console.log(`      ⚡ ${title}`);
    });
  }

  // Test 4: Count statistics
  console.log('\n\nTest 4: Link Statistics');
  console.log('━'.repeat(70));

  const totalLinks = await prisma.noteLink.count();
  const totalNotes = await prisma.note.count();

  console.log(`   Total Notes: ${totalNotes}`);
  console.log(`   Total Links: ${totalLinks}`);
  console.log(`   Average Links per Note: ${(totalLinks / totalNotes).toFixed(2)}`);

  // Find most linked note
  const allNotes = await prisma.note.findMany({
    include: {
      _count: {
        select: {
          incomingLinks: true,
          outgoingLinks: true,
        },
      },
    },
  });

  const sortedByIncoming = [...allNotes].sort(
    (a, b) => b._count.incomingLinks - a._count.incomingLinks
  );

  console.log('\n   Most Referenced Notes (by incoming links):');
  sortedByIncoming.slice(0, 3).forEach((note, index) => {
    console.log(
      `      ${index + 1}. ${note.title} (${note._count.incomingLinks} incoming, ${note._count.outgoingLinks} outgoing)`
    );
  });

  // Test 5: Test unique constraint
  console.log('\n\nTest 5: Testing Unique Constraint');
  console.log('━'.repeat(70));

  try {
    const firstNote = await prisma.note.findFirst();
    const secondNote = await prisma.note.findFirst({
      where: {
        id: {
          not: firstNote?.id,
        },
      },
    });

    if (firstNote && secondNote) {
      // Try to create a duplicate link
      await prisma.noteLink.create({
        data: {
          sourceNoteId: firstNote.id,
          targetNoteId: secondNote.id,
          linkText: 'Test Link',
          context: 'Test context',
        },
      });

      // Try to create the same link again (should fail)
      await prisma.noteLink.create({
        data: {
          sourceNoteId: firstNote.id,
          targetNoteId: secondNote.id,
          linkText: 'Test Link',
          context: 'Test context',
        },
      });

      console.log('   ❌ Unique constraint failed - duplicate was allowed!');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      console.log('   ✅ Unique constraint working correctly');
      console.log('   Cannot create duplicate links with same source, target, and linkText');
    } else {
      console.log('   ⚠️  Error:', error);
    }
  }

  console.log('\n✅ All tests completed!\n');
}

testLinkQueries()
  .catch((e) => {
    console.error('❌ Error during testing:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
