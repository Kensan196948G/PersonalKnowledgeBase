/**
 * TipTapEditor 使用例
 *
 * このファイルはサンプルコードです。実際のアプリケーションで
 * TipTapEditorを使用する際の参考にしてください。
 */

import { useState } from "react";
import { TipTapEditor } from "./TipTapEditor";

/**
 * 基本的な使用例
 */
export function BasicExample() {
  const [content, setContent] = useState("<p>初期コンテンツ</p>");

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">基本的なエディタ</h1>
      <TipTapEditor
        content={content}
        onChange={setContent}
        placeholder="ここにメモを入力してください..."
      />
    </div>
  );
}

/**
 * 読み取り専用モード
 */
export function ReadOnlyExample() {
  const content =
    "<h1>読み取り専用コンテンツ</h1><p>このコンテンツは編集できません。</p>";

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">読み取り専用エディタ</h1>
      <TipTapEditor content={content} editable={false} />
    </div>
  );
}

/**
 * 保存機能付きエディタ
 */
export function EditorWithSave() {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");

  const handleSave = () => {
    setSavedContent(content);
    alert("保存しました！");
  };

  const handleLoad = () => {
    setContent(savedContent);
    alert("読み込みました！");
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">保存機能付きエディタ</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存
        </button>
        <button
          onClick={handleLoad}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          読み込み
        </button>
      </div>

      <TipTapEditor
        content={content}
        onChange={setContent}
        placeholder="メモを入力してください..."
      />

      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">保存済みコンテンツのプレビュー:</h2>
        <div
          dangerouslySetInnerHTML={{
            __html: savedContent || "(まだ保存されていません)",
          }}
        />
      </div>
    </div>
  );
}

/**
 * リアルタイムプレビュー付きエディタ
 */
export function EditorWithPreview() {
  const [content, setContent] = useState("");

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">リアルタイムプレビュー</h1>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-bold mb-2">エディタ</h2>
          <TipTapEditor
            content={content}
            onChange={setContent}
            placeholder="左側で編集すると、右側にHTMLが表示されます"
          />
        </div>

        <div>
          <h2 className="font-bold mb-2">HTML出力</h2>
          <pre className="p-4 bg-gray-100 rounded text-xs overflow-auto max-h-[500px]">
            {content || "(コンテンツなし)"}
          </pre>
        </div>
      </div>
    </div>
  );
}

/**
 * カスタムフック使用例
 */
export function CustomHookExample() {
  const [content, setContent] = useState("");

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">useEditorフック使用例</h1>

      <TipTapEditor
        content={content}
        onChange={setContent}
        placeholder="カスタマイズ可能なエディタ"
        className="shadow-lg"
      />

      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h2 className="font-bold mb-2">統計情報:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>文字数: {content.replace(/<[^>]*>/g, "").length} 文字</li>
          <li>HTML長: {content.length} 文字</li>
          <li>空かどうか: {content === "" ? "はい" : "いいえ"}</li>
        </ul>
      </div>
    </div>
  );
}
