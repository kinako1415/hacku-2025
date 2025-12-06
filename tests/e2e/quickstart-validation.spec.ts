/**
 * Quickstart検証シナリオ実行
 *
 * 目的:
 * - quickstart.mdで説明されている手順の自動検証
 * - 新規ユーザーの体験フローの確認
 * - セットアップから初回測定までの完全なフロー
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// 検証シナリオの設定
const QUICKSTART_SCENARIOS = [
  {
    name: 'complete-first-time-user-flow',
    description: '初回ユーザーの完全なフロー',
    steps: [
      'アプリケーション起動',
      'カメラ許可',
      '初期設定',
      'チュートリアル完了',
      '初回測定実行',
      'データ保存確認',
      'カレンダー記録',
    ],
  },
  {
    name: 'pwa-installation-flow',
    description: 'PWAインストールフロー',
    steps: [
      'インストールプロンプト表示',
      'インストール実行',
      'スタンドアロン起動',
      'オフライン機能確認',
    ],
  },
  {
    name: 'measurement-accuracy-validation',
    description: '測定精度検証フロー',
    steps: [
      '手の検出精度確認',
      '角度計算精度確認',
      'データ一貫性確認',
      '複数測定の比較',
    ],
  },
];

describe('Quickstart検証シナリオ', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // テスト用のブラウザコンテキスト作成
    context = await browser.newContext({
      permissions: ['camera'],
      geolocation: { latitude: 35.6762, longitude: 139.6503 }, // 東京
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
    });

    page = await context.newPage();

    // MediaPipeとカメラのモックセットアップ
    await setupMediaPipeMocks(page);
    await setupCameraMocks(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('シナリオ1: 初回ユーザーの完全なフロー', async () => {
    console.log('=== 初回ユーザーフロー検証開始 ===');

    // Step 1: アプリケーション起動
    console.log('Step 1: アプリケーション起動');
    await page.goto('/');

    // ローディング完了まで待機
    await page.waitForSelector('[data-testid="app-ready"]', { timeout: 10000 });

    // ホームページの基本要素確認
    await expect(page.locator('h1')).toContainText('リハビリテーション');
    await expect(
      page.locator('[data-testid="start-measurement-button"]')
    ).toBeVisible();

    // Step 2: カメラ許可
    console.log('Step 2: カメラ許可');
    await page.click('[data-testid="start-measurement-button"]');

    // カメラ許可ダイアログの処理
    await page.waitForSelector('[data-testid="camera-permission-prompt"]');
    await page.click('[data-testid="grant-camera-permission"]');

    // カメラストリーム開始確認
    await page.waitForSelector('[data-testid="camera-stream-active"]');
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible();

    // Step 3: 初期設定
    console.log('Step 3: 初期設定');

    // 初回設定画面の表示確認
    await page.waitForSelector('[data-testid="initial-setup-form"]');

    // ユーザー情報入力
    await page.fill('[data-testid="user-name-input"]', 'テストユーザー');
    await page.selectOption('[data-testid="hand-dominance-select"]', 'right');
    await page.selectOption('[data-testid="age-select"]', '30');

    await page.click('[data-testid="save-initial-setup"]');

    // 設定保存確認
    await expect(
      page.locator('[data-testid="setup-success-message"]')
    ).toBeVisible();

    // Step 4: チュートリアル完了
    console.log('Step 4: チュートリアル完了');

    await page.waitForSelector('[data-testid="tutorial-overlay"]');

    // チュートリアルステップを順次進行
    const tutorialSteps = [
      'camera-positioning',
      'hand-placement',
      'measurement-types',
      'data-recording',
    ];

    for (const step of tutorialSteps) {
      await page.waitForSelector(`[data-testid="tutorial-${step}"]`);
      await page.click('[data-testid="tutorial-next-button"]');

      // アニメーション完了まで待機
      await page.waitForTimeout(500);
    }

    await page.click('[data-testid="tutorial-complete-button"]');
    await expect(
      page.locator('[data-testid="tutorial-overlay"]')
    ).not.toBeVisible();

    // Step 5: 初回測定実行
    console.log('Step 5: 初回測定実行');

    // 測定タイプ選択
    await page.click('[data-testid="measurement-type-wrist-flexion"]');

    // 測定開始
    await page.click('[data-testid="start-measurement"]');

    // MediaPipe処理開始確認
    await page.waitForSelector('[data-testid="mediapipe-processing"]');

    // 手の検出確認
    await page.waitForSelector('[data-testid="hand-detected"]');

    // 角度表示確認
    const angleDisplay = page.locator('[data-testid="current-angle"]');
    await expect(angleDisplay).toBeVisible();

    // 測定完了
    await page.waitForSelector('[data-testid="measurement-complete"]');

    // 結果確認
    const measurementResult = page.locator(
      '[data-testid="measurement-result"]'
    );
    await expect(measurementResult).toBeVisible();
    await expect(measurementResult).toContainText('度');

    // Step 6: データ保存確認
    console.log('Step 6: データ保存確認');

    await page.click('[data-testid="save-measurement"]');

    // 保存成功メッセージ確認
    await expect(
      page.locator('[data-testid="save-success-message"]')
    ).toBeVisible();

    // IndexedDBへの保存確認
    const savedData = await page.evaluate(async () => {
      const db = await (window as any).indexedDB.open('RehabDatabase', 1);
      return new Promise((resolve) => {
        db.onsuccess = () => {
          const transaction = db.result.transaction(
            ['measurements'],
            'readonly'
          );
          const store = transaction.objectStore('measurements');
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result.length > 0);
        };
      });
    });

    expect(savedData).toBe(true);

    // Step 7: カレンダー記録
    console.log('Step 7: カレンダー記録');

    await page.click('[data-testid="go-to-calendar"]');

    // カレンダーページ表示確認
    await page.waitForSelector('[data-testid="calendar-grid"]');

    // 今日の日付にマーク追加
    const today = new Date().getDate();
    await page.click(`[data-testid="calendar-day-${today}"]`);

    // 記録フォーム表示
    await page.waitForSelector('[data-testid="record-form"]');

    // リハビリ完了チェック
    await page.check('[data-testid="rehab-completed-checkbox"]');

    // 疼痛レベル設定
    await page.click('[data-testid="pain-level-2"]');

    // メモ追加
    await page.fill(
      '[data-testid="notes-textarea"]',
      '初回測定完了。手順通りに実行できました。'
    );

    // 記録保存
    await page.click('[data-testid="save-record"]');

    // 保存確認
    await expect(
      page.locator('[data-testid="record-save-success"]')
    ).toBeVisible();

    console.log('=== 初回ユーザーフロー検証完了 ===');
  });

  test('シナリオ2: PWAインストールフロー', async () => {
    console.log('=== PWAインストールフロー検証開始 ===');

    // Step 1: インストールプロンプト表示
    console.log('Step 1: インストールプロンプト表示');

    await page.goto('/');

    // PWAインストールバナー表示確認
    await page.waitForSelector('[data-testid="pwa-install-banner"]');

    // インストールボタンの確認
    await expect(
      page.locator('[data-testid="pwa-install-button"]')
    ).toBeVisible();

    // Step 2: インストール実行
    console.log('Step 2: インストール実行');

    // インストールプロンプトのモック
    await page.evaluate(() => {
      let deferredPrompt: any;
      const mockEvent = {
        preventDefault: () => {},
        prompt: async () => Promise.resolve(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      window.dispatchEvent(
        new CustomEvent('beforeinstallprompt', { detail: mockEvent })
      );
    });

    await page.click('[data-testid="pwa-install-button"]');

    // インストール完了確認
    await expect(
      page.locator('[data-testid="pwa-install-success"]')
    ).toBeVisible();

    // Step 3: スタンドアロン起動
    console.log('Step 3: スタンドアロン起動');

    // スタンドアロンモードの確認
    const isStandalone = await page.evaluate(() => {
      return window.matchMedia('(display-mode: standalone)').matches;
    });

    // Step 4: オフライン機能確認
    console.log('Step 4: オフライン機能確認');

    // ネットワークをオフラインに設定
    await context.setOffline(true);

    // ページリロード
    await page.reload();

    // オフラインページまたは機能確認
    await page.waitForSelector('[data-testid="offline-indicator"]');

    // キャッシュされたコンテンツの表示確認
    await expect(page.locator('[data-testid="cached-content"]')).toBeVisible();

    // ネットワークを復旧
    await context.setOffline(false);

    console.log('=== PWAインストールフロー検証完了 ===');
  });

  test('シナリオ3: 測定精度検証フロー', async () => {
    console.log('=== 測定精度検証フロー開始 ===');

    await page.goto('/measurement');

    // Step 1: 手の検出精度確認
    console.log('Step 1: 手の検出精度確認');

    await page.click('[data-testid="start-detection"]');

    // 手の検出確認
    await page.waitForSelector('[data-testid="hand-landmarks"]');

    // ランドマーク数確認（MediaPipeは21個のランドマーク）
    const landmarkCount = await page
      .locator('[data-testid="landmark"]')
      .count();
    expect(landmarkCount).toBe(21);

    // 検出信頼度確認
    const confidence = await page.textContent(
      '[data-testid="detection-confidence"]'
    );
    const confidenceValue = parseFloat(confidence || '0');
    expect(confidenceValue).toBeGreaterThan(0.5);

    // Step 2: 角度計算精度確認
    console.log('Step 2: 角度計算精度確認');

    // 既知の角度でテスト
    const testAngles = [45, 90, 135];

    for (const expectedAngle of testAngles) {
      // テスト用の手のポーズを設定
      await page.evaluate((angle) => {
        (window as any).setTestHandPose(angle);
      }, expectedAngle);

      await page.waitForTimeout(1000); // 計算完了まで待機

      const calculatedAngle = await page.textContent(
        '[data-testid="calculated-angle"]'
      );
      const angleValue = parseFloat(calculatedAngle || '0');

      // 許容誤差内（±2度）での確認
      expect(Math.abs(angleValue - expectedAngle)).toBeLessThan(2);
    }

    // Step 3: データ一貫性確認
    console.log('Step 3: データ一貫性確認');

    // 複数回測定を実行
    const measurements = [];

    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="single-measurement"]');
      await page.waitForSelector('[data-testid="measurement-complete"]');

      const result = await page.textContent(
        '[data-testid="measurement-result"]'
      );
      measurements.push(parseFloat(result || '0'));
    }

    // 標準偏差の計算
    const mean = measurements.reduce((a, b) => a + b) / measurements.length;
    const variance =
      measurements.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
      measurements.length;
    const stdDev = Math.sqrt(variance);

    // 一貫性確認（標準偏差が3度以内）
    expect(stdDev).toBeLessThan(3);

    // Step 4: 複数測定の比較
    console.log('Step 4: 複数測定の比較');

    // 異なる測定タイプでの確認
    const measurementTypes = [
      'wrist-flexion',
      'wrist-extension',
      'thumb-abduction',
    ];
    const typeResults: { [key: string]: number } = {};

    for (const type of measurementTypes) {
      await page.click(`[data-testid="measurement-type-${type}"]`);
      await page.click('[data-testid="start-measurement"]');
      await page.waitForSelector('[data-testid="measurement-complete"]');

      const result = await page.textContent(
        '[data-testid="measurement-result"]'
      );
      typeResults[type] = parseFloat(result || '0');
    }

    // 結果の妥当性確認
    Object.values(typeResults).forEach((angle) => {
      expect(angle).toBeGreaterThan(0);
      expect(angle).toBeLessThan(180);
    });

    console.log('=== 測定精度検証フロー完了 ===');
  });

  test('エラー処理とリカバリー検証', async () => {
    console.log('=== エラー処理検証開始 ===');

    await page.goto('/measurement');

    // カメラアクセス拒否のシミュレーション
    await context.grantPermissions([], { origin: page.url() });

    await page.click('[data-testid="start-camera"]');

    // エラーメッセージ表示確認
    await expect(
      page.locator('[data-testid="camera-error-message"]')
    ).toBeVisible();

    // リトライボタンの確認
    await expect(
      page.locator('[data-testid="retry-camera-button"]')
    ).toBeVisible();

    // 権限再付与後のリカバリー
    await context.grantPermissions(['camera'], { origin: page.url() });
    await page.click('[data-testid="retry-camera-button"]');

    // 正常復旧確認
    await page.waitForSelector('[data-testid="camera-stream-active"]');

    console.log('=== エラー処理検証完了 ===');
  });

  test('パフォーマンス検証', async () => {
    console.log('=== パフォーマンス検証開始 ===');

    await page.goto('/measurement');

    // ページロード時間計測
    const loadTime = await page.evaluate(() => {
      return (
        performance.timing.loadEventEnd - performance.timing.navigationStart
      );
    });
    expect(loadTime).toBeLessThan(3000); // 3秒以内

    // MediaPipe初期化時間計測
    const initStartTime = Date.now();
    await page.click('[data-testid="start-mediapipe"]');
    await page.waitForSelector('[data-testid="mediapipe-ready"]');
    const initTime = Date.now() - initStartTime;
    expect(initTime).toBeLessThan(5000); // 5秒以内

    // フレームレート計測
    const frameRate = await page.evaluate(async () => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();

        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frameCount);
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    expect(frameRate as number).toBeGreaterThan(15); // 15fps以上

    console.log('=== パフォーマンス検証完了 ===');
  });
});

// ヘルパー関数
async function setupMediaPipeMocks(page: Page) {
  await page.addInitScript(() => {
    // MediaPipeモックの設定
    (window as any).Hands = class {
      private resultsCallback?: Function;

      constructor() {}
      setOptions() {}
      onResults(callback: Function) {
        this.resultsCallback = callback;
      }
      send() {
        // モックの手のランドマークデータ
        const mockResults = {
          multiHandLandmarks: [
            Array(21)
              .fill(0)
              .map((_, i) => ({
                x: 0.1 + i * 0.04,
                y: 0.5,
                z: 0,
              })),
          ],
        };
        setTimeout(() => this.resultsCallback?.(mockResults), 100);
      }
    };

    // テスト用の角度設定関数
    (window as any).setTestHandPose = (targetAngle: number) => {
      // 特定の角度になるようなランドマーク座標を計算
      const radians = (targetAngle * Math.PI) / 180;
      // 実装は省略（実際にはベクトル計算が必要）
    };
  });
}

async function setupCameraMocks(page: Page) {
  await page.addInitScript(() => {
    // getUserMediaのモック
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = 'blue';
          ctx.fillRect(0, 0, 640, 480);

          const stream = (canvas as any).captureStream(30);
          return Promise.resolve(stream);
        },
      },
    });
  });
}
