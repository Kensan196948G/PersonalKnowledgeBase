/**
 * Schema Verification Script
 * データベーススキーマの確認
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  console.log('🔍 Verifying Database Schema...\n');

  // Check if NoteLink table exists and has data
  try {
    const linkCount = await prisma.noteLink.count();
    console.log(`✅ NoteLink table exists with ${linkCount} records`);

    // Test querying with all fields
    const sampleLink = await prisma.noteLink.findFirst({
      include: {
        sourceNote: {
          select: {
            id: true,
            title: true,
          },
        },
        targetNote: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (sampleLink) {
      console.log('\n📋 Sample Link Record:');
      console.log(`   ID: ${sampleLink.id}`);
      console.log(`   Source: ${sampleLink.sourceNote.title} (${sampleLink.sourceNoteId})`);
      console.log(`   Target: ${sampleLink.targetNote.title} (${sampleLink.targetNoteId})`);
      console.log(`   Link Text: ${sampleLink.linkText}`);
      console.log(`   Context: ${sampleLink.context}`);
      console.log(`   Created At: ${sampleLink.createdAt.toISOString()}`);
    }

    // Verify indexes by checking query performance
    console.log('\n🔎 Testing Indexes...');

    // Test sourceNoteId index
    const startTime1 = Date.now();
    await prisma.noteLink.findMany({
      where: {
        sourceNoteId: sampleLink?.sourceNoteId,
      },
    });
    console.log(`   ✓ sourceNoteId index query: ${Date.now() - startTime1}ms`);

    // Test targetNoteId index
    const startTime2 = Date.now();
    await prisma.noteLink.findMany({
      where: {
        targetNoteId: sampleLink?.targetNoteId,
      },
    });
    console.log(`   ✓ targetNoteId index query: ${Date.now() - startTime2}ms`);

    // Test composite index
    const startTime3 = Date.now();
    await prisma.noteLink.findMany({
      where: {
        sourceNoteId: sampleLink?.sourceNoteId,
        targetNoteId: sampleLink?.targetNoteId,
      },
    });
    console.log(`   ✓ composite (source+target) index query: ${Date.now() - startTime3}ms`);

    // Verify unique constraint
    console.log('\n🔒 Verifying Unique Constraint...');
    const uniqueLinks = await prisma.noteLink.groupBy({
      by: ['sourceNoteId', 'targetNoteId', 'linkText'],
      _count: true,
    });

    const duplicates = uniqueLinks.filter((group) => group._count > 1);
    if (duplicates.length === 0) {
      console.log('   ✅ No duplicate links found (unique constraint working)');
    } else {
      console.log(`   ⚠️  Found ${duplicates.length} duplicate link(s)`);
    }

    // Verify Note model relations
    console.log('\n🔗 Verifying Note Model Relations...');
    const noteWithLinks = await prisma.note.findFirst({
      include: {
        outgoingLinks: true,
        incomingLinks: true,
      },
    });

    if (noteWithLinks) {
      console.log(
        `   ✅ Note.outgoingLinks relation working (${noteWithLinks.outgoingLinks.length} links)`
      );
      console.log(
        `   ✅ Note.incomingLinks relation working (${noteWithLinks.incomingLinks.length} links)`
      );
    }

    // Verify cascade delete
    console.log('\n🗑️  Testing Cascade Delete...');
    const testNote = await prisma.note.create({
      data: {
        title: 'Test Cascade Delete',
        content: '{}',
      },
    });

    const targetTestNote = await prisma.note.create({
      data: {
        title: 'Test Target',
        content: '{}',
      },
    });

    const testLink = await prisma.noteLink.create({
      data: {
        sourceNoteId: testNote.id,
        targetNoteId: targetTestNote.id,
        linkText: 'Test',
        context: 'Test context',
      },
    });

    // Delete source note and verify link is also deleted
    await prisma.note.delete({
      where: {
        id: testNote.id,
      },
    });

    const linkExists = await prisma.noteLink.findUnique({
      where: {
        id: testLink.id,
      },
    });

    if (linkExists === null) {
      console.log('   ✅ Cascade delete working (link deleted when source note deleted)');
    } else {
      console.log('   ⚠️  Cascade delete not working properly');
    }

    // Cleanup
    await prisma.note.delete({
      where: {
        id: targetTestNote.id,
      },
    });

    console.log('\n✅ Schema verification completed successfully!');
  } catch (error) {
    console.error('❌ Schema verification failed:');
    console.error(error);
    process.exit(1);
  }
}

verifySchema()
  .catch((e) => {
    console.error('❌ Error during verification:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
