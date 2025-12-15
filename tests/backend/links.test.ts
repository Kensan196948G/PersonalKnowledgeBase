/**
 * Links API Tests
 *
 * ノート間リンクAPIのテスト
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { extractLinks, syncNoteLinks, extractKeywords } from '../../src/backend/utils/linkParser.js';
import { getRelatedNotes } from '../../src/backend/services/relatedNotesService.js';

const prisma = new PrismaClient();

describe('Link Parser Utility', () => {
  describe('extractLinks', () => {
    it('should extract simple wiki links', () => {
      const content = 'This is a [[note]] and another [[example note]].';
      const links = extractLinks(content);

      expect(links).toHaveLength(2);
      expect(links[0].targetTitle).toBe('note');
      expect(links[1].targetTitle).toBe('example note');
    });

    it('should extract wiki links with display text', () => {
      const content = 'Check [[note|custom text]] here.';
      const links = extractLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0].targetTitle).toBe('note');
      expect(links[0].displayText).toBe('custom text');
    });

    it('should handle multiple links in content', () => {
      const content = '[[First]] and [[Second|custom]] and [[Third]].';
      const links = extractLinks(content);

      expect(links).toHaveLength(3);
      expect(links[0].targetTitle).toBe('First');
      expect(links[1].targetTitle).toBe('Second');
      expect(links[1].displayText).toBe('custom');
      expect(links[2].targetTitle).toBe('Third');
    });

    it('should handle content with no links', () => {
      const content = 'This is a normal note with no links.';
      const links = extractLinks(content);

      expect(links).toHaveLength(0);
    });

    it('should extract context around links', () => {
      const content = 'Before text [[note]] after text';
      const links = extractLinks(content);

      expect(links).toHaveLength(1);
      expect(links[0].context).toContain('Before text');
      expect(links[0].context).toContain('note');
      expect(links[0].context).toContain('after text');
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from text', () => {
      const text = 'This is a test document about JavaScript and TypeScript programming.';
      const keywords = extractKeywords(text);

      expect(keywords.length).toBeGreaterThan(0);
      expect(keywords).toContain('test');
      expect(keywords).toContain('document');
      expect(keywords).toContain('javascript');
      expect(keywords).toContain('typescript');
      expect(keywords).toContain('programming');
    });

    it('should filter out stopwords', () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const keywords = extractKeywords(text);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
      expect(keywords).toContain('quick');
      expect(keywords).toContain('brown');
    });

    it('should handle HTML content', () => {
      const html = '<p>This is <strong>bold</strong> text with <a href="#">links</a>.</p>';
      const keywords = extractKeywords(html);

      expect(keywords).toContain('bold');
      expect(keywords).toContain('text');
      expect(keywords).toContain('links');
    });
  });
});

describe('Note Links Database Operations', () => {
  let testNote1Id: string;
  let testNote2Id: string;
  let testNote3Id: string;

  beforeAll(async () => {
    // テスト用ノート作成
    const note1 = await prisma.note.create({
      data: {
        title: 'Test Note 1',
        content: 'This note references [[Test Note 2]] and [[Test Note 3]].',
      },
    });
    testNote1Id = note1.id;

    const note2 = await prisma.note.create({
      data: {
        title: 'Test Note 2',
        content: 'This is the second test note.',
      },
    });
    testNote2Id = note2.id;

    const note3 = await prisma.note.create({
      data: {
        title: 'Test Note 3',
        content: 'This note references [[Test Note 1]].',
      },
    });
    testNote3Id = note3.id;
  });

  afterAll(async () => {
    // クリーンアップ
    await prisma.noteLink.deleteMany({
      where: {
        OR: [
          { sourceNoteId: testNote1Id },
          { sourceNoteId: testNote2Id },
          { sourceNoteId: testNote3Id },
        ],
      },
    });

    await prisma.note.deleteMany({
      where: {
        id: {
          in: [testNote1Id, testNote2Id, testNote3Id],
        },
      },
    });

    await prisma.$disconnect();
  });

  describe('syncNoteLinks', () => {
    beforeEach(async () => {
      // 各テスト前にリンクをクリア
      await prisma.noteLink.deleteMany({
        where: { sourceNoteId: testNote1Id },
      });
    });

    it('should sync links when note is saved', async () => {
      const content = 'This note references [[Test Note 2]] and [[Test Note 3]].';
      await syncNoteLinks(testNote1Id, content);

      const links = await prisma.noteLink.findMany({
        where: { sourceNoteId: testNote1Id },
      });

      expect(links).toHaveLength(2);
    });

    it('should remove old links when content changes', async () => {
      // 最初のリンク作成
      await syncNoteLinks(testNote1Id, 'References [[Test Note 2]].');

      const linksAfterFirst = await prisma.noteLink.findMany({
        where: { sourceNoteId: testNote1Id },
      });
      expect(linksAfterFirst).toHaveLength(1);

      // コンテンツ変更
      await syncNoteLinks(testNote1Id, 'Now references [[Test Note 3]] only.');

      const linksAfterSecond = await prisma.noteLink.findMany({
        where: { sourceNoteId: testNote1Id },
      });

      expect(linksAfterSecond).toHaveLength(1);
      expect(linksAfterSecond[0].targetNoteId).toBe(testNote3Id);
    });

    it('should create target note if it does not exist (red link)', async () => {
      const content = 'This references [[Nonexistent Note]].';
      await syncNoteLinks(testNote1Id, content);

      const newNote = await prisma.note.findFirst({
        where: { title: 'Nonexistent Note' },
      });

      expect(newNote).not.toBeNull();
      expect(newNote?.content).toBe('');

      // クリーンアップ
      if (newNote) {
        await prisma.noteLink.deleteMany({
          where: { targetNoteId: newNote.id },
        });
        await prisma.note.delete({
          where: { id: newNote.id },
        });
      }
    });
  });
});

describe('Related Notes Service', () => {
  let noteA: string;
  let noteB: string;
  let noteC: string;
  let tagId: string;

  beforeAll(async () => {
    // タグ作成
    const tag = await prisma.tag.create({
      data: { name: 'test-tag' },
    });
    tagId = tag.id;

    // ノート作成
    const a = await prisma.note.create({
      data: {
        title: 'Note A',
        content: 'This is about JavaScript and programming.',
      },
    });
    noteA = a.id;

    const b = await prisma.note.create({
      data: {
        title: 'Note B',
        content: 'This is about TypeScript and programming.',
      },
    });
    noteB = b.id;

    const c = await prisma.note.create({
      data: {
        title: 'Note C',
        content: 'This is about cooking and recipes.',
      },
    });
    noteC = c.id;

    // 共通タグ追加（Note A と Note B）
    await prisma.noteTag.create({
      data: { noteId: noteA, tagId },
    });
    await prisma.noteTag.create({
      data: { noteId: noteB, tagId },
    });

    // リンク作成（Note A -> Note B）
    await prisma.noteLink.create({
      data: {
        sourceNoteId: noteA,
        targetNoteId: noteB,
        linkText: 'Note B',
      },
    });
  });

  afterAll(async () => {
    // クリーンアップ
    await prisma.noteLink.deleteMany({
      where: {
        OR: [
          { sourceNoteId: noteA },
          { sourceNoteId: noteB },
          { sourceNoteId: noteC },
        ],
      },
    });

    await prisma.noteTag.deleteMany({
      where: {
        noteId: {
          in: [noteA, noteB, noteC],
        },
      },
    });

    await prisma.note.deleteMany({
      where: {
        id: {
          in: [noteA, noteB, noteC],
        },
      },
    });

    await prisma.tag.delete({
      where: { id: tagId },
    });

    await prisma.$disconnect();
  });

  describe('getRelatedNotes', () => {
    it('should find related notes based on common tags', async () => {
      const related = await getRelatedNotes(noteA);

      const noteBRelated = related.find(r => r.note.id === noteB);
      expect(noteBRelated).toBeDefined();
      expect(noteBRelated?.reasons.commonTags).toBeGreaterThan(0);
    });

    it('should find related notes based on links', async () => {
      const related = await getRelatedNotes(noteA);

      const noteBRelated = related.find(r => r.note.id === noteB);
      expect(noteBRelated).toBeDefined();
      expect(noteBRelated?.reasons.linkRelation).toBe('outgoing');
    });

    it('should find related notes based on keyword similarity', async () => {
      const related = await getRelatedNotes(noteA);

      const noteBRelated = related.find(r => r.note.id === noteB);
      expect(noteBRelated).toBeDefined();
      expect(noteBRelated?.reasons.keywordSimilarity).toBeGreaterThan(0);
    });

    it('should exclude unrelated notes', async () => {
      const related = await getRelatedNotes(noteA, { threshold: 10.0 });

      const noteCRelated = related.find(r => r.note.id === noteC);
      // Note C should have low/no relation to Note A
      expect(noteCRelated).toBeUndefined();
    });

    it('should respect limit parameter', async () => {
      const related = await getRelatedNotes(noteA, { limit: 1 });

      expect(related.length).toBeLessThanOrEqual(1);
    });

    it('should exclude linked notes when specified', async () => {
      const related = await getRelatedNotes(noteA, { excludeLinked: true });

      const noteBRelated = related.find(r => r.note.id === noteB);
      expect(noteBRelated).toBeUndefined();
    });
  });
});
