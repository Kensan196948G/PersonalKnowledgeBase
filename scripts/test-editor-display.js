#!/usr/bin/env node

/**
 * エディタ表示テストスクリプト
 * ブラウザコンソールに貼り付けて実行
 */

console.log("=== Editor Display Test ===");

// 1. ノート選択を監視
const originalSelectNote = window.__DEBUG_SELECT_NOTE__;
if (originalSelectNote) {
  console.log("✓ Note selection hook found");
} else {
  console.log("✗ Note selection hook not found");
}

// 2. エディタコンポーネントの状態を確認
setTimeout(() => {
  const editorElement = document.querySelector('[data-testid="tiptap-editor"]');
  if (editorElement) {
    console.log("✓ Editor element found");
    console.log("Editor innerHTML length:", editorElement.innerHTML.length);
  } else {
    console.log("✗ Editor element not found");
  }
}, 1000);

// 3. コンソールログをフィルタリング
console.log("\nExpected logs:");
console.log("- [App] selectedNote changed");
console.log("- [App] Setting editor content");
console.log("- [App] Converted HTML length");
console.log("- [TipTapEditor] Rendered with content length");
console.log("- [useEditor] Content changed, updating editor");

console.log("\nTo test:");
console.log("1. Click on any note in the list");
console.log("2. Watch the console for the above logs");
console.log("3. Check if the content displays in the editor");
