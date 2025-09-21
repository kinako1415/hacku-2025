# 技術仕様書

## 技術スタック

### フロントエンド

| カテゴリ         | 技術         | バージョン | 用途                               |
| ---------------- | ------------ | ---------- | ---------------------------------- |
| Framework        | Next.js      | 14.2.32    | React フレームワーク（App Router） |
| Language         | TypeScript   | 5.4.0      | 型安全な JavaScript                |
| UI Library       | React        | 18.2.0     | ユーザーインターフェース           |
| CSS              | SASS         | 1.77.0     | スタイリング（module.scss）        |
| State Management | Jotai        | 2.14.0     | 原子的状態管理                     |
| Icons            | Lucide React | 0.544.0    | アイコンライブラリ                 |

### AI・機械学習

| 技術                   | バージョン     | 用途                       |
| ---------------------- | -------------- | -------------------------- |
| MediaPipe Hands        | 0.4.1675469240 | 手の検出・ランドマーク取得 |
| MediaPipe Pose         | 0.5.1646424915 | 姿勢検出                   |
| MediaPipe Camera Utils | 0.3.1675466862 | カメラユーティリティ       |

### データ・ストレージ

| 技術     | バージョン | 用途          |
| -------- | ---------- | ------------- |
| Dexie.js | 3.2.4      | IndexedDB ORM |
| Day.js   | 1.11.18    | 日付管理      |
| Recharts | 3.2.1      | チャート表示  |

### 開発・テスト

| 技術                  | バージョン | 用途                      |
| --------------------- | ---------- | ------------------------- |
| Jest                  | 29.7.0     | ユニットテスト            |
| React Testing Library | 16.3.0     | Reactコンポーネントテスト |
| Playwright            | 1.44.0     | E2Eテスト                 |
| ESLint                | 8.57.0     | コード品質                |
| Prettier              | 3.2.5      | コードフォーマット        |

## アーキテクチャ設計

### システム構成図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Camera   │───▶│   MediaPipe     │───▶│  Angle Calculator│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│   React UI      │◀───│  Jotai States   │◀────────────┘
└─────────────────┘    └─────────────────┘
         │                       │
         │               ┌─────────────────┐
         └──────────────▶│   IndexedDB     │
                         └─────────────────┘
```

### フォルダ構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── calendar/          # カレンダー機能
│   ├── measurement/       # 測定機能
│   ├── progress/          # 進捗確認機能
│   └── setup/             # セットアップ
├── components/            # Reactコンポーネント
│   ├── calendar/
│   ├── camera/
│   ├── common/
│   ├── layout/
│   ├── measurement/
│   └── progress/
├── hooks/                 # カスタムHooks
├── lib/                   # ライブラリ・ユーティリティ
│   ├── data-manager/      # データ管理
│   ├── database/          # データベース（IndexedDB）
│   ├── integrations/      # 外部統合
│   ├── mediapipe/         # MediaPipe統合
│   ├── motion-capture/    # 動作測定
│   ├── pwa/               # PWA機能
│   └── utils/             # ユーティリティ
├── stores/                # 状態管理（Jotai）
└── styles/                # グローバルスタイル
```

## MediaPipe統合詳細

### 設定パラメータ

```typescript
const MEDIAPIPE_CONFIG = {
  locateFile: (file: string) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  options: {
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.3,
    selfieMode: true,
  },
};
```

### ランドマーク構造

MediaPipe Handsは21個のランドマークを提供：

```typescript
export const HAND_LANDMARKS = {
  WRIST: 0, // 手首
  THUMB_CMC: 1, // 親指の手根中手関節
  THUMB_MCP: 2, // 親指の中手指節関節
  THUMB_IP: 3, // 親指の指節間関節
  THUMB_TIP: 4, // 親指の先端
  INDEX_FINGER_MCP: 5, // 人差し指の中手指節関節
  // ... 他16個のランドマーク
} as const;
```

### 座標系変換

```typescript
// MediaPipeの正規化座標（0-1）をピクセル座標に変換
const pixelX = landmark.x * canvas.width;
const pixelY = landmark.y * canvas.height;
const pixelZ = landmark.z * depthScale;
```

## 角度計算アルゴリズム

### 数学的基礎

角度計算は3Dベクトルの内積を使用：

```typescript
function calculateAngle(
  point1: Point3D,
  center: Point3D,
  point2: Point3D
): number {
  // ベクトル計算
  const vector1 = {
    x: point1.x - center.x,
    y: point1.y - center.y,
    z: point1.z - center.z,
  };

  const vector2 = {
    x: point2.x - center.x,
    y: point2.y - center.y,
    z: point2.z - center.z,
  };

  // 内積計算
  const dotProduct =
    vector1.x * vector2.x + vector1.y * vector2.y + vector1.z * vector2.z;

  // ベクトルの大きさ
  const magnitude1 = Math.sqrt(
    vector1.x ** 2 + vector1.y ** 2 + vector1.z ** 2
  );
  const magnitude2 = Math.sqrt(
    vector2.x ** 2 + vector2.y ** 2 + vector2.z ** 2
  );

  // 角度計算（ラジアンから度に変換）
  const cosAngle = dotProduct / (magnitude1 * magnitude2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}
```

### 手首角度計算詳細

#### 掌屈・背屈 (Flexion/Extension)

```typescript
export function calculateFlexionExtension(landmarks: Point3D[]): number {
  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const middleFingerMcp = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];

  // 手首から中指付け根へのベクトル
  const wristToMiddle = {
    x: middleFingerMcp.x - wrist.x,
    y: middleFingerMcp.y - wrist.y,
    z: middleFingerMcp.z - wrist.z,
  };

  // Y軸（垂直）との角度を計算
  const length = Math.sqrt(
    wristToMiddle.x ** 2 + wristToMiddle.y ** 2 + wristToMiddle.z ** 2
  );
  const angle = Math.asin(Math.abs(wristToMiddle.y) / length) * (180 / Math.PI);

  return Math.min(Math.max(angle, 0), 90);
}
```

#### 尺屈・橈屈 (Ulnar/Radial Deviation)

```typescript
export function calculateRadialUlnarDeviation(landmarks: Point3D[]): number {
  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const thumbCmc = landmarks[HAND_LANDMARKS.THUMB_CMC];
  const pinkyCmc = landmarks[HAND_LANDMARKS.PINKY_MCP];

  // 手首から親指・小指への方向ベクトル
  const wristToThumb = {
    /* ベクトル計算 */
  };
  const wristToPinky = {
    /* ベクトル計算 */
  };

  // X軸（水平）方向の角度を計算
  const thumbAngle =
    Math.asin(Math.abs(wristToThumb.x) / thumbLength) * (180 / Math.PI);
  const pinkyAngle =
    Math.asin(Math.abs(wristToPinky.x) / pinkyLength) * (180 / Math.PI);

  // より大きい角度を採用
  return Math.min(Math.max(Math.max(thumbAngle, pinkyAngle), 0), 45);
}
```

## データベース設計

### IndexedDB構造（Dexie.js）

```typescript
class MeasurementDatabase extends Dexie {
  sessions!: Table<MeasurementSession>;
  results!: Table<MeasurementResult>;

  constructor() {
    super('MeasurementDatabase');

    this.version(1).stores({
      sessions: '++id, sessionId, startTime, endTime, hand, isCompleted',
      results:
        '++id, sessionId, timestamp, hand, stepId, stepName, angle, isCompleted',
    });
  }
}
```

### データモデル

#### MeasurementSession

```typescript
interface MeasurementSession {
  id?: number;
  sessionId: string; // ユニークセッションID
  startTime: number; // 開始時刻（Unix timestamp）
  endTime?: number; // 終了時刻
  hand: 'left' | 'right'; // 測定した手
  isCompleted: boolean; // 完了フラグ
  totalSteps: number; // 総ステップ数（4固定）
  completedSteps: number; // 完了ステップ数
}
```

#### MeasurementResult

```typescript
interface MeasurementResult {
  id?: number;
  sessionId: string; // セッションID（外部キー）
  timestamp: number; // 測定時刻
  hand: 'left' | 'right'; // 測定した手
  stepId: string; // ステップID
  stepName: string; // ステップ名（日本語）
  angle: number; // 測定角度
  targetAngle: number; // 目標角度
  isCompleted: boolean; // 完了フラグ
  landmarks?: Array<{ x: number; y: number; z: number }>; // ランドマークデータ
}
```

## パフォーマンス最適化

### フレームレート制御

```typescript
const detectionInterval = 1000 / 30; // 30 FPS

const detectFrame = async () => {
  const now = performance.now();

  if (now - lastDetectionTime >= detectionInterval) {
    await handsRef.current.send({ image: videoRef.current });
    lastDetectionTime = now;
  }

  animationFrameRef.current = requestAnimationFrame(detectFrame);
};
```

### メモリ管理

```typescript
// useEffectでのクリーンアップ
useEffect(() => {
  return () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };
}, []);
```

### 座標同期最適化

```typescript
// ビデオとキャンバスのサイズ同期
const drawLandmarks = useCallback((results: any) => {
  // キャンバスサイズをビデオ表示サイズに合わせる
  canvas.width = video.offsetWidth;
  canvas.height = video.offsetHeight;

  // スタイルサイズも同期
  canvas.style.width = `${video.offsetWidth}px`;
  canvas.style.height = `${video.offsetHeight}px`;
}, []);
```

## セキュリティ・プライバシー

### データ保護

- **ローカルストレージ**: 測定データはデバイス内のIndexedDBに保存
- **カメラアクセス**: ユーザー明示的許可制
- **データ暗号化**: 将来的にWebCrypto API使用予定

### GDPR準拠設計

```typescript
// データ削除機能
async deleteAllUserData(userId: string): Promise<void> {
  await db.sessions.where('userId').equals(userId).delete();
  await db.results.where('userId').equals(userId).delete();
}

// データエクスポート機能
async exportUserData(userId: string): Promise<UserDataExport> {
  // 実装予定
}
```

## エラーハンドリング

### MediaPipe エラー

```typescript
try {
  const hands = new Hands(MEDIAPIPE_CONFIG);
  // 初期化処理
} catch (error) {
  console.error('MediaPipe初期化エラー:', error);
  setError('AI手首検出の初期化に失敗しました');
}
```

### カメラアクセスエラー

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  setCameraState({ stream, isReady: true, error: null });
} catch (error) {
  setCameraState({
    stream: null,
    isReady: false,
    error: 'カメラへのアクセスを許可してください',
  });
}
```

## 設定ファイル

### TypeScript設定 (tsconfig.json)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Next.js設定 (next.config.js)

```javascript
const nextConfig = {
  experimental: {
    appDir: true,
  },
  sassOptions: {
    includePaths: ['./src'],
  },
  webpack: (config) => {
    // MediaPipe用の設定
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};
```

## 今後の技術的改善計画

### パフォーマンス向上

- WebAssembly による MediaPipe 最適化
- Web Workers での並列処理
- Service Worker によるキャッシュ戦略

### 精度向上

- 複数フレーム平均による角度安定化
- 機械学習による個人差補正
- カメラキャリブレーション機能

### 機能拡張

- 他関節への測定拡張（肘、肩、膝等）
- リアルタイム姿勢フィードバック
- AI による動作品質評価
