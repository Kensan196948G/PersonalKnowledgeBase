/**
 * NoteLink Extension for TipTap
 *
 * [[ノート名]] 記法でノート間リンクを作成する拡張機能
 * - Obsidian風のWiki Link記法
 * - オートコンプリート（Fuse.jsであいまい検索）
 * - 青リンク（存在するノート）/赤リンク（未作成ノート）
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { NoteLinkSuggestion } from '../NoteLinkSuggestion';

export interface NoteLinkOptions {
  HTMLAttributes: Record<string, unknown>;
  renderLabel: (props: {
    options: NoteLinkOptions;
    node: any;
  }) => string;
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

export const NoteLinkPluginKey = new PluginKey('noteLink');

/**
 * NoteLink Node
 * [[ノート名]] 記法で挿入されるノード
 */
export const NoteLink = Node.create<NoteLinkOptions>({
  name: 'noteLink',

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({ options, node }) {
        return `${options.suggestion.char ?? ''}${node.attrs.label ?? node.attrs.id}`;
      },
      suggestion: {
        char: '[[',
        pluginKey: NoteLinkPluginKey,
        command: ({ editor, range, props }) => {
          // range.from + 2 で [[ の2文字分を削除範囲に含める
          const nodeAfter = editor.view.state.selection.$to.nodeAfter;
          const overrideSpace = nodeAfter?.text?.startsWith(' ');

          if (overrideSpace) {
            range.to += 1;
          }

          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: props,
              },
              {
                type: 'text',
                text: ' ',
              },
            ])
            .run();

          window.getSelection()?.collapseToEnd();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          const allow = !!$from.parent.type.contentMatch.matchType(type);

          return allow;
        },
      },
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }

          return {
            'data-id': attributes.id,
          };
        },
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-label'),
        renderHTML: (attributes) => {
          if (!attributes.label) {
            return {};
          }

          return {
            'data-label': attributes.label,
          };
        },
      },
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attributes) => {
          if (!attributes.noteId) {
            return {};
          }

          return {
            'data-note-id': attributes.noteId,
          };
        },
      },
      exists: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-exists') === 'true',
        renderHTML: (attributes) => {
          return {
            'data-exists': String(attributes.exists ?? false),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `a[data-type="${this.name}"]`,
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const exists = node.attrs.exists ?? false;
    const linkClass = exists
      ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer'
      : 'text-red-600 hover:text-red-800 hover:underline cursor-pointer';

    return [
      'a',
      mergeAttributes(
        { 'data-type': this.name },
        this.options.HTMLAttributes,
        HTMLAttributes,
        {
          class: linkClass,
        }
      ),
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ];
  },

  renderText({ node }) {
    return this.options.renderLabel({
      options: this.options,
      node,
    });
  },

  addKeyboardShortcuts() {
    return {
      Backspace: () =>
        this.editor.commands.command(({ tr, state }) => {
          let isNoteLink = false;
          const { selection } = state;
          const { empty, anchor } = selection;

          if (!empty) {
            return false;
          }

          state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
            if (node.type.name === this.name) {
              isNoteLink = true;
              tr.insertText(
                this.options.suggestion.char || '',
                pos,
                pos + node.nodeSize
              );

              return false;
            }
          });

          return isNoteLink;
        }),
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

/**
 * 既存のノート一覧を取得してSuggestionに渡すための型
 */
export interface NoteSuggestionItem {
  id: string;
  title: string;
  exists: boolean;
}

/**
 * Suggestion Render Function
 * tippy.js を使ってポップアップを表示
 */
export function getSuggestionRenderer(
  fetchNotes: () => Promise<NoteSuggestionItem[]>
) {
  let component: ReactRenderer | null = null;
  let popup: TippyInstance[] | null = null;

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(NoteLinkSuggestion, {
        props: {
          ...props,
          fetchNotes,
        },
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy('body', {
        getReferenceClientRect: props.clientRect as () => DOMRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
    },

    onUpdate(props: any) {
      component?.updateProps({
        ...props,
        fetchNotes,
      });

      if (!props.clientRect) {
        return;
      }

      popup?.[0]?.setProps({
        getReferenceClientRect: props.clientRect as () => DOMRect,
      });
    },

    onKeyDown(props: any) {
      if (props.event.key === 'Escape') {
        popup?.[0]?.hide();
        return true;
      }

       
      return (component?.ref as any)?.onKeyDown?.(props) ?? false;
    },

    onExit() {
      popup?.[0]?.destroy();
      component?.destroy();
      component = null;
      popup = null;
    },
  };
}
