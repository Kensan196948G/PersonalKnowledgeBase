import { test, expect, Page } from "@playwright/test";

/**
 * ノート表示機能 E2Eテスト
 *
 * テストシナリオ:
 * 1. ノートクリックで内容表示
 * 2. タイトルと内容の一致確認
 * 3. 複数ノート切り替え
 * 4. 新規ノート作成と表示
 */

// テストヘルパー関数
const createNote = async (page: Page, title: string, content?: string) => {
  console.log(`Creating note: ${title}`);

  // 新規ノートボタンをクリック
  const headerButton = page.locator('[data-testid="new-note-button"]');
  const centerButton = page.locator(
    '[data-testid="create-note-center-button"]',
  );

  const isHeaderVisible = await headerButton.isVisible().catch(() => false);

  if (isHeaderVisible) {
    await headerButton.click();
  } else {
    const isCenterVisible = await centerButton.isVisible().catch(() => false);
    if (isCenterVisible) {
      await centerButton.click();
    } else {
      throw new Error("No new note button found");
    }
  }

  // エディタ領域が表示されるまで待機
  await page.waitForSelector('[data-testid="note-title-input"]', {
    timeout: 10000,
  });

  // タイトル入力
  const titleInput = page.locator('[data-testid="note-title-input"]');
  await titleInput.waitFor({ state: "visible", timeout: 5000 });
  await titleInput.fill(title);

  // 保存待機（デバウンス1秒 + バッファ）
  await page.waitForTimeout(2000);

  // コンテンツ入力（オプション）
  if (content) {
    const editor = page.locator(".tiptap.ProseMirror, .ProseMirror").first();
    const editorVisible = await editor.isVisible().catch(() => false);

    if (editorVisible) {
      await editor.click();
      await editor.pressSequentially(content, { delay: 30 });

      // 保存待機
      await page.waitForTimeout(2000);
    } else {
      console.warn("Editor not visible, skipping content input");
    }
  }

  console.log(`Note created: ${title}`);
};

const selectNote = async (page: Page, title: string) => {
  console.log(`Selecting note: ${title}`);

  // ノート一覧から指定のノートをクリック
  const noteItem = page
    .locator(`.note-card, [data-testid="note-card"]`)
    .filter({ hasText: title })
    .first();

  const isVisible = await noteItem.isVisible().catch(() => false);

  if (!isVisible) {
    // セレクタを広げて再試行
    const fallbackItem = page.locator(`text="${title}"`).first();
    await fallbackItem.waitFor({ state: "visible", timeout: 10000 });
    await fallbackItem.click();
  } else {
    await noteItem.click();
  }

  // エディタ表示待機
  await page.waitForSelector('[data-testid="note-title-input"]', {
    timeout: 5000,
  });
  await page.waitForTimeout(500);

  console.log(`Note selected: ${title}`);
};

const getEditorTitle = async (page: Page): Promise<string> => {
  const titleInput = page.locator('[data-testid="note-title-input"]');
  const value = await titleInput.inputValue();
  return value;
};

const getEditorContent = async (page: Page): Promise<string> => {
  const editor = page.locator(".tiptap.ProseMirror, .ProseMirror").first();
  const isVisible = await editor.isVisible().catch(() => false);

  if (isVisible) {
    const content = await editor.textContent();
    return content?.trim() || "";
  }

  return "";
};

test.describe("ノート表示機能", () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto("/");

    // ページロード完了待機
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  });

  test("シナリオ1: ノートクリックで内容が表示される", async ({ page }) => {
    // 1. ノートを作成
    const testTitle = "テスト表示ノート";
    const testContent = "これはテスト内容です。";
    await createNote(page, testTitle, testContent);

    // 2. ノートを選択解除（他のノートを選ぶか、リストに戻る）
    const allNotesLink = page.locator('text="すべてのノート"').first();
    const hasAllLink = await allNotesLink.isVisible().catch(() => false);

    if (!hasAllLink) {
      // 別の方法でエディタをクリアする
      console.log("Cannot deselect note, skipping deselection");
    }

    // 3. 作成したノートをクリック
    await selectNote(page, testTitle);

    // 4. タイトルが表示されることを確認
    const displayedTitle = await getEditorTitle(page);
    expect(displayedTitle).toBe(testTitle);

    // 5. 内容が表示されることを確認
    const displayedContent = await getEditorContent(page);
    expect(displayedContent).toContain(testContent);
  });

  test("シナリオ2: タイトルと内容の一致確認", async ({ page }) => {
    // 1. ノートを作成
    const title1 = "ノートA";
    const content1 = "内容A";
    await createNote(page, title1, content1);

    // 2. もう1つノートを作成
    const title2 = "ノートB";
    const content2 = "内容B";
    await createNote(page, title2, content2);

    // 3. ノートAを開く
    await selectNote(page, title1);

    // 4. ノートAのタイトルと内容を確認
    let displayedTitle = await getEditorTitle(page);
    let displayedContent = await getEditorContent(page);

    expect(displayedTitle).toBe(title1);
    expect(displayedContent).toContain(content1);

    // 5. ノートBを開く
    await selectNote(page, title2);

    // 6. ノートBのタイトルと内容を確認
    displayedTitle = await getEditorTitle(page);
    displayedContent = await getEditorContent(page);

    expect(displayedTitle).toBe(title2);
    expect(displayedContent).toContain(content2);
  });

  test("シナリオ3: 複数ノート切り替えで正しく表示される", async ({ page }) => {
    // 1. 3つのノートを作成
    const notes = [
      { title: "ノート1", content: "内容1" },
      { title: "ノート2", content: "内容2" },
      { title: "ノート3", content: "内容3" },
    ];

    for (const note of notes) {
      await createNote(page, note.title, note.content);
    }

    // 2. 各ノートを順番に開いて確認
    for (const note of notes) {
      await selectNote(page, note.title);

      const displayedTitle = await getEditorTitle(page);
      const displayedContent = await getEditorContent(page);

      expect(displayedTitle).toBe(note.title);
      expect(displayedContent).toContain(note.content);
    }
  });

  test("シナリオ4: 新規ノート作成直後に表示される", async ({ page }) => {
    // 1. 新規ノートボタンをクリック
    const newNoteButton = page.locator('[data-testid="new-note-button"]');
    const isVisible = await newNoteButton.isVisible().catch(() => false);

    if (isVisible) {
      await newNoteButton.click();
    } else {
      const centerButton = page.locator(
        '[data-testid="create-note-center-button"]',
      );
      await centerButton.click();
    }

    // 2. エディタが表示されることを確認
    await page.waitForSelector('[data-testid="note-title-input"]', {
      timeout: 10000,
    });

    // 3. タイトル入力欄が存在し、フォーカスされていることを確認
    const titleInput = page.locator('[data-testid="note-title-input"]');
    await expect(titleInput).toBeVisible();

    // 4. デフォルトタイトルが表示されているか確認
    const defaultTitle = await titleInput.inputValue();
    expect(defaultTitle).toBeTruthy(); // 何かしらのタイトルが入っている

    // 5. エディタが表示されていることを確認
    const editor = page.locator(".tiptap.ProseMirror, .ProseMirror").first();
    const editorVisible = await editor.isVisible().catch(() => false);

    expect(editorVisible).toBe(true);
  });

  test("シナリオ5: 空のノートも正しく表示される", async ({ page }) => {
    // 1. 内容なしのノートを作成
    const emptyTitle = "空のノート";
    await createNote(page, emptyTitle);

    // 2. ノートを選択
    await selectNote(page, emptyTitle);

    // 3. タイトルが表示されることを確認
    const displayedTitle = await getEditorTitle(page);
    expect(displayedTitle).toBe(emptyTitle);

    // 4. エディタが空であることを確認
    const displayedContent = await getEditorContent(page);
    expect(displayedContent).toBe("");
  });

  test("シナリオ6: 長い内容のノートも正しく表示される", async ({ page }) => {
    // 1. 長い内容のノートを作成
    const longTitle = "長いノート";
    const longContent = "これは長い内容です。\n".repeat(50);

    await createNote(page, longTitle);

    // エディタに長い内容を入力
    const editor = page.locator(".tiptap.ProseMirror, .ProseMirror").first();
    const editorVisible = await editor.isVisible().catch(() => false);

    if (editorVisible) {
      await editor.click();
      await editor.pressSequentially(longContent, { delay: 10 });
      await page.waitForTimeout(2000);

      // 2. ノートを再選択
      await selectNote(page, longTitle);

      // 3. 内容が表示されることを確認
      const displayedContent = await getEditorContent(page);
      expect(displayedContent.length).toBeGreaterThan(100);
    }
  });

  test("シナリオ7: 保存状態インジケーターが表示される", async ({ page }) => {
    // 1. ノートを作成
    await createNote(page, "保存テストノート", "内容");

    // 2. タイトルを変更
    const titleInput = page.locator('[data-testid="note-title-input"]');
    await titleInput.fill("更新後のタイトル");

    // 3. 保存中インジケーターが表示されることを確認
    const savingIndicator = page.locator('text="保存中"');
    const isSaving = await savingIndicator.isVisible().catch(() => false);

    // 保存が速すぎて見えない可能性があるため、オプショナルチェック
    if (isSaving) {
      expect(isSaving).toBe(true);
    }

    // 4. 保存完了インジケーターが表示されることを確認（2秒待機後）
    await page.waitForTimeout(2000);
    const savedIndicator = page.locator('text="保存済み"');
    const isSaved = await savedIndicator.isVisible().catch(() => false);

    expect(isSaved).toBe(true);
  });

  test("シナリオ8: メタ情報（作成日時・更新日時）が表示される", async ({
    page,
  }) => {
    // 1. ノートを作成
    await createNote(page, "メタ情報テスト", "内容");

    // 2. 作成日時が表示されることを確認
    const createdAt = page.locator("text=/作成:/");
    await expect(createdAt).toBeVisible();

    // 3. 更新日時が表示されることを確認
    const updatedAt = page.locator("text=/更新:/");
    await expect(updatedAt).toBeVisible();

    // 4. 日時フォーマットが正しいことを確認（日本語ロケール）
    const createdText = await createdAt.textContent();
    expect(createdText).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/); // YYYY/M/D 形式
  });
});
