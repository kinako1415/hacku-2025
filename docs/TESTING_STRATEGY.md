# テスト戦略

## テスト戦略概要

本プロジェクトでは、医療機器として求められる高い品質を保証するため、包括的なテスト戦略を採用しています。

### テストピラミッド

```
        E2E Tests (少数・高価値)
           /\
          /  \
         /    \
        /      \
   Integration Tests (中程度)
      /\        /\
     /  \      /  \
    /    \    /    \
   /      \  /      \
  Unit Tests (多数・高速)
```

### テストの種類と役割

| テスト種類        | 目的                            | 実行頻度     | カバレッジ目標 |
| ----------------- | ------------------------------- | ------------ | -------------- |
| Unit Tests        | 個別関数・コンポーネントの検証  | 毎回コミット | 90%+           |
| Integration Tests | MediaPipe統合・データベース連携 | 毎回プッシュ | 80%+           |
| Contract Tests    | API仕様準拠の確認               | 毎回プッシュ | 100%           |
| E2E Tests         | ユーザーフロー全体              | 毎回リリース | 主要パス100%   |

## ユニットテスト (Unit Tests)

### テストファイル構造

```
tests/unit/
├── angle-calculator.test.ts       # 角度計算ロジック
├── data-validation.test.ts        # データ検証ロジック
├── measurement-service.test.ts    # 測定サービス
└── camera-utils.test.ts          # カメラユーティリティ
```

### 角度計算テスト

```typescript
// tests/unit/angle-calculator.test.ts
import {
  calculateWristAngle,
  validateLandmarks,
} from '@/lib/utils/angle-calculator';

describe('角度計算', () => {
  test('正常な掌屈角度を計算できる', () => {
    const mockLandmarks = [
      { x: 0.5, y: 0.5, z: 0.0 }, // 手首 (WRIST)
      { x: 0.4, y: 0.4, z: 0.0 }, // 親指付け根 (THUMB_CMC)
      { x: 0.6, y: 0.4, z: 0.0 }, // 人差し指付け根 (INDEX_FINGER_MCP)
      { x: 0.5, y: 0.3, z: 0.0 }, // 中指付け根 (MIDDLE_FINGER_MCP)
      // ... MediaPipe Hands の21個のランドマーク完全セット
    ];

    const angle = calculateWristAngle(mockLandmarks, 'palmar-flexion');

    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(90);
    expect(typeof angle).toBe('number');
  });

  test('背屈角度の計算精度', () => {
    const mockLandmarks = generateMockHandLandmarks();
    const angle = calculateWristAngle(mockLandmarks, 'dorsal-flexion');

    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThanOrEqual(70);
  });

  test('無効なランドマークデータを拒否する', () => {
    const invalidLandmarks = [{ x: NaN, y: 0.5, z: 0.0 }];

    expect(validateLandmarks(invalidLandmarks)).toBe(false);
  });

  test('ランドマーク数不足を検出する', () => {
    const insufficientLandmarks = [{ x: 0.5, y: 0.5, z: 0.0 }]; // 21個必要だが1個のみ

    expect(validateLandmarks(insufficientLandmarks)).toBe(false);
  });
});
```

### データ検証テスト

```typescript
// tests/unit/data-validation.test.ts
import {
  validateMeasurementData,
  sanitizeAngleValue,
} from '@/lib/utils/validation';

describe('データ検証', () => {
  test('有効な測定データを承認する', () => {
    const validData = {
      angle: 45.5,
      hand: 'right' as const,
      stepId: 'palmar-flexion',
      timestamp: Date.now(),
    };

    expect(validateMeasurementData(validData)).toBe(true);
  });

  test('範囲外の角度を拒否する', () => {
    const invalidData = {
      angle: 150, // 90度を超過
      hand: 'right' as const,
      stepId: 'palmar-flexion',
      timestamp: Date.now(),
    };

    expect(validateMeasurementData(invalidData)).toBe(false);
  });

  test('角度値の正規化', () => {
    expect(sanitizeAngleValue(45.678)).toBe(46); // 四捨五入
    expect(sanitizeAngleValue(-5)).toBe(0); // 下限適用
    expect(sanitizeAngleValue(100)).toBe(90); // 上限適用
  });

  test('手の種類の検証', () => {
    const invalidHandData = {
      angle: 45,
      hand: 'invalid' as any,
      stepId: 'palmar-flexion',
      timestamp: Date.now(),
    };

    expect(validateMeasurementData(invalidHandData)).toBe(false);
  });
});
```

````

### React コンポーネントテスト

```typescript
// tests/unit/measurement-controls.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MeasurementControls } from '@/components/measurement/MeasurementControls';

describe('MeasurementControls', () => {
  test('測定開始ボタンが正しく表示される', () => {
    render(<MeasurementControls isCapturing={false} onStart={jest.fn()} />);

    expect(screen.getByText('測定開始')).toBeInTheDocument();
  });

  test('測定中は停止ボタンに変わる', () => {
    render(<MeasurementControls isCapturing={true} onStop={jest.fn()} />);

    expect(screen.getByText('測定停止')).toBeInTheDocument();
  });

  test('ボタンクリックで適切なコールバックが呼ばれる', () => {
    const mockOnStart = jest.fn();
    render(<MeasurementControls isCapturing={false} onStart={mockOnStart} />);

    fireEvent.click(screen.getByText('測定開始'));
    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });
});
````

## 統合テスト (Integration Tests)

### テストファイル構造

```
tests/integration/
├── test_mediapipe_hands.ts        # MediaPipe統合
├── test_angle_calculation.ts      # 角度計算統合
├── test_camera_workflow.ts        # カメラワークフロー
└── test_data_storage.ts          # データベース統合
```

### MediaPipe統合テスト

```typescript
// tests/integration/test_mediapipe_hands.ts
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { calculateWristAngles } from '@/lib/motion-capture/angle-calculator';

describe('MediaPipe Hands統合テスト', () => {
  test('手の検出とランドマーク取得', async () => {
    const { handsDetector, isLoaded } = useMediaPipeHands();

    // MediaPipe初期化待機
    await waitFor(() => expect(isLoaded).toBe(true));

    // テスト用画像データで検出実行
    const mockVideoElement = createMockVideoElement();
    const result = await handsDetector.detectHands(mockVideoElement);

    expect(result).toHaveProperty('multiHandLandmarks');
    expect(Array.isArray(result.multiHandLandmarks)).toBe(true);
  });

  test('ランドマークから角度計算までの統合フロー', async () => {
    const mockLandmarks = generateMockHandLandmarks();

    const wristAngles = calculateWristAngles(mockLandmarks);

    expect(wristAngles).toHaveProperty('flexion');
    expect(wristAngles).toHaveProperty('extension');
    expect(wristAngles).toHaveProperty('ulnarDeviation');
    expect(wristAngles).toHaveProperty('radialDeviation');

    // 各角度が有効範囲内か確認
    expect(wristAngles.flexion).toBeGreaterThanOrEqual(0);
    expect(wristAngles.flexion).toBeLessThanOrEqual(90);
  });
});
```

### データベース統合テスト

```typescript
// tests/integration/test_data_storage.ts
import { db } from '@/lib/database/measurement-db';

describe('データベース統合テスト', () => {
  beforeEach(async () => {
    // テスト前にデータベースをクリア
    await db.sessions.clear();
    await db.results.clear();
  });

  test('測定セッション作成から結果保存まで', async () => {
    // セッション開始
    const sessionId = await db.startSession('right');
    expect(sessionId).toBeTruthy();

    // 測定結果保存
    await db.saveMeasurementResult({
      sessionId,
      hand: 'right',
      stepId: 'palmar-flexion',
      stepName: '掌屈',
      angle: 45,
      targetAngle: 90,
      isCompleted: false,
    });

    // データ取得確認
    const results = await db.getSessionResults(sessionId);
    expect(results).toHaveLength(1);
    expect(results[0].angle).toBe(45);

    // セッション完了
    await db.completeSession(sessionId);

    const sessions = await db.getSessions();
    expect(sessions[0].isCompleted).toBe(true);
  });
});
```

## 契約テスト (Contract Tests)

### API仕様準拠テスト

```typescript
// tests/contract/test_measurements_get.ts
describe('GET /api/measurements 契約テスト', () => {
  test('レスポンス形式が仕様に準拠している', async () => {
    const response = await fetch('/api/measurements');
    const data = await response.json();

    // 基本構造確認
    expect(data).toHaveProperty('success');
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('pagination');

    // データ構造確認
    if (data.data.length > 0) {
      const measurement = data.data[0];
      expect(measurement).toHaveProperty('id');
      expect(measurement).toHaveProperty('userId');
      expect(measurement).toHaveProperty('measurementDate');
      expect(measurement).toHaveProperty('handUsed');
      expect(measurement).toHaveProperty('angleValue');
      expect(measurement).toHaveProperty('accuracy');
    }

    // ページネーション構造確認
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('offset');
  });
});
```

## E2Eテスト (End-to-End Tests)

### Playwright設定

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: 'http://localhost:3000',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### 測定ワークフローテスト

```typescript
// tests/e2e/measurement-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('測定ワークフロー', () => {
  test('完全な測定フローを実行できる', async ({ page }) => {
    // トップページアクセス
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('AI駆動手首・母指可動域');

    // 測定ページへ移動
    await page.click('text=測定');
    await expect(page).toHaveURL('/measurement');

    // カメラ許可（モック）
    await page.evaluate(() => {
      // モックのMediaDevices設定
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: () => Promise.resolve(new MediaStream()),
        },
      });
    });

    // 手の選択
    await page.click('[data-testid="hand-selector-right"]');
    await expect(page.locator('[data-testid="selected-hand"]')).toContainText(
      '右手'
    );

    // 測定開始
    await page.click('text=測定開始');
    await expect(
      page.locator('[data-testid="measurement-status"]')
    ).toContainText('測定中');

    // 角度表示確認（モックデータ）
    await expect(page.locator('[data-testid="angle-display"]')).toBeVisible();

    // 次のフェーズへ進行
    await page.click('text=次のフェーズ');
    await expect(page.locator('[data-testid="current-step"]')).toContainText(
      '背屈'
    );
  });
});
```

### カレンダー機能テスト

```typescript
// tests/e2e/calendar-functionality.spec.ts
test.describe('カレンダー機能', () => {
  test('測定記録をカレンダーで確認できる', async ({ page }) => {
    await page.goto('/calendar');

    // 今月のカレンダー表示確認
    await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();

    // 測定済み日付のマーク確認
    const measuredDays = page.locator('[data-testid="measured-day"]');
    await expect(measuredDays.first()).toBeVisible();

    // 日付クリックで詳細表示
    await measuredDays.first().click();
    await expect(
      page.locator('[data-testid="measurement-details"]')
    ).toBeVisible();

    // メモ入力・保存
    await page.fill('[data-testid="memo-input"]', 'テストメモ');
    await page.click('text=保存');
    await expect(page.locator('text=保存しました')).toBeVisible();
  });
});
```

## テスト実行・監視

### 継続的インテグレーション

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### カバレッジレポート

```json
{
  "collectCoverageFrom": [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    }
  }
}
```

## テストデータ管理

### モックデータ生成

```typescript
// tests/utils/mock-data.ts
export const generateMockHandLandmarks = (): Point3D[] => {
  return Array.from({ length: 21 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    z: Math.random() * 0.1,
  }));
};

export const createMockMeasurementSession = (): MeasurementSession => ({
  sessionId: `test-session-${Date.now()}`,
  startTime: Date.now(),
  hand: 'right',
  isCompleted: false,
  totalSteps: 4,
  completedSteps: 0,
});
```

### テスト環境分離

```typescript
// jest.setup.js
import 'fake-indexeddb/auto';

// MediaPipeのモック
global.MediaPipe = {
  Hands: jest.fn().mockImplementation(() => ({
    setOptions: jest.fn(),
    onResults: jest.fn(),
    send: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
  })),
};

// カメラAPIのモック
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue(new MediaStream()),
  },
});
```

## 品質保証

### テスト品質指標

| 指標             | 目標値  | 監視方法             |
| ---------------- | ------- | -------------------- |
| コードカバレッジ | 90%+    | Jest + Codecov       |
| テスト実行時間   | 5分以内 | GitHub Actions       |
| E2Eテスト成功率  | 95%+    | Playwright Dashboard |
| フレーク率       | 5%以下  | テスト結果分析       |

### 医療機器品質基準対応

- **IEC 62304 (医療機器ソフトウェア)**: 安全分類Bに対応
- **リスクベーステスト**: 角度計算精度を重点的にテスト
- **バリデーション**: 実際の理学療法士によるテスト実施
- **トレーサビリティ**: 要件から実装・テストまでの追跡可能性確保
