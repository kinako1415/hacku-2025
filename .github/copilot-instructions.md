# GitHub Copilot Instructions

## プロジェクト概要
AI駆動手首・母指可動域リハビリテーションアプリ - MediaPipe Hands/Poseを使用したカメラベース可動域測定システム

## 技術スタック
- **Frontend**: Next.js 14 (App Router), TypeScript, React 18
- **State Management**: Jotai (原子的状態管理)
- **Styling**: CSS Modules (module.scss)
- **AI/ML**: MediaPipe Hands, MediaPipe Pose (JavaScript)
- **Storage**: IndexedDB (Dexie.js), LocalStorage
- **Testing**: Jest, React Testing Library, Playwright
- **Build**: Next.js bundler, ESLint, Prettier

## プロジェクト構造
```
/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React コンポーネント
│   ├── lib/                    # ライブラリ・ユーティリティ
│   │   ├── mediapipe/         # MediaPipe統合
│   │   ├── motion-capture/    # 動作測定ライブラリ
│   │   ├── data-manager/      # データ管理ライブラリ
│   │   └── calendar-tracker/  # カレンダー記録ライブラリ
│   ├── hooks/                  # カスタムReact Hooks
│   ├── stores/                 # Jotai状態管理
│   ├── types/                  # TypeScript型定義
│   └── utils/                  # ヘルパー関数
├── tests/
│   ├── contract/              # API契約テスト
│   ├── integration/           # 統合テスト
│   └── unit/                  # ユニットテスト
└── docs/                      # ドキュメント
```

## コーディング規約

### TypeScript
- 厳密な型定義使用 (`strict: true`)
- `interface`よりも`type`を優先（Union types対応）
- 型アサーション(`as`)は最小限に
- Genericsの適切な活用

### React/Next.js
- 関数コンポーネント + Hooks パターン
- App Router使用（`page.tsx`, `layout.tsx`）
- Server Components/Client Componentsの適切な分離
- `'use client'`ディレクティブ必要時のみ使用

### 状態管理 (Jotai)
```typescript
// Atomの定義例
export const measurementStateAtom = atom<MeasurementState>({
  isCapturing: false,
  currentAngles: null,
  accuracy: 0
});

// Derived atomの活用
export const isReadyToMeasureAtom = atom((get) => 
  get(cameraStateAtom).isReady && get(mediaPipeStateAtom).isLoaded
);
```

### CSS Modules
- BEM記法風のクラス命名
- レスポンシブデザイン優先
- CSS変数活用

```scss
.measurementContainer {
  display: flex;
  flex-direction: column;
  
  &__camera {
    position: relative;
    width: 100%;
    max-width: 640px;
  }
  
  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
  }
}
```

## 重要な実装パターン

### MediaPipe統合
```typescript
// MediaPipe初期化パターン
import { Hands, Results } from '@mediapipe/hands';

const initializeMediaPipe = async (): Promise<Hands> => {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  
  return hands;
};
```

### 角度計算
```typescript
// 3点ベクトル角度計算パターン
const calculateAngle = (p1: Point, p2: Point, p3: Point): number => {
  const vec1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const vec2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = vec1.x * vec2.x + vec1.y * vec2.y;
  const mag1 = Math.sqrt(vec1.x ** 2 + vec1.y ** 2);
  const mag2 = Math.sqrt(vec2.x ** 2 + vec2.y ** 2);
  
  return Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
};
```

### データ永続化 (Dexie.js)
```typescript
import Dexie, { Table } from 'dexie';

class RehabDatabase extends Dexie {
  measurements!: Table<MotionMeasurement>;
  
  constructor() {
    super('RehabDatabase');
    this.version(1).stores({
      measurements: 'id, userId, measurementDate, handUsed'
    });
  }
}

export const db = new RehabDatabase();
```

### エラーハンドリング
- カメラアクセス失敗時の適切なフォールバック
- MediaPipe読み込み失敗時の再試行ロジック
- オフライン状態の検出と対応

### テスト戦略
- **Contract Tests**: API仕様準拠確認
- **Integration Tests**: MediaPipe + データ保存の統合
- **Unit Tests**: 角度計算、データ変換ロジック
- **E2E Tests**: ユーザーフロー全体

## 医療データ考慮事項
- 個人情報のローカル保存
- データ暗号化（IndexedDB内）
- 正確性とプライバシーのバランス
- 医療機器認証要件への準備

## パフォーマンス最適化
- MediaPipeワーカー実行
- Canvas描画最適化
- 状態更新の最小化
- メモ化の適切な活用

## 最近の変更
- Version 1.0.0: 初期実装計画
- カレンダー機能統合
- MediaPipe統合設計完了
