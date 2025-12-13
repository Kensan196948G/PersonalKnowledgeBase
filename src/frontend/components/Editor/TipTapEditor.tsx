import { EditorContent } from '@tiptap/react'
import { useEditor } from '../../hooks/useEditor'
import { Toolbar } from './Toolbar'

export interface TipTapEditorProps {
  /** 初期コンテンツ（HTML形式） */
  content?: string
  /** コンテンツ変更時のコールバック */
  onChange?: (html: string) => void
  /** プレースホルダーテキスト */
  placeholder?: string
  /** 編集可能かどうか */
  editable?: boolean
  /** クラス名 */
  className?: string
}

/**
 * TipTapベースのリッチテキストエディタコンポーネント
 *
 * 主な機能:
 * - 基本フォーマット: 太字、斜体、打ち消し線、インラインコード
 * - 見出し: H1, H2, H3
 * - リスト: 箇条書き、番号付きリスト、タスクリスト
 * - ブロック: 引用、コードブロック、水平線
 * - 挿入: リンク、画像
 * - 履歴: 元に戻す、やり直す
 */
export function TipTapEditor({
  content = '',
  onChange,
  placeholder = 'ここにメモを入力...',
  editable = true,
  className = '',
}: TipTapEditorProps) {
  const { editor, isActive } = useEditor({
    content,
    onChange,
    placeholder,
    editable,
  })

  if (!editor) {
    return null
  }

  return (
    <div className={`border rounded-lg overflow-hidden bg-white ${className}`}>
      {/* ツールバー */}
      {editable && <Toolbar editor={editor} isActive={isActive} />}

      {/* エディタ本体 */}
      <EditorContent
        editor={editor}
        className="p-4 prose prose-sm max-w-none focus:outline-none min-h-[200px]"
      />
    </div>
  )
}

export default TipTapEditor
