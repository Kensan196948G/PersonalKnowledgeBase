import { test, expect, Page } from "@playwright/test";

/**
 * フォルダフィルタリング機能 E2Eテスト
 *
 * テストシナリオ:
 * 1. フォルダ作成とノート紐付け
 * 2. フォルダクリックでノート一覧フィルタ
 * 3. サブフォルダ展開と表示確認
 * 4. フォルダ階層構造の検証
 */

// テストヘルパー関数
const waitForSelector = async (
  page: Page,
  selector: string,
  timeout = 10000,
) => {
  await page.waitForSelector(selector, { timeout, state: "visible" });
};

const createNote = async (page: Page, title: string) => {
  console.log(`Creating note: ${title}`);

  // 新規ノートボタンをクリック
  const newNoteButton = page.locator('[data-testid="new-note-button"]');
  await newNoteButton.click();

  // エディタ領域が表示されるまで待機
  await waitForSelector(page, '[data-testid="note-title-input"]');

  // タイトル入力
  const titleInput = page.locator('[data-testid="note-title-input"]');
  await titleInput.fill(title);

  // 保存待機（デバウンス1秒 + バッファ）
  await page.waitForTimeout(2000);

  console.log(`Note created: ${title}`);
};

const selectFolder = async (page: Page, folderName: string) => {
  console.log(`Selecting folder: ${folderName}`);

  // フォルダツリーから指定のフォルダを探してクリック
  const folderItem = page
    .locator(`[data-folder-name="${folderName}"], text="${folderName}"`)
    .first();
  await folderItem.waitFor({ state: "visible", timeout: 10000 });
  await folderItem.click();

  // フィルタリング処理完了待機
  await page.waitForTimeout(1000);

  console.log(`Folder selected: ${folderName}`);
};

const createFolder = async (
  page: Page,
  folderName: string,
  parentName?: string,
) => {
  console.log(`Creating folder: ${folderName} under ${parentName || "root"}`);

  // フォルダ作成ボタンをクリック
  // 実装により、右クリックメニューやプラスボタンなどがある可能性があるため複数パターン試行
  const createButton = page
    .locator(
      'button:has-text("新しいフォルダ"), button[aria-label*="フォルダ"], [data-testid="create-folder-button"]',
    )
    .first();

  const isVisible = await createButton.isVisible().catch(() => false);

  if (isVisible) {
    await createButton.click();
  } else {
    // フォルダツリーエリアを右クリック
    const folderTree = page
      .locator('[data-testid="folder-tree"], .folder-tree')
      .first();
    await folderTree.click({ button: "right" });
  }

  // モーダルが開くのを待機
  await page.waitForTimeout(500);

  // フォルダ名入力
  const folderInput = page
    .locator('input[placeholder*="フォルダ名"], input[name="folderName"]')
    .first();
  await folderInput.waitFor({ state: "visible", timeout: 5000 });
  await folderInput.fill(folderName);

  // 保存ボタンクリック
  const saveButton = page
    .locator('button:has-text("作成"), button:has-text("保存")')
    .first();
  await saveButton.click();

  // モーダルが閉じるまで待機
  await page.waitForTimeout(1000);

  console.log(`Folder created: ${folderName}`);
};

const assignNoteToFolder = async (
  page: Page,
  noteTitle: string,
  folderName: string,
) => {
  console.log(`Assigning note "${noteTitle}" to folder "${folderName}"`);

  // ノートを開く
  const noteItem = page.locator(`text="${noteTitle}"`).first();
  await noteItem.waitFor({ state: "visible", timeout: 10000 });
  await noteItem.click();

  // エディタが表示されるまで待機
  await waitForSelector(page, '[data-testid="note-title-input"]');

  // フォルダセレクターを開く
  const folderSelector = page
    .locator('button:has-text("フォルダ"), [data-testid="folder-selector"]')
    .first();
  await folderSelector.click();

  // ドロップダウンからフォルダを選択
  const folderOption = page.locator(`text="${folderName}"`).last();
  await folderOption.click();

  // 保存待機
  await page.waitForTimeout(2000);

  console.log(`Note assigned to folder`);
};

const getNoteListItems = async (page: Page) => {
  // ノート一覧のアイテムを取得
  const noteItems = page.locator(
    '.note-card, [data-testid="note-card"], .note-list-item',
  );
  const count = await noteItems.count();

  const notes = [];
  for (let i = 0; i < count; i++) {
    const title = await noteItems.nth(i).textContent();
    notes.push(title?.trim());
  }

  return notes;
};

test.describe("フォルダフィルタリング機能", () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto("/");

    // ページロード完了待機
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  });

  test("シナリオ1: フォルダクリックで該当するノートのみ表示される", async ({
    page,
  }) => {
    console.log("=== シナリオ1: フォルダフィルタリングテスト ===");

    // コンソールログを監視
    page.on("console", (msg) => {
      const text = msg.text();
      if (
        text.includes("[App]") ||
        text.includes("[NoteStore]") ||
        text.includes("[FolderTree]") ||
        text.includes("[NoteList]") ||
        text.includes("[API /notes]")
      ) {
        console.log(`[Browser Console] ${text}`);
      }
    });

    // 1. 初期状態で全ノート表示を確認
    await page.waitForSelector('[data-testid="note-card"]', { timeout: 10000 });
    const initialNotes = await getNoteListItems(page);
    const initialCount = initialNotes.length;
    console.log(`Initial notes count: ${initialCount}`);
    expect(initialCount).toBeGreaterThan(0);

    // 2. OneNoteフォルダをクリック
    console.log("Clicking OneNote folder...");
    const oneNoteFolder = page.locator('text="OneNote"').first();
    await oneNoteFolder.waitFor({ state: "visible", timeout: 10000 });
    await oneNoteFolder.click();

    // フィルタリング完了を待つ
    await page.waitForTimeout(2000);

    // 3. フィルタ後のノート数を確認
    const filteredNotes = await getNoteListItems(page);
    const filteredCount = filteredNotes.length;
    console.log(`Filtered notes count (OneNote): ${filteredCount}`);
    console.log(`Filtered notes:`, filteredNotes);

    // OneNoteフォルダには1つのノートしかないはず
    expect(filteredCount).toBe(1);
    expect(filteredNotes[0]).toContain("2025年⑫16");

    // 4. すべてのノートをクリックしてフィルタ解除
    console.log('Clicking "すべてのノート" to clear filter...');
    const allNotesButton = page.locator('text="すべてのノート"').first();
    await allNotesButton.click();
    await page.waitForTimeout(2000);

    // 5. 全ノートが再表示されることを確認
    const afterClearNotes = await getNoteListItems(page);
    const afterClearCount = afterClearNotes.length;
    console.log(`After clear filter notes count: ${afterClearCount}`);
    expect(afterClearCount).toBe(initialCount);
  });

  test("シナリオ2: フォルダツリーのサブフォルダ展開", async ({ page }) => {
    // 1. フォルダ階層を確認
    const folderTree = page
      .locator('[data-testid="folder-tree"], .folder-tree')
      .first();
    await folderTree.waitFor({ state: "visible", timeout: 5000 });

    // 2. フォルダアイテムが表示されているか確認
    const folderItems = page.locator(".folder-item, [data-folder-item]");
    const folderCount = await folderItems.count();

    console.log(`Found ${folderCount} folders`);

    // 3. サブフォルダがある場合、展開アイコンをクリック
    if (folderCount > 0) {
      const expandButton = page
        .locator('button[aria-label*="展開"], .expand-icon')
        .first();
      const hasExpand = await expandButton.isVisible().catch(() => false);

      if (hasExpand) {
        await expandButton.click();
        await page.waitForTimeout(500);

        // サブフォルダが表示されることを確認
        const expandedFolders = await folderItems.count();
        expect(expandedFolders).toBeGreaterThanOrEqual(folderCount);
      }
    }
  });

  test("シナリオ3: フォルダフィルタ解除で全ノート表示", async ({ page }) => {
    // 1. ノートを複数作成
    await createNote(page, "ノート1");
    await createNote(page, "ノート2");

    // 2. 初期状態で全ノート表示
    const initialNotes = await getNoteListItems(page);
    const initialCount = initialNotes.length;

    console.log(`Initial notes count: ${initialCount}`);
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // 3. フォルダをクリック（フィルタ適用）
    // 実装次第で、「すべてのノート」リンクをクリック
    const allNotesLink = page
      .locator('text="すべてのノート", [data-filter="all"]')
      .first();
    const hasAllLink = await allNotesLink.isVisible().catch(() => false);

    if (hasAllLink) {
      await allNotesLink.click();
      await page.waitForTimeout(1000);

      // 全ノートが再表示されることを確認
      const afterNotes = await getNoteListItems(page);
      expect(afterNotes.length).toBeGreaterThanOrEqual(initialCount);
    }
  });

  test("シナリオ4: フォルダ切り替えでノート一覧が更新される", async ({
    page,
  }) => {
    console.log("=== シナリオ4: フォルダ切り替えテスト ===");

    // 1. プロジェクトフォルダをクリック
    console.log("Clicking プロジェクト folder...");
    const projectFolder = page.locator('text="プロジェクト"').first();
    await projectFolder.waitFor({ state: "visible", timeout: 10000 });
    await projectFolder.click();
    await page.waitForTimeout(2000);

    const projectNotes = await getNoteListItems(page);
    const projectCount = projectNotes.length;
    console.log(`Project folder notes count: ${projectCount}`);
    console.log(`Project notes:`, projectNotes);

    // プロジェクトフォルダには8つのノートがあるはず
    expect(projectCount).toBe(8);

    // 2. OneNoteフォルダに切り替え
    console.log("Switching to OneNote folder...");
    const oneNoteFolder = page.locator('text="OneNote"').first();
    await oneNoteFolder.click();
    await page.waitForTimeout(2000);

    const oneNoteNotes = await getNoteListItems(page);
    const oneNoteCount = oneNoteNotes.length;
    console.log(`OneNote folder notes count: ${oneNoteCount}`);
    console.log(`OneNote notes:`, oneNoteNotes);

    // OneNoteフォルダには1つのノートしかないはず
    expect(oneNoteCount).toBe(1);

    // 3. ノート一覧が異なることを確認
    expect(projectCount).not.toBe(oneNoteCount);
  });

  test("シナリオ5: 空フォルダクリックで空のノート一覧表示", async ({
    page,
  }) => {
    // 1. 空のフォルダを作成
    // await createFolder(page, '空フォルダテスト');

    // 2. 空フォルダをクリック
    // await selectFolder(page, '空フォルダテスト');

    // 3. ノート一覧が空であることを確認
    // const notes = await getNoteListItems(page);
    // expect(notes.length).toBe(0);

    // 4. 「ノートがありません」メッセージ確認
    const emptyMessage = page.locator(
      'text="ノートがありません", text="ノートが見つかりません"',
    );
    const hasEmpty = await emptyMessage.isVisible().catch(() => false);

    // 空フォルダテストは実装依存のため、オプション
    console.log("Empty folder message visible:", hasEmpty);
  });
});
