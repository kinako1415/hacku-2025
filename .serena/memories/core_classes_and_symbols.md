# コアクラス・シンボル分析

## 主要クラス構造

### HandDetector (src/lib/mediapipe/hand-detector.ts)
- **役割**: MediaPipe Handsを使用した手の検出とランドマーク取得
- **主要メソッド**:
  - `initialize()`: MediaPipeの初期化
  - `detectHands()`: 手の検出実行
  - `processResults()`: 検出結果の処理

### MotionMeasurement (src/lib/data-manager/types.ts)
- **役割**: 測定データのモデル定義
- **プロパティ**:
  - `id`: 測定ID
  - `userId`: ユーザーID
  - `measurementDate`: 測定日時
  - `handUsed`: 使用した手（左右）
  - `angles`: 角度データ
  - `accuracy`: 測定精度

### AngleCalculator (src/lib/mediapipe/angle-calculator.ts)
- **役割**: 3点ベクトルからの角度計算
- **主要メソッド**:
  - `calculateAngle()`: 3点間の角度計算
  - `calculateWristAngles()`: 手首角度の計算
  - `calculateThumbAngles()`: 母指角度の計算

## Jotai Atoms (状態管理)

### measurementStateAtom
```typescript
type MeasurementState = {
  isCapturing: boolean;
  currentAngles: AngleData | null;
  accuracy: number;
  session: MeasurementSession | null;
}
```

### cameraStateAtom
```typescript
type CameraState = {
  isReady: boolean;
  stream: MediaStream | null;
  error: string | null;
  permissions: boolean;
}
```

## React Components

### MeasurementControls
- **役割**: 測定の開始・停止・設定制御
- **Props**: `onStart`, `onStop`, `isCapturing`

### AngleOverlay
- **役割**: カメラ映像上への角度情報オーバーレイ表示
- **Props**: `angles`, `landmarks`, `canvasRef`

### ProgressChart
- **役割**: 測定データの時系列グラフ表示
- **Props**: `data`, `timeRange`, `measurementType`

## Custom Hooks

### useMeasurementService
- **役割**: 測定機能の統合管理
- **戻り値**: `startMeasurement`, `stopMeasurement`, `currentResults`

### useMediaPipeHands
- **役割**: MediaPipe Handsの初期化と管理
- **戻り値**: `detector`, `isLoaded`, `error`

## データ型定義

### AngleData
```typescript
type AngleData = {
  wrist: WristAngles;
  thumb: ThumbAngles;
  timestamp: number;
  confidence: number;
}
```

### WristAngles
```typescript
type WristAngles = {
  palmarFlexion: number;   // 掌屈
  dorsalFlexion: number;   // 背屈
  ulnarDeviation: number;  // 尺屈
  radialDeviation: number; // 橈屈
}
```

### ThumbAngles
```typescript
type ThumbAngles = {
  flexion: number;    // 屈曲
  extension: number;  // 伸展
  adduction: number;  // 内転
  abduction: number;  // 外転
}
```

## ユーティリティ関数

### formatUtils
- `formatAngle()`: 角度の表示形式変換
- `formatDate()`: 日付の表示形式変換
- `formatAccuracy()`: 精度の表示形式変換

### mathUtils
- `degToRad()`: 度からラジアンへ変換
- `radToDeg()`: ラジアンから度へ変換
- `calculateDistance()`: 2点間距離計算
- `normalizeAngle()`: 角度の正規化