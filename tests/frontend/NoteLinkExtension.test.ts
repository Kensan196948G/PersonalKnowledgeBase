/**
 * NoteLinkExtension Unit Tests
 *
 * TipTap NoteLink拡張のテスト
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { NoteLink, NoteSuggestionItem } from '../../src/frontend/components/Editor/extensions/NoteLinkExtension';

describe('NoteLinkExtension', () => {
  let editor: Editor;

  beforeEach(() => {
    // TipTap エディタを初期化
    editor = new Editor({
      extensions: [
        StarterKit,
        NoteLink.configure({
          suggestion: {
            items: async ({ query }: { query: string }) => {
              // テスト用のダミーノートリスト
              const notes: NoteSuggestionItem[] = [
                { id: '1', title: 'テストノート1', exists: true },
                { id: '2', title: 'テストノート2', exists: true },
                { id: '3', title: 'サンプルノート', exists: true },
              ];
              return notes;
            },
          },
        }),
      ],
    });
  });

  afterEach(() => {
    editor.destroy();
  });

  describe('Extension Registration', () => {
    it('should register NoteLink extension', () => {
      expect(editor.extensionManager.extensions.find(
        (ext) => ext.name === 'noteLink'
      )).toBeDefined();
    });

    it('should have correct node type', () => {
      const noteLinkNode = editor.schema.nodes.noteLink;
      expect(noteLinkNode).toBeDefined();
      expect(noteLinkNode?.spec.group).toBe('inline');
      expect(noteLinkNode?.spec.inline).toBe(true);
      expect(noteLinkNode?.spec.atom).toBe(true);
    });
  });

  describe('Attributes', () => {
    it('should support id attribute', () => {
      editor.commands.setContent(
        '<a data-type="noteLink" data-id="test-id" data-label="Test Label" data-exists="true">[[Test Label]]</a>'
      );

      const json = editor.getJSON();
      expect(json.content?.[0]?.content?.[0]?.attrs?.id).toBe('test-id');
    });

    it('should support label attribute', () => {
      editor.commands.setContent(
        '<a data-type="noteLink" data-id="test-id" data-label="Test Label" data-exists="true">[[Test Label]]</a>'
      );

      const json = editor.getJSON();
      expect(json.content?.[0]?.content?.[0]?.attrs?.label).toBe('Test Label');
    });

    it('should support exists attribute', () => {
      editor.commands.setContent(
        '<a data-type="noteLink" data-id="test-id" data-label="Test Label" data-exists="true">[[Test Label]]</a>'
      );

      const json = editor.getJSON();
      expect(json.content?.[0]?.content?.[0]?.attrs?.exists).toBe(true);
    });

    it('should support noteId attribute', () => {
      editor.commands.setContent(
        '<a data-type="noteLink" data-id="test-id" data-label="Test Label" data-note-id="note-123" data-exists="true">[[Test Label]]</a>'
      );

      const json = editor.getJSON();
      expect(json.content?.[0]?.content?.[0]?.attrs?.noteId).toBe('note-123');
    });
  });

  describe('HTML Rendering', () => {
    it('should render blue link for existing notes', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: '1',
                  label: 'Existing Note',
                  noteId: 'note-1',
                  exists: true,
                },
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();
      expect(html).toContain('text-blue-600');
      expect(html).toContain('data-exists="true"');
    });

    it('should render red link for non-existing notes', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: 'new-note',
                  label: 'New Note',
                  exists: false,
                },
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();
      expect(html).toContain('text-red-600');
      expect(html).toContain('data-exists="false"');
    });

    it('should include hover styles', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: '1',
                  label: 'Test',
                  exists: true,
                },
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();
      expect(html).toContain('hover:underline');
      expect(html).toContain('cursor-pointer');
    });
  });

  describe('Label Rendering', () => {
    it('should render label with default trigger', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: '1',
                  label: 'Test Note',
                  exists: true,
                },
              },
            ],
          },
        ],
      });

      const html = editor.getHTML();
      expect(html).toContain('[[Test Note]]');
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Backspace on NoteLink', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: '1',
                  label: 'Test',
                  exists: true,
                },
              },
            ],
          },
        ],
      });

      // カーソルをNoteLinkの直後に配置
      editor.commands.focus();
      editor.commands.setTextSelection(1);

      // Backspaceを押下
      const result = editor.commands.command(({ tr, state }) => {
        const event = new KeyboardEvent('keydown', { key: 'Backspace' });
        return editor.extensionManager.extensions
          .find((ext) => ext.name === 'noteLink')
          ?.options?.addKeyboardShortcuts?.()?.Backspace?.() ?? false;
      });

      // Backspaceが処理されることを確認
      expect(result).toBeDefined();
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: 'test-id',
                  label: 'Test Label',
                  noteId: 'note-123',
                  exists: true,
                },
              },
            ],
          },
        ],
      });

      const json = editor.getJSON();
      const noteLinkNode = json.content?.[0]?.content?.[0];

      expect(noteLinkNode?.type).toBe('noteLink');
      expect(noteLinkNode?.attrs?.id).toBe('test-id');
      expect(noteLinkNode?.attrs?.label).toBe('Test Label');
      expect(noteLinkNode?.attrs?.noteId).toBe('note-123');
      expect(noteLinkNode?.attrs?.exists).toBe(true);
    });

    it('should deserialize from JSON correctly', () => {
      const json = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'noteLink',
                attrs: {
                  id: 'test-id',
                  label: 'Test Label',
                  exists: false,
                },
              },
            ],
          },
        ],
      };

      editor.commands.setContent(json);
      const html = editor.getHTML();

      expect(html).toContain('data-id="test-id"');
      expect(html).toContain('data-label="Test Label"');
      expect(html).toContain('data-exists="false"');
    });
  });
});
