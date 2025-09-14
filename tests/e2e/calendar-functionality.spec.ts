/**
 * E2Eテスト: カレンダー機能
 *
 * テストシナリオ:
 * 1. カレンダーページの表示
 * 2. 月間ナビゲーション
 * 3. 日付選択と記録詳細表示
 * 4. 記録の作成・編集・削除
 * 5. フィルタリング機能
 * 6. 統計表示
 */

import { test, expect, Page } from '@playwright/test';

test.describe('カレンダー機能', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    page = await context.newPage();

    // ローカルストレージにサンプルデータを設定
    await page.addInitScript(() => {
      const sampleRecords = [
        {
          id: 'record-1',
          userId: 'user-1',
          recordDate: new Date().toISOString(),
          rehabCompleted: true,
          measurementCompleted: true,
          painLevel: 2,
          motivationLevel: 4,
          performanceLevel: 3,
          notes: 'テスト記録です',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'record-2',
          userId: 'user-1',
          recordDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨日
          rehabCompleted: false,
          measurementCompleted: true,
          painLevel: 3,
          motivationLevel: 3,
          performanceLevel: 2,
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      localStorage.setItem(
        'rehabilitation-calendar-records',
        JSON.stringify(sampleRecords)
      );
    });
  });

  test('カレンダーページが正常に表示される', async () => {
    await page.goto('/calendar');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/カレンダー/);

    // カレンダーグリッドが表示されることを確認
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();

    // 月ナビゲーションが表示されることを確認
    await expect(
      page.locator('[data-testid="month-navigation"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="prev-month-button"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="next-month-button"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="current-month-year"]')
    ).toBeVisible();

    // 曜日ヘッダーが表示されることを確認
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    for (const weekday of weekdays) {
      await expect(
        page
          .locator(`[data-testid="weekday-header"]`)
          .filter({ hasText: weekday })
      ).toBeVisible();
    }

    // 今月の日付セルが表示されることを確認
    await expect(page.locator('[data-testid="calendar-day"]')).toHaveCount(42); // 6週間 × 7日
  });

  test('月間ナビゲーションが正常に動作する', async () => {
    await page.goto('/calendar');

    // 現在の月を取得
    const currentMonthText = await page
      .locator('[data-testid="current-month-year"]')
      .textContent();

    // 次月に移動
    await page.locator('[data-testid="next-month-button"]').click();

    // 月表示が変更されることを確認
    const nextMonthText = await page
      .locator('[data-testid="current-month-year"]')
      .textContent();
    expect(nextMonthText).not.toBe(currentMonthText);

    // 前月に戻る
    await page.locator('[data-testid="prev-month-button"]').click();

    // 元の月に戻ることを確認
    const returnedMonthText = await page
      .locator('[data-testid="current-month-year"]')
      .textContent();
    expect(returnedMonthText).toBe(currentMonthText);

    // 今日ボタンで今月に戻る
    await page.locator('[data-testid="next-month-button"]').click();
    await page.locator('[data-testid="today-button"]').click();

    const todayMonthText = await page
      .locator('[data-testid="current-month-year"]')
      .textContent();
    expect(todayMonthText).toBe(currentMonthText);
  });

  test('記録インジケーターが正しく表示される', async () => {
    await page.goto('/calendar');

    // 今日の日付セルを確認
    const today = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${today}"]`
    );

    // リハビリ完了インジケーターが表示されることを確認
    await expect(
      todayCell.locator('[data-testid="rehab-indicator"]')
    ).toBeVisible();

    // 測定完了インジケーターが表示されることを確認
    await expect(
      todayCell.locator('[data-testid="measurement-indicator"]')
    ).toBeVisible();

    // 昨日の日付セル（リハビリ未完了）を確認
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const yesterdayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${yesterday}"]`
    );

    // リハビリ未完了インジケーターが表示されることを確認
    await expect(
      yesterdayCell.locator('[data-testid="rehab-indicator"]')
    ).not.toBeVisible();

    // 測定完了インジケーターは表示されることを確認
    await expect(
      yesterdayCell.locator('[data-testid="measurement-indicator"]')
    ).toBeVisible();
  });

  test('記録詳細モーダルが正常に動作する', async () => {
    await page.goto('/calendar');

    // 今日の日付セルをクリック
    const today = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${today}"]`
    );
    await todayCell.click();

    // 記録詳細モーダルが表示されることを確認
    await expect(
      page.locator('[data-testid="record-detail-modal"]')
    ).toBeVisible();

    // モーダルヘッダーに正しい日付が表示されることを確認
    const modalHeader = page.locator('[data-testid="modal-header-date"]');
    await expect(modalHeader).toContainText(
      new Date().toLocaleDateString('ja-JP')
    );

    // 記録データが表示されることを確認
    await expect(page.locator('[data-testid="rehab-status"]')).toContainText(
      '完了'
    );
    await expect(
      page.locator('[data-testid="measurement-status"]')
    ).toContainText('完了');
    await expect(page.locator('[data-testid="pain-level"]')).toContainText('2');
    await expect(
      page.locator('[data-testid="motivation-level"]')
    ).toContainText('4');
    await expect(
      page.locator('[data-testid="performance-level"]')
    ).toContainText('3');
    await expect(page.locator('[data-testid="notes"]')).toContainText(
      'テスト記録です'
    );

    // モーダルを閉じる
    await page.locator('[data-testid="close-modal-button"]').click();
    await expect(
      page.locator('[data-testid="record-detail-modal"]')
    ).not.toBeVisible();
  });

  test('記録の編集機能が正常に動作する', async () => {
    await page.goto('/calendar');

    // 今日の日付セルをクリックしてモーダルを開く
    const today = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${today}"]`
    );
    await todayCell.click();

    // 編集ボタンをクリック
    await page.locator('[data-testid="edit-record-button"]').click();

    // 編集フォームが表示されることを確認
    await expect(
      page.locator('[data-testid="edit-record-form"]')
    ).toBeVisible();

    // フィールドを編集
    await page.locator('[data-testid="pain-level-input"]').selectOption('4');
    await page
      .locator('[data-testid="motivation-level-input"]')
      .selectOption('5');
    await page
      .locator('[data-testid="notes-input"]')
      .fill('編集されたテスト記録');

    // 保存ボタンをクリック
    await page.locator('[data-testid="save-record-button"]').click();

    // 成功通知が表示されることを確認
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toContainText('記録を更新しました');

    // 更新された値が表示されることを確認
    await expect(page.locator('[data-testid="pain-level"]')).toContainText('4');
    await expect(
      page.locator('[data-testid="motivation-level"]')
    ).toContainText('5');
    await expect(page.locator('[data-testid="notes"]')).toContainText(
      '編集されたテスト記録'
    );
  });

  test('新しい記録の作成が正常に動作する', async () => {
    await page.goto('/calendar');

    // 記録のない日付（明日）をクリック
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const tomorrowCell = page.locator(
      `[data-testid="calendar-day"][data-date="${tomorrow}"]`
    );
    await tomorrowCell.click();

    // 新規記録作成モーダルが表示されることを確認
    await expect(
      page.locator('[data-testid="create-record-modal"]')
    ).toBeVisible();

    // フォームに入力
    await page.locator('[data-testid="rehab-completed-checkbox"]').check();
    await page
      .locator('[data-testid="measurement-completed-checkbox"]')
      .check();
    await page.locator('[data-testid="pain-level-select"]').selectOption('1');
    await page
      .locator('[data-testid="motivation-level-select"]')
      .selectOption('5');
    await page
      .locator('[data-testid="performance-level-select"]')
      .selectOption('4');
    await page.locator('[data-testid="notes-textarea"]').fill('新しい記録です');

    // 保存ボタンをクリック
    await page.locator('[data-testid="create-record-button"]').click();

    // 成功通知が表示されることを確認
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toContainText('記録を作成しました');

    // カレンダーに戻って記録インジケーターが表示されることを確認
    await expect(
      tomorrowCell.locator('[data-testid="rehab-indicator"]')
    ).toBeVisible();
    await expect(
      tomorrowCell.locator('[data-testid="measurement-indicator"]')
    ).toBeVisible();
  });

  test('記録の削除機能が正常に動作する', async () => {
    await page.goto('/calendar');

    // 昨日の記録を削除
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const yesterdayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${yesterday}"]`
    );
    await yesterdayCell.click();

    // 削除ボタンをクリック
    await page.locator('[data-testid="delete-record-button"]').click();

    // 確認ダイアログが表示されることを確認
    await expect(
      page.locator('[data-testid="delete-confirmation-dialog"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="delete-confirmation-message"]')
    ).toContainText('この記録を削除しますか？');

    // 削除を確認
    await page.locator('[data-testid="confirm-delete-button"]').click();

    // 成功通知が表示されることを確認
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toContainText('記録を削除しました');

    // インジケーターが消えることを確認
    await expect(
      yesterdayCell.locator('[data-testid="measurement-indicator"]')
    ).not.toBeVisible();
  });

  test('フィルタリング機能が正常に動作する', async () => {
    await page.goto('/calendar');

    // フィルターパネルを開く
    await page.locator('[data-testid="filter-toggle-button"]').click();
    await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();

    // リハビリ完了のみ表示
    await page.locator('[data-testid="filter-rehab-completed"]').check();
    await page.locator('[data-testid="apply-filter-button"]').click();

    // フィルター適用後、該当する記録のみ表示されることを確認
    const today = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${today}"]`
    );
    await expect(
      todayCell.locator('[data-testid="rehab-indicator"]')
    ).toBeVisible();

    // フィルターをクリア
    await page.locator('[data-testid="clear-filter-button"]').click();

    // 全ての記録が再表示されることを確認
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const yesterdayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${yesterday}"]`
    );
    await expect(
      yesterdayCell.locator('[data-testid="measurement-indicator"]')
    ).toBeVisible();
  });

  test('月間統計が正しく表示される', async () => {
    await page.goto('/calendar');

    // 統計パネルが表示されることを確認
    await expect(page.locator('[data-testid="monthly-stats"]')).toBeVisible();

    // 各統計項目を確認
    await expect(
      page.locator('[data-testid="total-active-days"]')
    ).toContainText('2');
    await expect(
      page.locator('[data-testid="rehab-completion-rate"]')
    ).toContainText('50%'); // 1/2
    await expect(
      page.locator('[data-testid="measurement-completion-rate"]')
    ).toContainText('100%'); // 2/2

    // 平均値の表示を確認
    await expect(
      page.locator('[data-testid="average-pain-level"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="average-motivation-level"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="average-performance-level"]')
    ).toBeVisible();

    // 連続記録日数の表示を確認
    await expect(page.locator('[data-testid="current-streak"]')).toBeVisible();
  });

  test('カレンダーのレスポンシブデザイン', async () => {
    // モバイルビューポートでテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/calendar');

    // カレンダーがモバイル表示に適応することを確認
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();

    // 月ナビゲーションがモバイル用レイアウトになることを確認
    await expect(
      page.locator('[data-testid="mobile-month-navigation"]')
    ).toBeVisible();

    // 日付セルがタッチに適したサイズになることを確認
    const dayCell = page.locator('[data-testid="calendar-day"]').first();
    const boundingBox = await dayCell.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(44); // 最小タッチサイズ
    expect(boundingBox?.height).toBeGreaterThan(44);

    // タブレットビューポートでテスト
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // カレンダーがタブレット表示に適応することを確認
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
  });

  test('キーボードナビゲーション', async () => {
    await page.goto('/calendar');

    // カレンダーグリッドにフォーカス
    await page.locator('[data-testid="calendar-grid"]').focus();

    // 矢印キーでナビゲーション
    await page.keyboard.press('ArrowRight');
    await expect(
      page.locator('[data-testid="calendar-day"]:focus')
    ).toBeVisible();

    // Enterキーで詳細表示
    await page.keyboard.press('Enter');
    await expect(
      page.locator(
        '[data-testid="record-detail-modal"], [data-testid="create-record-modal"]'
      )
    ).toBeVisible();

    // Escapeキーでモーダルを閉じる
    await page.keyboard.press('Escape');
    await expect(
      page.locator(
        '[data-testid="record-detail-modal"], [data-testid="create-record-modal"]'
      )
    ).not.toBeVisible();
  });

  test.afterEach(async () => {
    await page.close();
  });
});
