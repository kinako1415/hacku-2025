/**
 * E2Eテスト: 完全な測定ワークフロー
 *
 * テストシナリオ:
 * 1. ユーザーがアプリを開く
 * 2. カメラ権限を許可する
 * 3. 手首測定を開始する
 * 4. 測定結果を確認する
 * 5. データを保存する
 * 6. カレンダーで記録を確認する
 */

import { test, expect, Page } from '@playwright/test';

test.describe('測定ワークフロー', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // カメラアクセス権限を自動許可するようにコンテキストを設定
    const context = await browser.newContext({
      permissions: ['camera'],
      // モバイルデバイスをエミュレート
      viewport: { width: 375, height: 667 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    });

    page = await context.newPage();

    // メディアストリームをモック
    await page.addInitScript(() => {
      // カメラストリームをモック
      const mockStream = {
        getTracks: () => [
          {
            kind: 'video',
            stop: () => {},
            getSettings: () => ({ width: 640, height: 480 }),
          },
        ],
        getVideoTracks: () => [
          {
            kind: 'video',
            stop: () => {},
            getSettings: () => ({ width: 640, height: 480 }),
          },
        ],
      };

      // getUserMediaをモック
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: () => Promise.resolve(mockStream),
          enumerateDevices: () =>
            Promise.resolve([
              { deviceId: 'camera1', kind: 'videoinput', label: 'Mock Camera' },
            ]),
        },
      });

      // MediaPipe関連の初期化をモック
      (window as any).MediaPipeHands = {
        initialize: () => Promise.resolve(),
        process: () =>
          Promise.resolve({
            landmarks: [
              // モック手のランドマーク（21点）
              { x: 0.5, y: 0.3, z: 0.0 }, // 手首
              { x: 0.45, y: 0.25, z: 0.0 }, // 親指CMC
              { x: 0.4, y: 0.2, z: 0.0 }, // 親指MCP
              { x: 0.35, y: 0.15, z: 0.0 }, // 親指IP
              { x: 0.3, y: 0.1, z: 0.0 }, // 親指先端
              // ... 他のランドマーク（簡略化）
            ],
          }),
      };
    });
  });

  test('完全な測定ワークフローが正常に動作する', async () => {
    // 1. アプリのメイン測定ページを開く
    await page.goto('/measurement');

    // ページが正常に読み込まれることを確認
    await expect(page).toHaveTitle(/リハビリテーション測定/);

    // 2. カメラプレビューが表示されることを確認
    await expect(page.locator('[data-testid="camera-preview"]')).toBeVisible({
      timeout: 10000,
    });

    // カメラ初期化の完了を待つ
    await page.waitForSelector(
      '[data-testid="camera-status"][data-status="ready"]',
      { timeout: 15000 }
    );

    // 3. 手首測定開始ボタンをクリック
    const startButton = page.locator(
      '[data-testid="start-measurement-button"]'
    );
    await expect(startButton).toBeEnabled();
    await startButton.click();

    // 測定モードに入ったことを確認
    await expect(page.locator('[data-testid="measurement-status"]')).toHaveText(
      '測定中...'
    );

    // 4. 手の検出とランドマーク表示を確認
    await page.waitForSelector('[data-testid="hand-landmarks"]', {
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="hand-landmarks"]')).toBeVisible();

    // 角度オーバーレイが表示されることを確認
    await expect(page.locator('[data-testid="angle-overlay"]')).toBeVisible();

    // 5. 測定値が更新されることを確認
    await page.waitForFunction(
      () => {
        const angleValue = document.querySelector(
          '[data-testid="current-angle-value"]'
        );
        return angleValue && angleValue.textContent !== '---';
      },
      { timeout: 5000 }
    );

    const angleValue = await page
      .locator('[data-testid="current-angle-value"]')
      .textContent();
    expect(parseInt(angleValue || '0')).toBeGreaterThan(0);
    expect(parseInt(angleValue || '0')).toBeLessThan(180);

    // 6. 測定を停止
    await page.locator('[data-testid="stop-measurement-button"]').click();

    // 測定結果が表示されることを確認
    await expect(
      page.locator('[data-testid="measurement-results"]')
    ).toBeVisible();

    // 7. 測定データを保存
    await page.locator('[data-testid="save-measurement-button"]').click();

    // 保存成功の通知を確認
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="success-notification"]')
    ).toContainText('測定データを保存しました');

    // 8. カレンダーページに移動して記録を確認
    await page.goto('/calendar');

    // カレンダーが読み込まれることを確認
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();

    // 今日の日付に記録アイコンが表示されることを確認
    const today = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${today}"]`
    );
    await expect(
      todayCell.locator('[data-testid="measurement-indicator"]')
    ).toBeVisible();

    // 9. 記録詳細を表示
    await todayCell.click();

    // 記録詳細モーダルが表示されることを確認
    await expect(
      page.locator('[data-testid="record-detail-modal"]')
    ).toBeVisible();

    // 保存された測定データが表示されることを確認
    await expect(
      page.locator('[data-testid="saved-measurement-angle"]')
    ).toContainText(angleValue || '');

    // 10. 進捗ページで統計を確認
    await page.goto('/progress');

    // 進捗チャートが表示されることを確認
    await expect(page.locator('[data-testid="progress-charts"]')).toBeVisible();

    // 今日の測定が統計に反映されることを確認
    await expect(
      page.locator('[data-testid="total-measurements"]')
    ).toContainText('1');
  });

  test('カメラアクセス拒否時のエラーハンドリング', async () => {
    // カメラアクセスを拒否するようにモック
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: () => Promise.reject(new Error('Permission denied')),
        },
      });
    });

    await page.goto('/measurement');

    // エラーメッセージが表示されることを確認
    await expect(page.locator('[data-testid="camera-error"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="camera-error"]')).toContainText(
      'カメラへのアクセスが拒否されました'
    );

    // 設定ページへのリンクが表示されることを確認
    await expect(
      page.locator('[data-testid="camera-settings-link"]')
    ).toBeVisible();
  });

  test('オフライン状態での測定とデータ同期', async () => {
    // オンライン状態で測定開始
    await page.goto('/measurement');
    await page.waitForSelector(
      '[data-testid="camera-status"][data-status="ready"]'
    );

    // 測定実行
    await page.locator('[data-testid="start-measurement-button"]').click();
    await page.waitForSelector('[data-testid="angle-overlay"]');

    // オフライン状態にする
    await page.context().setOffline(true);

    // 測定停止と保存
    await page.locator('[data-testid="stop-measurement-button"]').click();
    await page.locator('[data-testid="save-measurement-button"]').click();

    // オフライン通知が表示されることを確認
    await expect(
      page.locator('[data-testid="offline-notification"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="offline-notification"]')
    ).toContainText('オフラインモード');

    // データがローカルに保存されることを確認
    await expect(
      page.locator('[data-testid="local-save-notification"]')
    ).toBeVisible();

    // オンライン復帰
    await page.context().setOffline(false);

    // 同期通知が表示されることを確認
    await expect(page.locator('[data-testid="sync-notification"]')).toBeVisible(
      { timeout: 5000 }
    );
    await expect(
      page.locator('[data-testid="sync-notification"]')
    ).toContainText('データを同期しています');
  });

  test('複数回の測定セッション', async () => {
    await page.goto('/measurement');
    await page.waitForSelector(
      '[data-testid="camera-status"][data-status="ready"]'
    );

    // 3回連続で測定を実行
    for (let i = 1; i <= 3; i++) {
      // 測定開始
      await page.locator('[data-testid="start-measurement-button"]').click();
      await page.waitForSelector('[data-testid="angle-overlay"]');

      // 少し待機（測定値の安定化）
      await page.waitForTimeout(2000);

      // 測定停止
      await page.locator('[data-testid="stop-measurement-button"]').click();
      await page.locator('[data-testid="save-measurement-button"]').click();

      // 保存完了を確認
      await expect(
        page.locator('[data-testid="success-notification"]')
      ).toBeVisible();

      // 次の測定のために少し待機
      if (i < 3) {
        await page.waitForTimeout(1000);
      }
    }

    // 進捗ページで複数の測定が記録されていることを確認
    await page.goto('/progress');
    await expect(
      page.locator('[data-testid="total-measurements"]')
    ).toContainText('3');

    // カレンダーで今日の記録が更新されていることを確認
    await page.goto('/calendar');
    const today = new Date().toISOString().split('T')[0];
    const todayCell = page.locator(
      `[data-testid="calendar-day"][data-date="${today}"]`
    );
    await todayCell.click();

    // 複数の測定記録が表示されることを確認
    await expect(
      page.locator(
        '[data-testid="measurement-list"] [data-testid="measurement-item"]'
      )
    ).toHaveCount(3);
  });

  test('測定精度の一貫性チェック', async () => {
    await page.goto('/measurement');
    await page.waitForSelector(
      '[data-testid="camera-status"][data-status="ready"]'
    );

    const measurements: number[] = [];

    // 同じ条件で5回測定
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="start-measurement-button"]').click();
      await page.waitForSelector('[data-testid="angle-overlay"]');

      // 安定化を待つ
      await page.waitForTimeout(3000);

      const angleText = await page
        .locator('[data-testid="current-angle-value"]')
        .textContent();
      const angle = parseInt(angleText || '0');
      measurements.push(angle);

      await page.locator('[data-testid="stop-measurement-button"]').click();
      await page.waitForTimeout(1000);
    }

    // 測定値の一貫性を確認（標準偏差が一定範囲内）
    const average =
      measurements.reduce((a, b) => a + b, 0) / measurements.length;
    const variance =
      measurements.reduce(
        (sum, value) => sum + Math.pow(value - average, 2),
        0
      ) / measurements.length;
    const standardDeviation = Math.sqrt(variance);

    // 標準偏差が10度以内であることを確認（測定の一貫性）
    expect(standardDeviation).toBeLessThan(10);

    // 全ての測定値が有効な範囲内であることを確認
    measurements.forEach((measurement) => {
      expect(measurement).toBeGreaterThan(0);
      expect(measurement).toBeLessThan(180);
    });
  });

  test.afterEach(async () => {
    await page.close();
  });
});
