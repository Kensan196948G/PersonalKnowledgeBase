import { test, expect } from "@playwright/test";

test("ノート内容表示デバッグ", async ({ page }) => {
  // コンソールログをキャプチャ
  const logs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    logs.push(text);
    console.log("BROWSER:", text);
  });

  // アプリケーションを開く
  await page.goto("http://localhost:5173");
  await page.waitForLoadState("networkidle");

  // フォルダ「2025年⑫」をクリック
  console.log("=== Clicking folder: 2025年⑫ ===");
  await page.getByText("2025年⑫", { exact: false }).first().click();
  await page.waitForTimeout(1000);

  // ノート「2025年⑫13」を探してクリック
  console.log("=== Looking for note: 2025年⑫13 ===");
  const note = page.getByText("2025年⑫13", { exact: false }).first();
  await expect(note).toBeVisible();
  await note.click();
  await page.waitForTimeout(2000);

  // タイトルが表示されているか確認
  const titleInput = page.getByTestId("note-title-input");
  await expect(titleInput).toBeVisible();
  const title = await titleInput.inputValue();
  console.log("=== Note title:", title, "===");

  // エディタ内容を確認
  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible();
  const editorText = await editor.textContent();
  console.log("=== Editor text length:", editorText?.length, "===");
  console.log("=== Editor text preview:", editorText?.substring(0, 200), "===");

  // ログを出力
  console.log("\n=== CAPTURED BROWSER LOGS ===");
  const relevantLogs = logs.filter(
    (log) =>
      log.includes("[App]") ||
      log.includes("[useEditor]") ||
      log.includes("[tiptapJsonToHtml]") ||
      log.includes("[NoteStore]") ||
      log.includes("useNotes"),
  );
  relevantLogs.forEach((log) => console.log(log));

  // エディタに内容があることを確認
  expect(editorText?.length || 0).toBeGreaterThan(0);
});
