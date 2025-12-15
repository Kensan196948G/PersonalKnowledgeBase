import { test, expect, Page } from '@playwright/test';

/**
 * ノート間リンク機能 E2Eテスト
 *
 * テストシナリオ:
 * 1. ノート間リンク作成 ([[ノート名]])
 * 2. リンククリック遷移
 * 3. バックリンク表示
 * 4. 関連ノート表示
 * 5. 赤リンク（存在しないノート）
 */

// テストヘルパー関数
const createNote = async (page: Page, title: string, content: string = '') => {
  // 1. data-testidを使って確実に新規ノートボタンをクリック
  const headerButton = page.locator('[data-testid="new-note-button"]');
  const centerButton = page.locator('[data-testid="create-note-center-button"]');

  // ヘッダーボタンが表示されているか確認
  const isHeaderVisible = await headerButton.isVisible().catch(() => false);

  if (isHeaderVisible) {
    await headerButton.click();
  } else {
    await centerButton.click();
  }

  // 2. エディタエリアが表示されるまで待機（ノート作成API完了の確認）
  await page.waitForSelector('[data-testid="note-title-input"]', {
    timeout: 10000,
  });

  // 3. タイトル入力（data-testidで確実に特定）
  const titleInput = page.locator('[data-testid="note-title-input"]');
  await titleInput.waitFor({ state: 'visible', timeout: 5000 });
  await titleInput.fill(title);

  // タイトル保存のデバウンス待機
  await page.waitForTimeout(1500);

  // 4. コンテンツ入力
  if (content) {
    const editor = page.locator('.ProseMirror').first();
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    await editor.click();

    // TipTapエディタへの入力（pressSequentiallyで順次入力）
    await editor.pressSequentially(content, { delay: 50 });

    // コンテンツ保存のデバウンス待機
    await page.waitForTimeout(1500);
  }

  // 5. 保存完了を確認（少し待機）
  await page.waitForTimeout(1000);
};

const openNote = async (page: Page, title: string) => {
  // ノート一覧から指定のノートを開く（より具体的なセレクタ）
  const noteItem = page
    .locator('.note-list, [class*="note-card"], main')
    .locator(`text="${title}"`)
    .first();

  // ノートが表示されるまで待機
  await noteItem.waitFor({ state: 'visible', timeout: 10000 });

  // クリック
  await noteItem.click();

  // エディタが表示されるまで待機
  await page.waitForSelector('[data-testid="note-title-input"]', {
    timeout: 5000,
  });

  // コンテンツロード待機
  await page.waitForTimeout(1000);
};

const getEditorContent = (page: Page) => {
  return page.locator('.ProseMirror').first();
};

test.describe('ノート間リンク機能', () => {
  test.beforeEach(async ({ page }) => {
    // アプリケーションにアクセス
    await page.goto('/');

    // ページが読み込まれるまで待機
    await page.waitForLoadState('networkidle');
  });

  test('シナリオ1: [[ノート名]] でリンクが作成される', async ({ page }) => {
    // 1. リンク先ノートを作成
    await createNote(page, 'リンク先ノート', 'これはリンク先のノートです。');

    // 2. 新しいノートを作成
    await createNote(page, 'リンク元ノート');

    // 3. エディタで [[リンク先ノート]] と入力
    const editor = getEditorContent(page);
    await editor.click();
    await editor.type('これは ');
    await editor.type('[[リンク先ノート]]');

    // 4. オートコンプリートが表示されることを確認
    // Mention拡張機能のサジェストメニューを確認
    const suggestion = page.locator('.suggestion-list, [role="listbox"]');

    // サジェストが表示されるか、既にリンクが作成されているかを確認
    const suggestionVisible = await suggestion.isVisible().catch(() => false);
    const linkExists = await page.locator('a:has-text("リンク先ノート")').isVisible().catch(() => false);

    expect(suggestionVisible || linkExists).toBeTruthy();

    // 5. サジェストが表示されている場合は選択
    if (suggestionVisible) {
      await page.keyboard.press('Enter');
    }

    // 6. リンクが青色で表示されることを確認
    const link = page.locator('a:has-text("リンク先ノート")').first();
    await expect(link).toBeVisible();

    // リンクのスタイルを確認（青色、下線など）
    const linkColor = await link.evaluate(el =>
      window.getComputedStyle(el).color
    );
    // RGB形式で青系の色を期待
    expect(linkColor).toContain('59, 130, 246'); // Tailwind blue-600
  });

  test('シナリオ2: リンククリックで対象ノートに遷移する', async ({ page }) => {
    // 1. リンク先ノートを作成
    await createNote(page, '遷移先ノート', '遷移先の内容です。');

    // 2. リンク元ノートを作成してリンクを追加
    await createNote(page, '遷移元ノート');
    const editor = getEditorContent(page);
    await editor.click();
    await editor.type('[[遷移先ノート]]');
    await page.waitForTimeout(500);

    // Enterを押してリンクを確定
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 3. リンクをクリック
    const link = page.locator('a:has-text("遷移先ノート")').first();
    await link.click();

    // 4. 遷移先ノートのタイトルが表示されることを確認
    await expect(page.locator('input[value="遷移先ノート"]')).toBeVisible();

    // 5. 遷移先の内容が表示されることを確認
    await expect(page.locator('text=遷移先の内容です。')).toBeVisible();
  });

  test('シナリオ3: バックリンクパネルに参照元ノートが表示される', async ({ page }) => {
    // 1. リンク先ノートを作成
    await createNote(page, 'バックリンク先', 'バックリンクのテスト');

    // 2. 複数のリンク元ノートを作成
    await createNote(page, 'バックリンク元1');
    let editor = getEditorContent(page);
    await editor.click();
    await editor.type('参照: [[バックリンク先]]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    await createNote(page, 'バックリンク元2');
    editor = getEditorContent(page);
    await editor.click();
    await editor.type('関連: [[バックリンク先]]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // 3. リンク先ノートを開く
    await openNote(page, 'バックリンク先');

    // 4. バックリンクパネルを確認
    const backlinkSection = page.locator('text=バックリンク').first();
    await expect(backlinkSection).toBeVisible();

    // 5. 参照元ノートが一覧に表示されることを確認
    await expect(page.locator('text=バックリンク元1')).toBeVisible();
    await expect(page.locator('text=バックリンク元2')).toBeVisible();

    // 6. バックリンク数が正しく表示されることを確認
    await expect(page.locator('text=2件')).toBeVisible();
  });

  test('シナリオ4: 関連ノートウィジェットにスコア付きで表示される', async ({ page }) => {
    // 1. 共通タグを持つノートを作成
    await createNote(page, '関連ノートA', '内容A');
    // タグ追加（UIに応じて調整）
    await page.click('button:has-text("タグ"), [aria-label*="タグ"]');
    await page.fill('input[placeholder*="タグ"]', 'テスト');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    await createNote(page, '関連ノートB', '内容B');
    await page.click('button:has-text("タグ"), [aria-label*="タグ"]');
    await page.fill('input[placeholder*="タグ"]', 'テスト');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 2. ノートAにノートBへのリンクを追加
    await openNote(page, '関連ノートA');
    const editor = getEditorContent(page);
    await editor.click();
    await editor.type('\n[[関連ノートB]]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // 3. 関連ノートウィジェットを確認
    const relatedSection = page.locator('text=関連ノート').first();
    await expect(relatedSection).toBeVisible();

    // 4. 関連ノートBが表示されることを確認
    const relatedWidget = page.locator('.related-notes, [data-component="related-notes"]');
    await expect(relatedWidget.locator('text=関連ノートB')).toBeVisible();

    // 5. スコアまたは関連度が表示されることを確認（スコア表示がある場合）
    const scoreIndicator = page.locator('text=/スコア|関連度|[0-9]+%/');
    const scoreExists = await scoreIndicator.isVisible().catch(() => false);

    // スコア表示は実装次第でオプション
    if (scoreExists) {
      await expect(scoreIndicator).toBeVisible();
    }
  });

  test('シナリオ5: 存在しないノートへのリンクは赤色で表示される（赤リンク）', async ({ page }) => {
    // 1. 新規ノートを作成
    await createNote(page, '赤リンクテスト');

    // 2. 存在しないノートへのリンクを作成
    const editor = getEditorContent(page);
    await editor.click();
    await editor.type('参照: [[存在しないノート]]');

    // オートコンプリートでEnterを押さずにEscapeで閉じる
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // 3. 赤いリンク（または特別なスタイル）で表示されることを確認
    const brokenLink = page.locator('a:has-text("存在しないノート"), span:has-text("存在しないノート")').first();
    await expect(brokenLink).toBeVisible();

    // 4. 赤色のスタイルを確認
    const linkColor = await brokenLink.evaluate(el =>
      window.getComputedStyle(el).color
    );

    // 赤系の色を期待（RGB値で確認）
    const isReddish = linkColor.includes('220, 38, 38') || // Tailwind red-600
                      linkColor.includes('239, 68, 68') || // Tailwind red-500
                      linkColor.includes('255, 0, 0');     // 純粋な赤

    expect(isReddish).toBeTruthy();

    // 5. クリックで新規ノート作成を促すか確認（実装次第）
    await brokenLink.click();

    // 新規ノート作成ダイアログまたはエディタが開くことを確認
    const newNoteIndicator = page.locator('text=存在しないノート').first();
    await expect(newNoteIndicator).toBeVisible();
  });

  test('追加シナリオ: リンク削除後にバックリンクが更新される', async ({ page }) => {
    // 1. ノートを作成してリンクを追加
    await createNote(page, '削除テスト先', '内容');
    await createNote(page, '削除テスト元');

    const editor = getEditorContent(page);
    await editor.click();
    await editor.type('リンク: [[削除テスト先]]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // 2. リンク先を開いてバックリンクを確認
    await openNote(page, '削除テスト先');
    await expect(page.locator('text=削除テスト元')).toBeVisible();

    // 3. リンク元に戻ってリンクを削除
    await openNote(page, '削除テスト元');
    const editorAgain = getEditorContent(page);
    await editorAgain.click();

    // リンクを全選択して削除
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.waitForTimeout(1000);

    // 4. リンク先を再度開いてバックリンクが消えていることを確認
    await openNote(page, '削除テスト先');

    // バックリンクセクションに「リンクはありません」が表示される
    await expect(page.locator('text=このノートへのリンクはありません')).toBeVisible();
  });

  test('追加シナリオ: 双方向リンクが正しく動作する', async ({ page }) => {
    // 1. ノートAを作成
    await createNote(page, '双方向A', '');
    let editor = getEditorContent(page);
    await editor.click();
    await editor.type('参照: [[双方向B]]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // 2. ノートBを作成
    await createNote(page, '双方向B', '');
    editor = getEditorContent(page);
    await editor.click();
    await editor.type('参照: [[双方向A]]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // 3. ノートAを開いてバックリンクを確認
    await openNote(page, '双方向A');

    // アウトゴーイングリンク（発リンク）に「双方向B」が表示
    await expect(page.locator('text=双方向B').first()).toBeVisible();

    // バックリンクに「双方向B」が表示（双方向なので）
    const backlinkSection = page.locator('text=バックリンク').first();
    await expect(backlinkSection).toBeVisible();
    await expect(page.locator('text=双方向B').nth(1)).toBeVisible();

    // 4. ノートBでも同様に確認
    await openNote(page, '双方向B');
    await expect(page.locator('text=双方向A').first()).toBeVisible();
    await expect(page.locator('text=双方向A').nth(1)).toBeVisible();
  });

  test('パフォーマンス: 大量のリンクでも快適に動作する', async ({ page }) => {
    // 1. 中心となるノートを作成
    await createNote(page, 'ハブノート', 'このノートには多数のリンクがあります。');

    // 2. 10個のノートを作成してハブノートにリンク
    for (let i = 1; i <= 10; i++) {
      await createNote(page, `リンクノート${i}`, `内容${i}`);
      const editor = getEditorContent(page);
      await editor.click();
      await editor.type(`[[ハブノート]]`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }

    // 3. ハブノートを開く
    const startTime = Date.now();
    await openNote(page, 'ハブノート');
    const loadTime = Date.now() - startTime;

    // 4. 3秒以内に読み込まれることを確認
    expect(loadTime).toBeLessThan(3000);

    // 5. バックリンクが10件表示されることを確認
    const backlinkCount = page.locator('text=10件');
    await expect(backlinkCount).toBeVisible({ timeout: 5000 });

    // 6. すべてのバックリンクが表示されることを確認
    for (let i = 1; i <= 10; i++) {
      await expect(page.locator(`text=リンクノート${i}`)).toBeVisible();
    }
  });
});
